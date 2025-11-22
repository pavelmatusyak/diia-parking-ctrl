import base64
import httpx
import json
import logging
from pathlib import Path
from typing import Optional
from PIL import Image
import io

from settings import settings

logger = logging.getLogger(__name__)


def load_vehicle_analysis_prompt() -> str:
    """Load the vehicle analysis prompt from file."""
    return """
    You are an expert vehicle inspector analyzing parking violation photos.

Your task is to analyze this image and determine TWO specific things:

1. **Headlights Status**: Are the vehicle's headlights turned ON?
   - Look for illuminated headlights (front lights)
   - Consider both daytime running lights and full headlights
   - Even dim or partial illumination counts as "on"

2. **Driver Presence**: Is there a driver (person) visible inside the vehicle?
   - Look for a person in the driver's seat
   - Check through windows, windshield
   - Even partial visibility of a person counts as "present"

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "headlights_on": true or false,
  "driver_present": true or false,
  "confidence": "high" or "medium" or "low"
}

Guidelines:
- If you cannot see the vehicle clearly, use "low" confidence
- If the image is blurry or dark, make your best guess but mark confidence as "low"
- If you can clearly see the relevant parts of the vehicle, use "high" confidence
- If partially visible or some uncertainty, use "medium" confidence
- Be conservative: if unsure about headlights being on, default to false
- Be conservative: if unsure about driver presence, default to false

Respond ONLY with the JSON object. Do not include any other text, explanation, or markdown formatting.
"""


class VehicleAnalysisInteractor:
    def __init__(self):
        self.openai_api_key = settings.OPENAI_API_KEY
        self.openai_api_base = settings.OPENAI_API_BASE
        self.max_image_size = 1024  # Max width/height in pixels
        self.jpeg_quality = 85  # JPEG compression quality

    def _compress_image(self, image_data: bytes) -> tuple[bytes, str]:
        """
        Compress and resize image to reduce payload size.

        Returns:
            Tuple of (compressed_image_bytes, format)
        """
        try:
            # Open image
            img = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary (for JPEG compatibility)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode in ('RGBA', 'LA'):
                    background.paste(img, mask=img.split()[-1])  # Use alpha channel as mask
                    img = background
                else:
                    img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize if too large
            original_size = img.size
            if max(img.size) > self.max_image_size:
                # Calculate new size maintaining aspect ratio
                ratio = self.max_image_size / max(img.size)
                new_size = tuple(int(dim * ratio) for dim in img.size)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized image from {original_size} to {new_size}")

            # Compress to JPEG
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=self.jpeg_quality, optimize=True)
            compressed_data = output.getvalue()

            # Log compression stats
            original_size_kb = len(image_data) / 1024
            compressed_size_kb = len(compressed_data) / 1024
            compression_ratio = (1 - compressed_size_kb / original_size_kb) * 100

            logger.info(
                f"Image compressed: {original_size_kb:.1f}KB -> {compressed_size_kb:.1f}KB "
                f"({compression_ratio:.1f}% reduction)"
            )

            return compressed_data, "jpeg"

        except Exception as e:
            logger.warning(f"Image compression failed, using original: {e}")
            # Return original if compression fails
            return image_data, "jpeg"

    async def analyze_vehicle(
            self,
            image_data: bytes,
            filename: Optional[str] = None,
    ) -> dict:
        """
        Analyze vehicle image to detect headlights and driver presence.

        Args:
            image_data: Raw image bytes
            filename: Optional filename for logging

        Returns:
            dict with keys: headlights_on, driver_present, confidence, raw_response
        """
        # Load prompt
        prompt = load_vehicle_analysis_prompt()

        # Compress image to reduce payload size
        compressed_data, image_format = self._compress_image(image_data)

        # Convert image to base64
        image_base64 = base64.b64encode(compressed_data).decode("utf-8")

        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "gpt-4.1-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/{image_format};base64,{image_base64}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 200,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"Calling OpenAI Vision API for vehicle analysis with model: {payload['model']}")
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
            logger.info(f"OpenAI response received")

        if not result.get("choices") or len(result["choices"]) == 0:
            raise Exception(f"No choices in OpenAI response: {result}")

        message = result["choices"][0].get("message", {})
        content = message.get("content")

        if not content:
            raise Exception(f"No content in OpenAI message: {message}")

        logger.info(f"OpenAI content: {content}")

        try:
            parsed_response = json.loads(content)

            # Validate response has required fields
            if "headlights_on" not in parsed_response or "driver_present" not in parsed_response:
                logger.error(f"Missing required fields in response: {parsed_response}")
                raise Exception("Response missing required fields")

            # Ensure boolean types
            result_dict = {
                "headlights_on": bool(parsed_response.get("headlights_on", False)),
                "driver_present": bool(parsed_response.get("driver_present", False)),
                "confidence": parsed_response.get("confidence", "medium"),
                "raw_response": content,
            }

            return result_dict

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {content}")
            raise Exception(f"Failed to parse model response as JSON: {str(e)}")
