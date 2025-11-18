from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from foundation.database import get_db
from interactors.auth import get_current_user
from interactors.pdf_generator import PDFReportGenerator
from foundation.models import Conversation, User, Photo
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/conversations/{conversation_id}/pdf", response_class=StreamingResponse)
async def generate_conversation_pdf(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate PDF report for a conversation.
    Returns the PDF file for download/preview.
    """
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user["id"]
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Get user data
    user_result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = user_result.scalar_one_or_none()

    # Get conversation metadata
    metadata = conversation.conversation_metadata or {}

    # Prepare violation data
    violation_data = {
        "id": conversation_id,
        "license_plate": metadata.get("license_plate", "Не розпізнано"),
        "address": metadata.get("address", "Не вказано"),
        "latitude": metadata.get("latitude", 0),
        "longitude": metadata.get("longitude", 0),
        "created_at": conversation.started_at,
        "notes": metadata.get("notes", ""),
        "police_case_number": metadata.get("police_case_number", "Буде присвоєно")
    }

    # Prepare user data
    user_data = {
        "full_name": metadata.get("full_name", "Не вказано"),
        "phone": metadata.get("phone", "Не вказано"),
        "email": metadata.get("email", user.email if user else "Не вказано")
    }

    # Get photos count
    photos_result = await db.execute(
        select(Photo).where(Photo.id == metadata.get("photo_id"))
    )
    photos = photos_result.scalars().all()

    # Generate PDF
    pdf_generator = PDFReportGenerator()
    pdf_buffer = pdf_generator.generate_violation_report(
        violation_data=violation_data,
        user_data=user_data,
        photos=photos
    )

    # Return as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=zvernennya_{conversation_id[:8]}.pdf"
        }
    )


@router.get("/violations/{violation_id}/pdf", response_class=StreamingResponse)
async def generate_violation_pdf(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate PDF report for a violation.
    Returns the PDF file for download/preview.
    """
    from foundation.models import Violation

    # Get violation
    result = await db.execute(
        select(Violation).where(
            Violation.id == violation_id,
            Violation.user_id == current_user["id"]
        )
    )
    violation = result.scalar_one_or_none()

    if not violation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found"
        )

    # Get user data
    user_result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = user_result.scalar_one_or_none()

    # Prepare violation data
    violation_data = {
        "id": violation.id,
        "license_plate": violation.license_plate or "Не розпізнано",
        "address": violation.address or "Не вказано",
        "latitude": violation.latitude or 0,
        "longitude": violation.longitude or 0,
        "created_at": violation.created_at,
        "verification_time_seconds": violation.verification_time_seconds,
        "notes": violation.notes or "",
        "police_case_number": violation.police_case_number or "Буде присвоєно"
    }

    # Prepare user data
    metadata = violation.violation_metadata or {}
    user_data = {
        "full_name": metadata.get("full_name", "Не вказано"),
        "phone": metadata.get("phone", "Не вказано"),
        "email": user.email if user else "Не вказано"
    }

    # Get photos
    photos_result = await db.execute(
        select(Photo).where(Photo.violation_id == violation_id)
    )
    photos = photos_result.scalars().all()

    # Generate PDF
    pdf_generator = PDFReportGenerator()
    pdf_buffer = pdf_generator.generate_violation_report(
        violation_data=violation_data,
        user_data=user_data,
        photos=photos
    )

    # Return as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=zvernennya_{violation_id[:8]}.pdf"
        }
    )
