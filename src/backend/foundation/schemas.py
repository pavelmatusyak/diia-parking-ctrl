from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator, ConfigDict
from foundation.models import ViolationStatus, PhotoType


class LocationData(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None


class PhotoMetadata(BaseModel):
    timestamp: Optional[datetime] = None
    gps_coordinates: Optional[LocationData] = None
    device_info: Optional[dict] = None


class PhotoUploadRequest(BaseModel):
    photo_type: PhotoType
    metadata: Optional[PhotoMetadata] = None


class PhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    violation_id: str
    photo_type: PhotoType
    storage_url: str
    file_size: int
    mime_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    captured_at: Optional[datetime] = None
    uploaded_at: datetime
    ocr_results: Optional[dict] = None


class CreateViolationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    notes: Optional[str] = None


class UpdateViolationRequest(BaseModel):
    notes: Optional[str] = None


class ViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: ViolationStatus
    license_plate: Optional[str] = None
    license_plate_confidence: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    created_at: datetime
    verified_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    verification_time_seconds: Optional[int] = None
    police_case_number: Optional[str] = None
    notes: Optional[str] = None
    violation_reason: Optional[str] = None
    violation_code: Optional[str] = None
    timer_started_at: Optional[datetime] = None
    has_road_sign_photo: bool = False


class ViolationDetailResponse(ViolationResponse):
    photos: list[PhotoResponse] = []
    status_history: list["StatusHistoryResponse"] = []


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    from_status: Optional[ViolationStatus] = None
    to_status: ViolationStatus
    changed_at: datetime
    reason: Optional[str] = None


class OCRAnalysisResponse(BaseModel):
    license_plate: str
    confidence: float
    raw_results: Optional[dict] = None


class GeocodeReverseRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class GeocodeReverseResponse(BaseModel):
    address: str
    formatted_address: str
    country: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None


class VerificationResponse(BaseModel):
    verified: bool
    verification_time_seconds: int
    message: str


class SubmitViolationRequest(BaseModel):
    violation_reason: str = Field(..., min_length=1, max_length=500)
    violation_code: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = None


class SubmitViolationResponse(BaseModel):
    id: str
    status: ViolationStatus
    submitted_at: datetime
    pdf_url: str


class TimerStatusResponse(BaseModel):
    timer_required: bool
    timer_started_at: Optional[datetime] = None
    timer_expires_at: Optional[datetime] = None
    seconds_remaining: int = 0
    can_submit: bool


class TimerStartResponse(BaseModel):
    timer_started_at: datetime
    timer_expires_at: datetime


class PDFUrlResponse(BaseModel):
    pdf_url: str
    expires_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    diia_user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    created_at: datetime
    is_active: bool


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    database: str
    redis: str
