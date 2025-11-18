from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from foundation.database import get_db
from foundation.schemas import (
    CreateViolationRequest,
    UpdateViolationRequest,
    ViolationResponse,
    ViolationDetailResponse,
    PhotoResponse,
    VerificationResponse,
    SubmitViolationRequest,
    SubmitViolationResponse,
    TimerStatusResponse,
    TimerStartResponse,
    PDFUrlResponse,
)
from interactors.violations import ViolationInteractor
from interactors.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def create_violation(
    request: CreateViolationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    violation = await interactor.create_violation(
        user_id=current_user["id"],
        latitude=request.latitude,
        longitude=request.longitude,
        notes=request.notes,
    )
    return violation


@router.get("/{violation_id}", response_model=ViolationDetailResponse)
async def get_violation(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    violation = await interactor.get_violation(violation_id, current_user["id"])
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation


@router.patch("/{violation_id}", response_model=ViolationResponse)
async def update_violation(
    violation_id: str,
    request: UpdateViolationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    violation = await interactor.update_violation(
        violation_id=violation_id,
        user_id=current_user["id"],
        notes=request.notes,
    )
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation


@router.delete("/{violation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_violation(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    deleted = await interactor.delete_violation(violation_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Violation not found")


@router.post("/{violation_id}/photos", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    violation_id: str,
    file: UploadFile = File(...),
    photo_type: str = "initial",
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    photo = await interactor.upload_photo(
        violation_id=violation_id,
        user_id=current_user["id"],
        file=file,
        photo_type=photo_type,
    )
    return photo


@router.post("/{violation_id}/verify", response_model=VerificationResponse)
async def verify_violation(
    violation_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    result = await interactor.verify_violation(
        violation_id=violation_id,
        user_id=current_user["id"],
        verification_photo=file,
    )
    return result


@router.get("/{violation_id}/evidence")
async def get_evidence_package(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    evidence = await interactor.get_evidence_package(violation_id, current_user["id"])
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence package not found")
    return evidence


@router.post("/{violation_id}/sign-photo", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_sign_photo(
    violation_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    photo = await interactor.upload_sign_photo(
        violation_id=violation_id,
        user_id=current_user["id"],
        file=file,
    )
    return photo


@router.get("/{violation_id}/timer-status", response_model=TimerStatusResponse)
async def get_timer_status(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    timer_status = await interactor.get_timer_status(violation_id, current_user["id"])
    return timer_status


@router.post("/{violation_id}/start-timer", response_model=TimerStartResponse)
async def start_timer(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    result = await interactor.start_timer(violation_id, current_user["id"])
    return result


@router.put("/{violation_id}/submit", response_model=SubmitViolationResponse)
async def submit_violation(
    violation_id: str,
    request: SubmitViolationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    result = await interactor.submit_violation(
        violation_id=violation_id,
        user_id=current_user["id"],
        violation_reason=request.violation_reason,
        violation_code=request.violation_code,
        notes=request.notes,
    )
    return result


@router.get("/{violation_id}/pdf", response_model=PDFUrlResponse)
async def get_pdf_url(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    result = await interactor.get_pdf_url(violation_id, current_user["id"])
    return result


@router.post("/{violation_id}/submit-to-police", response_model=SubmitViolationResponse)
async def submit_to_police(
    violation_id: str,
    request: SubmitViolationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    result = await interactor.submit_to_police(
        violation_id=violation_id,
        user_id=current_user["id"],
        signature_data=getattr(request, 'signature_data', None),
    )
    return result


@router.get("/{violation_id}/status", response_model=ViolationResponse)
async def get_violation_status(
    violation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = ViolationInteractor(db)
    violation = await interactor.get_violation(violation_id, current_user["id"])
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation
