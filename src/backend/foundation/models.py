from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum, JSON, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from foundation.database import Base
import enum


class ViolationStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class PhotoType(str, enum.Enum):
    INITIAL = "initial"
    VERIFICATION = "verification"
    CONTEXT = "context"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    diia_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True)
    is_verified: Mapped[bool] = mapped_column(default=False)

    violations: Mapped[list["Violation"]] = relationship("Violation", back_populates="user")


class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[ViolationStatus] = mapped_column(Enum(ViolationStatus), default=ViolationStatus.DRAFT, index=True)

    license_plate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    license_plate_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    verification_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    evidence_package_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    report_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    police_case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # New flow fields
    violation_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    violation_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    timer_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    has_road_sign_photo: Mapped[bool] = mapped_column(default=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    violation_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="violations")
    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="violation", cascade="all, delete-orphan")
    status_history: Mapped[list["ViolationStatusHistory"]] = relationship("ViolationStatusHistory", back_populates="violation", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    violation_id: Mapped[Optional[str]] = mapped_column(ForeignKey("violations.id"), index=True, nullable=True)

    photo_type: Mapped[PhotoType] = mapped_column(Enum(PhotoType))

    storage_url: Mapped[str] = mapped_column(String(1000))
    storage_key: Mapped[str] = mapped_column(String(500))

    file_size: Mapped[int] = mapped_column(Integer)
    mime_type: Mapped[str] = mapped_column(String(100))

    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    exif_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    ocr_results: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    violation: Mapped["Violation"] = relationship("Violation", back_populates="photos")


class ViolationStatusHistory(Base):
    __tablename__ = "violation_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    violation_id: Mapped[str] = mapped_column(ForeignKey("violations.id"), index=True)

    from_status: Mapped[Optional[ViolationStatus]] = mapped_column(Enum(ViolationStatus), nullable=True)
    to_status: Mapped[ViolationStatus] = mapped_column(Enum(ViolationStatus))

    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    changed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    change_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    violation: Mapped["Violation"] = relationship("Violation", back_populates="status_history")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))

    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    violation_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    request_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    response_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[ConversationStatus] = mapped_column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    violation_id: Mapped[Optional[str]] = mapped_column(ForeignKey("violations.id"), nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    conversation_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    messages: Mapped[list["ConversationMessage"]] = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan")
    user: Mapped["User"] = relationship("User")
    violation: Mapped[Optional["Violation"]] = relationship("Violation")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)

    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole))
    content: Mapped[str] = mapped_column(Text)

    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    function_call: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    function_response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    message_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
