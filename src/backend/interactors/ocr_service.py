import httpx
import logging
from typing import Optional
from settings import settings

logger = logging.getLogger(__name__)


class OCRServiceClient:
    """Client for external OCR service that detects license plates"""

    def __init__(self):
        self.base_url = getattr(settings, 'OCR_SERVICE_URL', None) or "http://localhost:8001"
        self.timeout = 30.0

    async def detect_license_plate(self, image_url: str) -> dict:
        """
        Call external OCR service /detect endpoint

        Args:
            image_url: URL or file path to image

        Returns:
            dict with OCR results:
            {
                "status": "OK" | "ERROR",
                "code": 0,
                "plate": "XX0000XX",
                "confidence": 0.89,
                "color": "red",
                "colorId": 4,
                "make": "bmw",
                "model": "x5",
                "violated": [2,3]
            }
        """
        # For development/testing, use mock
        if settings.ENVIRONMENT == "development":
            logger.info(f"Using mock OCR detection for development")
            return self._mock_detection()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # TODO: Update this when real OCR service is available
                # For now, call the mock endpoint or return mock data
                response = await client.post(
                    f"{self.base_url}/detect",
                    files={"file": image_url}
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"OCR service error: {e}")
            return {
                "status": "ERROR",
                "code": 1,
                "message": "Не вдалося розпізнати номерний знак. Спробуйте зробити чіткіше фото"
            }
        except Exception as e:
            logger.error(f"Unexpected error calling OCR service: {e}")
            return {
                "status": "ERROR",
                "code": 2,
                "message": "Помилка обробки зображення"
            }

    def _mock_detection(self) -> dict:
        """Mock OCR response for development/testing"""
        return {
            "status": "OK",
            "code": 0,
            "plate": "AA1234BB",
            "confidence": 0.92,
            "color": "white",
            "colorId": 1,
            "make": "toyota",
            "model": "camry",
            "violated": []
        }

    async def detect_from_file(self, file_bytes: bytes, filename: str) -> dict:
        """
        Call external OCR service with file bytes

        Args:
            file_bytes: Image file bytes
            filename: Original filename

        Returns:
            dict with OCR results
        """
        # For development/testing, use mock
        if settings.ENVIRONMENT == "development":
            logger.info(f"Using mock OCR detection for development")
            return self._mock_detection()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {"file": (filename, file_bytes)}
                response = await client.post(
                    f"{self.base_url}/detect",
                    files=files
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"OCR service error: {e}")
            return {
                "status": "ERROR",
                "code": 1,
                "message": "Не вдалося розпізнати номерний знак. Спробуйте зробити чіткіше фото"
            }
        except Exception as e:
            logger.error(f"Unexpected error calling OCR service: {e}")
            return {
                "status": "ERROR",
                "code": 2,
                "message": "Помилка обробки зображення"
            }
