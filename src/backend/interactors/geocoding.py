from sqlalchemy.ext.asyncio import AsyncSession
from geopy.geocoders import Nominatim
from typing import Optional, Dict
import logging

from settings import settings

logger = logging.getLogger(__name__)


class GeocodingInteractor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.geocoder = Nominatim(user_agent=settings.APP_NAME)

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict]:
        try:
            location = self.geocoder.reverse(f"{latitude}, {longitude}", language="uk")

            if not location:
                logger.warning(f"No address found for coordinates: {latitude}, {longitude}")
                return None

            address_parts = location.raw.get("address", {})

            formatted_address = self._format_ukrainian_address(address_parts)

            return {
                "address": location.address,
                "formatted_address": formatted_address,
                "country": address_parts.get("country"),
                "city": address_parts.get("city") or address_parts.get("town") or address_parts.get("village"),
                "street": address_parts.get("road"),
                "postal_code": address_parts.get("postcode"),
                "raw": address_parts,
            }

        except Exception as e:
            logger.error(f"Error during reverse geocoding: {e}", exc_info=True)
            return None

    def _format_ukrainian_address(self, address_parts: dict) -> str:
        components = []

        city = address_parts.get("city") or address_parts.get("town") or address_parts.get("village")
        if city:
            components.append(f"м. {city}")

        street = address_parts.get("road")
        house_number = address_parts.get("house_number")
        if street:
            street_formatted = f"вул. {street}"
            if house_number:
                street_formatted += f", {house_number}"
            components.append(street_formatted)

        return ", ".join(components) if components else address_parts.get("display_name", "")
