import httpx
import logging
from typing import Optional
from io import BytesIO
from PIL import Image
from settings import settings

logger = logging.getLogger(__name__)


class OCRServiceClient:
    """Client for external OCR service that detects license plates"""

    def __init__(self):
        self.base_url = settings.OCR_SERVICE_BASE_URL.rstrip('/')
        self.timeout = 30.0
        self.max_dimension = 2048
        self.max_file_size_mb = 10

    def _preprocess_image(self, image_bytes: bytes) -> bytes:
        """
        Resize and compress image if needed to fit OCR service requirements.

        Args:
            image_bytes: Original image bytes

        Returns:
            Processed image bytes (JPEG format)
        """
        try:
            image = Image.open(BytesIO(image_bytes))

            original_size = len(image_bytes) / (1024 * 1024)
            logger.info(f"Original image size: {original_size:.2f}MB, dimensions: {image.size}")

            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')

            width, height = image.size
            if width > self.max_dimension or height > self.max_dimension:
                ratio = min(self.max_dimension / width, self.max_dimension / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(f"Resized image to: {image.size}")

            output = BytesIO()
            quality = 85
            image.save(output, format='JPEG', quality=quality, optimize=True)
            processed_bytes = output.getvalue()

            processed_size = len(processed_bytes) / (1024 * 1024)
            while processed_size > self.max_file_size_mb and quality > 50:
                output = BytesIO()
                quality -= 10
                image.save(output, format='JPEG', quality=quality, optimize=True)
                processed_bytes = output.getvalue()
                processed_size = len(processed_bytes) / (1024 * 1024)

            logger.info(f"Processed image size: {processed_size:.2f}MB, quality: {quality}")
            return processed_bytes

        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return image_bytes

    async def detect_license_plate(self, image_url: str) -> dict:
        """
        Call external OCR service /recognize_crnn endpoint

        Args:
            image_url: URL or file path to image

        Returns:
            dict with OCR results:
            {
                "status": "OK" | "ERROR",
                "code": 0,
                "message": "Success",
                "plate": "XX0000XX",
                "confidence": 0.89,
                "bbox": {
                    "x1": 245,
                    "y1": 180,
                    "x2": 580,
                    "y2": 280
                }
            }
        """
        try:
            with open(image_url, 'rb') as f:
                file_bytes = f.read()

            processed_bytes = self._preprocess_image(file_bytes)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {"image": (image_url.split('/')[-1], processed_bytes, "image/jpeg")}
                response = await client.post(
                    f"{self.base_url}/recognize_crnn",
                    files=files
                )
                response.raise_for_status()
                result = response.json()

                logger.info(f"OCR service response: status={result.get('status')}, plate={result.get('plate')}, confidence={result.get('confidence')}")

                return result
        except httpx.HTTPError as e:
            logger.error(f"OCR service HTTP error: {e}")
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
        Call external OCR service with file bytes using /recognize_crnn endpoint

        Args:
            file_bytes: Image file bytes
            filename: Original filename

        Returns:
            dict with OCR results:
            {
                "status": "OK" | "ERROR",
                "code": 0,
                "message": "Success",
                "plate": "XX0000XX",
                "confidence": 0.89,
                "bbox": {
                    "x1": 245,
                    "y1": 180,
                    "x2": 580,
                    "y2": 280
                }
            }
        """
        try:
            processed_bytes = self._preprocess_image(file_bytes)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {"image": (filename, processed_bytes, "image/jpeg")}
                response = await client.post(
                    f"{self.base_url}/recognize_crnn",
                    files=files
                )
                response.raise_for_status()
                result = response.json()

                logger.info(f"OCR service response: status={result.get('status')}, plate={result.get('plate')}, confidence={result.get('confidence')}")

                return result
        except httpx.HTTPError as e:
            logger.error(f"OCR service HTTP error: {e}")
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
