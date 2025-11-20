from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import redis.asyncio as redis
import logging

from foundation.database import get_db
from foundation.schemas import HealthCheckResponse
from settings import settings

router = APIRouter()
logger = logging.getLogger(__name__)


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
