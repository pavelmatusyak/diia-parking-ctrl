from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from typing import Optional, Dict
import logging
import re
import base64
from openai import AsyncOpenAI

from settings import settings

logger = logging.getLogger(__name__)


class OCRInteractor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def analyze_image(self, file: UploadFile) -> Dict:
        file_data = await file.read()
        return await self.analyze_image_data(file_data)

    async def analyze_image_data(self, image_data: bytes) -> Optional[Dict]:
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None

        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')

            prompt = """
You are an expert license plate recognition system for Ukrainian vehicle plates.

Analyze this image and extract the license plate number. Ukrainian license plates follow these formats:
- AA 1234 BB (letters-numbers-letters, 8 characters)
- 1234 BB (numbers-letters, 6 characters)
- AA 1234 (letters-numbers, 6 characters)

Where:
- Letters are Ukrainian Cyrillic: А, В, Е, І, К, М, Н, О, Р, С, Т, У, Х (similar to Latin)
- Numbers are 0-9

Instructions:
1. Look for the license plate on the vehicle
2. Extract the exact characters you see
3. Return ONLY the license plate number in the format you see it
4. If you cannot confidently identify a license plate, return "NOT_FOUND"
5. Be very precise with the characters

Return your answer as just the license plate number, nothing else.
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=50,
                temperature=0.1,
            )

            result_text = response.choices[0].message.content.strip()

            if result_text == "NOT_FOUND" or not result_text:
                logger.warning("No license plate detected by OpenAI")
                return None

            license_plate = self._clean_and_validate_plate(result_text)

            if license_plate:
                confidence = 0.95
                logger.info(f"Detected license plate: {license_plate} with confidence {confidence:.2f}")
                return {
                    "license_plate": license_plate,
                    "confidence": confidence,
                    "raw_results": {"openai_response": result_text},
                }
            else:
                logger.warning(f"Invalid license plate format detected: {result_text}")
                return None

        except Exception as e:
            logger.error(f"Error during OCR analysis: {e}", exc_info=True)
            return None

    def _clean_and_validate_plate(self, plate: str) -> Optional[str]:
        plate = plate.upper().strip()
        plate = re.sub(r'[^А-ЯІЇЄҐA-Z0-9\s]', '', plate)
        plate = ' '.join(plate.split())

        ukrainian_plate_patterns = [
            r'^[А-ЯІЇЄҐA-Z]{2}\s?\d{4}\s?[А-ЯІЇЄҐA-Z]{2}$',
            r'^\d{4}\s?[А-ЯІЇЄҐA-Z]{2}$',
            r'^[А-ЯІЇЄҐA-Z]{2}\s?\d{4}$',
        ]

        plate_no_space = plate.replace(" ", "")
        for pattern in ukrainian_plate_patterns:
            if re.match(pattern.replace(r"\s?", ""), plate_no_space):
                return self._format_license_plate(plate_no_space)

        return None

    def _format_license_plate(self, plate: str) -> str:
        plate = plate.upper().replace(" ", "")

        if len(plate) == 8:
            return f"{plate[:2]} {plate[2:6]} {plate[6:]}"
        elif len(plate) == 6:
            if plate[:2].isalpha():
                return f"{plate[:2]} {plate[2:]}"
            else:
                return f"{plate[:4]} {plate[4:]}"
        return plate
