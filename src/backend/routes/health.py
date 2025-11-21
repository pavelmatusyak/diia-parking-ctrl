from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import httpx
import redis.asyncio as redis
import logging

from foundation.database import get_db
from foundation.schemas import HealthCheckResponse, ExternalServiceHealthResponse
from settings import settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def _check_external_service(service_name: str, base_url: str):
    health_url = f"{base_url.rstrip('/')}/health"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(health_url)
            response.raise_for_status()
            try:
                payload = response.json()
            except Exception:
                payload = {"raw": response.text}
            return "healthy", payload
    except httpx.HTTPError as e:
        logger.error(f"{service_name} health check failed: {e}")
        return "unhealthy", {"error": str(e)}
    except Exception as e:
        logger.error(f"{service_name} unexpected error: {e}")
        return "unhealthy", {"error": str(e)}


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "healthy"
    redis_status = "healthy"

    try:
        await db.execute(text("SELECT 1"))
        await db.commit()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    # try:
    #     redis_client = redis.from_url(settings.REDIS_URL)
    #     await redis_client.ping()
    #     await redis_client.close()
    # except Exception as e:
    #     logger.error(f"Redis health check failed: {e}")
    #     redis_status = "unhealthy"

    return HealthCheckResponse(
        status="healthy" if db_status == "healthy" and redis_status == "healthy" else "degraded",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        database=db_status,
        redis=redis_status,
    )


@router.get("/health/geo", response_model=ExternalServiceHealthResponse)
async def geo_health_check():
    service_status, service_response = await _check_external_service(
        "Geo service",
        settings.GEO_SERVICE_URL,
    )

    return ExternalServiceHealthResponse(
        status="healthy" if service_status == "healthy" else "unhealthy",
        service="geo",
        service_url=settings.GEO_SERVICE_URL,
        service_status=service_status,
        service_response=service_response,
        timestamp=datetime.utcnow(),
    )


@router.get("/health/ocr", response_model=ExternalServiceHealthResponse)
async def ocr_health_check():
    ocr_base_url = settings.OCR_SERVICE_URL or settings.OCR_SERVICE_BASE_URL

    service_status, service_response = await _check_external_service(
        "OCR service",
        ocr_base_url,
    )

    return ExternalServiceHealthResponse(
        status="healthy" if service_status == "healthy" else "unhealthy",
        service="ocr",
        service_url=ocr_base_url,
        service_status=service_status,
        service_response=service_response,
        timestamp=datetime.utcnow(),
    )
