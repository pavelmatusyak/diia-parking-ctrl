from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from pathlib import Path
import logging

from settings import settings
from routes.violations import router as violations_router
from routes.users import router as users_router
from routes.ocr import router as ocr_router
from routes.geocoding import router as geocoding_router
from routes.health import router as health_router
from routes.reports import router as reports_router
from routes.parking_analysis import router as parking_analysis_router
from routes.auth import router as auth_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Parking Violation Reporting System",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


app.include_router(health_router, tags=["Health"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(violations_router, prefix="/api/v1/violations", tags=["Violations"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(ocr_router, prefix="/api/v1/ocr", tags=["OCR"])
app.include_router(geocoding_router, prefix="/api/v1/geocoding", tags=["Geocoding"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(parking_analysis_router, prefix="/api/v1/parking-analysis", tags=["Parking Analysis"])

local_storage_path = Path("local_storage")
local_storage_path.mkdir(exist_ok=True)

try:
    app.mount("/storage", StaticFiles(directory="local_storage"), name="storage")
except Exception as e:
    logger.warning(f"Could not mount static files for local storage: {e}")


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
