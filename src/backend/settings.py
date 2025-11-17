from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str = "Parking Violation Reporter"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_BASE_URL: str = "http://localhost:8000"  # Change to your public URL in production

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5440/parking_violations"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis (cache, sessions, rate limiting)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600

    # Authentication & Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API Keys
    OPENAI_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: Optional[str] = None

    # File Storage (S3/MinIO)
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "parking-violations"
    S3_REGION: str = "us-east-1"

    # OCR Settings
    OCR_SERVICE_URL: Optional[str] = None  # External OCR service URL
    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    OCR_MODEL_PATH: Optional[str] = None

    # Geolocation
    GEOCODING_PROVIDER: str = "nominatim"
    LOCATION_TOLERANCE_METERS: float = 10.0

    # Violation Settings
    VERIFICATION_TIME_MINUTES: int = 5
    MAX_PHOTO_SIZE_MB: int = 10
    ALLOWED_IMAGE_FORMATS: list[str] = ["jpg", "jpeg", "png"]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # Error Tracking (Optional)
    SENTRY_DSN: Optional[str] = None

    # Police API (to be configured)
    POLICE_API_URL: Optional[str] = None
    POLICE_API_KEY: Optional[str] = None

    # Diia Integration
    DIIA_OAUTH_CLIENT_ID: Optional[str] = None
    DIIA_OAUTH_CLIENT_SECRET: Optional[str] = None
    DIIA_OAUTH_REDIRECT_URI: str = "http://localhost:8000/auth/callback"
    DIIA_SIGNATURE_API_URL: Optional[str] = None


settings = Settings()
