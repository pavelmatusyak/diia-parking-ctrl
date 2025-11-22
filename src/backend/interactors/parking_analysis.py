import asyncio
import base64
import httpx
import json
import logging
from typing import Optional
from pydantic import BaseModel

from settings import settings

logger = logging.getLogger(__name__)
from foundation.schemas import (
    AnalyzeParkingResponse,
    ViolationReason,
    CrossCheckAnalysis,
    ProbabilityBreakdown,
)


class NearbyObject(BaseModel):
    kind: str
    distanceMeters: float
    osmId: int


class GeoCheckResponse(BaseModel):
    isViolation: bool
    reasons: list
    nearbyObjects: list[NearbyObject]


ANALYSIS_PROMPT = """Ти — інспектор з паркування та експерт з Правил дорожнього руху України (ПДР),
а також модель, здатна аналізувати:
1) формалізовані дані rule-engine (OSM),
2) статичну карту з червоною точкою.

## 1. Джерела даних:

(1) JSON від rule‑engine:
— це формальний аналіз відстаней до об'єктів з OpenStreetMap;
— може бути неточним або застарілим;
— rule‑engine не бачить карту.

(2) Статична карта:
— червона точка — це координати GPS;
— GPS має похибку 1–15 м; використовуйте точку лише як просторову підказку.

## 2. Завдання:

1. Вказати, чи є порушення ПДР на основі карти та даних rule-engine.
2. Узгодити дані з карти та JSON, підкресливши всі розбіжності.
3. Оцінити **ймовірність (0–1.0)** для КОЖНОГО типу порушення (навіть якщо rule‑engine його не виявив).
4. Виявити додаткові порушення, яких немає в OSM, але видно на карті.
5. Пояснити розбіжності між джерелами.
6. Повернути відповідь у строго визначеному JSON.

## 3. Перелік порушень для оцінки (усі як число від 0.0 до 1.0):

1. 5.9(а) — залізничний переїзд
2. 15.9(б) — трамвайні колії
3. 15.9(в) — міст / естакада / шляхопровід / тунель
4. 15.9(г) — пішохідний перехід або зона ближче 10 м
5. 15.9(ґ) — ближче 10 м до перехрестя
6. 15.9(д) — звуження проїжджої частини <3 м
7. 15.9(е) — ближче 30 м до зупинки транспорту
8. 15.9(и) — ближче 10 м до виїзду з прилеглої території
9. Тротуар
10. Пішохідна зона
11. Велодоріжка / велосмуга
12. Закриття світлофора або дорожніх знаків
13. Блокування проїзду іншими ТЗ
14. parking_prohibited_zone   (знак 3.35)
15. parking_time_limited_zone (якщо в правилах діє обмеження на стоянку, але зупинка дозволена)

## 4. Тлумачення probability:

— **0–0.1**: фактично немає ознак порушення;
— **0.1–0.3**: слабкі ознаки, низька впевненість;
— **0.3–0.6**: можлива ймовірність, потрібна додаткова перевірка;
— **0.6–0.9**: сильні ознаки, скоріше за все є порушення;
— **0.9–1.0**: дуже високі докази, практично підтверджено порушення.

## 5. Дані від rule‑engine:

{rule_engine_data}

Аналізуй статичну карту (червона точка — GPS користувача з похибкою) та фото автомобіля.
Поверни відповідь *лише* у JSON з такою структурою (без додаткового тексту):

{{
  "isViolation": true або false,
  "overallViolationConfidence": число від 0.0 до 1.0,
  "likelyArticles": ["список статей ПДР, які найімовірніше порушені"],
  "probabilityBreakdown": {{
    "railway_crossing": число 0.0-1.0,
    "tram_track": число 0.0-1.0,
    "bridge_or_tunnel": число 0.0-1.0,
    "pedestrian_crossing_10m": число 0.0-1.0,
    "intersection_10m": число 0.0-1.0,
    "narrowing_less_than_3m": число 0.0-1.0,
    "bus_stop_30m": число 0.0-1.0,
    "driveway_exit_10m": число 0.0-1.0,
    "sidewalk": число 0.0-1.0,
    "pedestrian_zone": число 0.0-1.0,
    "cycleway": число 0.0-1.0,
    "blocking_traffic_signal": число 0.0-1.0,
    "blocking_roadway": число 0.0-1.0,
    "parking_prohibited_zone": число 0.0-1.0,
    "parking_time_limited_zone": число 0.0-1.0
  }},
  "reasons": [
    {{
      "source": "rule_engine" або "map_analysis",
      "detail": "детальний опис"
    }}
  ],
  "crossChecks": {{
    "map_vs_photo": "не застосовується (немає фото)",
    "map_vs_rule_engine": "порівняння карти та OSM даних",
    "photo_vs_rule_engine": "не застосовується (немає фото)"
  }},
  "finalHumanReadableConclusion": "висновок українською мовою"
}}

ВАЖЛИВО:
— Не вигадуй об'єктів, яких немає на карті.
— Карта та OSM мають рівну вагу; якщо вони суперечать — зауваж це.
— Якщо OSM застарілий або неточний — зауваж це.
— Завжди оцінюй усі 13 пунктів у probabilityBreakdown, навіть якщо ймовірність = 0.0.
— Поверни *тільки* JSON, без жодного додаткового тексту."""


class ParkingAnalysisInteractor:
    def __init__(self):
        self.geo_service_url = settings.GEO_SERVICE_URL
        self.openai_api_key = settings.OPENAI_API_KEY
        self.openai_api_base = settings.OPENAI_API_BASE

    async def _fetch_geo_check(
        self, client: httpx.AsyncClient, lat: float, lon: float
    ) -> GeoCheckResponse:
        url = f"{self.geo_service_url}/api/check"
        params = {"lat": lat, "lon": lon}
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return GeoCheckResponse(**data)

    async def _fetch_map_image(
        self, client: httpx.AsyncClient, lat: float, lon: float, zoom: int, image_size: int
    ) -> bytes:
        url = f"{self.geo_service_url}/api/map"
        params = {"lat": lat, "lon": lon, "zoom": zoom, "imageSize": image_size}
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.content

    async def _call_openai_vision(
        self,
        rule_engine_data: dict,
        map_image_base64: str,
    ) -> AnalyzeParkingResponse:
        prompt = ANALYSIS_PROMPT.format(
            rule_engine_data=json.dumps(rule_engine_data, indent=2, ensure_ascii=False)
        )

        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "gpt-4.1",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{map_image_base64}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
            "max_tokens": 2000,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"Calling OpenAI API with model: {payload['model']}")
            response = await client.post(
                f"{self.openai_api_base}/chat/completions",
                headers=headers,
                json=payload,
            )

            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"OpenAI API error: {error_detail}")
                raise Exception(f"OpenAI API error (status {response.status_code}): {error_detail}")

            result = response.json()
            logger.info(f"OpenAI response received: {json.dumps(result, indent=2)}")

        if not result.get("choices") or len(result["choices"]) == 0:
            raise Exception(f"No choices in OpenAI response: {result}")

        message = result["choices"][0].get("message", {})
        content = message.get("content")

        if not content:
            raise Exception(f"No content in OpenAI message: {message}")

        logger.info(f"OpenAI content: {content[:500]}...")
        parsed_response = json.loads(content)

        return AnalyzeParkingResponse(**parsed_response)

    async def analyze_parking(
        self,
        latitude: float,
        longitude: float,
        zoom: int = 17,
        image_size: int = 512,
    ) -> AnalyzeParkingResponse:
        async with httpx.AsyncClient(timeout=30.0) as client:
            geo_check_task = self._fetch_geo_check(client, latitude, longitude)
            map_image_task = self._fetch_map_image(
                client, latitude, longitude, zoom, image_size
            )

            geo_check_response, map_image_bytes = await asyncio.gather(
                geo_check_task, map_image_task
            )

        map_image_base64 = base64.b64encode(map_image_bytes).decode("utf-8")

        rule_engine_data = geo_check_response.model_dump()

        analysis_result = await self._call_openai_vision(
            rule_engine_data=rule_engine_data,
            map_image_base64=map_image_base64,
        )

        return analysis_result
