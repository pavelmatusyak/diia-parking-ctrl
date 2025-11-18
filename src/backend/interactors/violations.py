from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile, HTTPException
from datetime import datetime, timedelta
from typing import Optional
import uuid
import logging

from foundation.models import Violation, Photo, ViolationStatusHistory, ViolationStatus, PhotoType
from interactors.ocr import OCRInteractor
from interactors.ocr_service import OCRServiceClient
from interactors.geocoding import GeocodingInteractor
from interactors.storage import StorageInteractor
from settings import settings

logger = logging.getLogger(__name__)


class ViolationInteractor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ocr = OCRInteractor(db)
        self.ocr_service = OCRServiceClient()
        self.geocoding = GeocodingInteractor(db)
        self.storage = StorageInteractor(db)

    async def create_violation(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        notes: Optional[str] = None,
    ) -> Violation:
        address = await self.geocoding.reverse_geocode(latitude, longitude)

        violation = Violation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            status=ViolationStatus.DRAFT,
            latitude=latitude,
            longitude=longitude,
            address=address.get("formatted_address") if address else None,
            notes=notes,
        )

        self.db.add(violation)
        await self._add_status_history(violation, None, ViolationStatus.DRAFT)
        await self.db.commit()
        await self.db.refresh(violation)

        logger.info(f"Created violation {violation.id} for user {user_id}")
        return violation

    async def get_violation(self, violation_id: str, user_id: str) -> Optional[Violation]:
        stmt = select(Violation).where(
            Violation.id == violation_id,
            Violation.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        violation = result.scalar_one_or_none()
        return violation

    async def update_violation(
        self,
        violation_id: str,
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[Violation]:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            return None

        if notes is not None:
            violation.notes = notes

        await self.db.commit()
        await self.db.refresh(violation)
        return violation

    async def delete_violation(self, violation_id: str, user_id: str) -> bool:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            return False

        if violation.status not in [ViolationStatus.DRAFT, ViolationStatus.PENDING_VERIFICATION]:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete violation that has been submitted",
            )

        await self.db.delete(violation)
        await self.db.commit()
        logger.info(f"Deleted violation {violation_id}")
        return True

    async def upload_photo(
        self,
        violation_id: str,
        user_id: str,
        file: UploadFile,
        photo_type: str = "initial",
    ) -> Photo:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        file_data = await file.read()

        storage_result = await self.storage.upload_file(
            file_data=file_data,
            file_name=file.filename,
            content_type=file.content_type,
            folder=f"violations/{violation_id}",
        )

        photo = Photo(
            id=str(uuid.uuid4()),
            violation_id=violation_id,
            photo_type=PhotoType(photo_type),
            storage_url=storage_result["url"],
            storage_key=storage_result["key"],
            file_size=len(file_data),
            mime_type=file.content_type,
            uploaded_at=datetime.utcnow(),
        )

        if photo_type == "initial":
            ocr_result = await self.ocr_service.detect_from_file(file_data, file.filename)
            if ocr_result and ocr_result.get("status") == "OK":
                photo.ocr_results = ocr_result
                violation.license_plate = ocr_result.get("plate")
                violation.license_plate_confidence = ocr_result.get("confidence")

                if violation.status == ViolationStatus.DRAFT:
                    await self._update_status(violation, ViolationStatus.PENDING_VERIFICATION)
            elif ocr_result and ocr_result.get("status") == "ERROR":
                raise HTTPException(
                    status_code=400,
                    detail=ocr_result.get("message", "OCR detection failed")
                )

        self.db.add(photo)
        await self.db.commit()
        await self.db.refresh(photo)

        logger.info(f"Uploaded photo {photo.id} for violation {violation_id}")
        return photo

    async def verify_violation(
        self,
        violation_id: str,
        user_id: str,
        verification_photo: UploadFile,
    ) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if violation.status != ViolationStatus.PENDING_VERIFICATION:
            raise HTTPException(
                status_code=400,
                detail="Violation is not in pending verification status",
            )

        initial_photo_stmt = select(Photo).where(
            Photo.violation_id == violation_id,
            Photo.photo_type == PhotoType.INITIAL,
        )
        result = await self.db.execute(initial_photo_stmt)
        initial_photo = result.scalar_one_or_none()

        if not initial_photo:
            raise HTTPException(status_code=400, detail="Initial photo not found")

        time_diff = (datetime.utcnow() - initial_photo.uploaded_at).total_seconds()
        min_time = settings.VERIFICATION_TIME_MINUTES * 60

        if time_diff < min_time:
            raise HTTPException(
                status_code=400,
                detail=f"Verification photo must be taken at least {settings.VERIFICATION_TIME_MINUTES} minutes after initial photo",
            )

        verification_photo_obj = await self.upload_photo(
            violation_id=violation_id,
            user_id=user_id,
            file=verification_photo,
            photo_type="verification",
        )

        violation.verification_time_seconds = int(time_diff)
        violation.verified_at = datetime.utcnow()
        await self._update_status(violation, ViolationStatus.VERIFIED)
        await self.db.commit()

        logger.info(f"Verified violation {violation_id}")
        return {
            "verified": True,
            "verification_time_seconds": int(time_diff),
            "message": "Violation successfully verified",
        }

    async def get_evidence_package(self, violation_id: str, user_id: str) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            return None

        photos_stmt = select(Photo).where(Photo.violation_id == violation_id)
        photos_result = await self.db.execute(photos_stmt)
        photos = photos_result.scalars().all()

        return {
            "violation_id": violation.id,
            "license_plate": violation.license_plate,
            "location": {
                "latitude": violation.latitude,
                "longitude": violation.longitude,
                "address": violation.address,
            },
            "photos": [
                {
                    "id": photo.id,
                    "type": photo.photo_type.value,
                    "url": photo.storage_url,
                    "captured_at": photo.captured_at,
                }
                for photo in photos
            ],
            "verification_time_seconds": violation.verification_time_seconds,
            "created_at": violation.created_at,
            "verified_at": violation.verified_at,
        }

    async def upload_sign_photo(
        self,
        violation_id: str,
        user_id: str,
        file: UploadFile,
    ) -> Photo:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        file_data = await file.read()

        storage_result = await self.storage.upload_file(
            file_data=file_data,
            file_name=file.filename,
            content_type=file.content_type,
            folder=f"violations/{violation_id}",
        )

        photo = Photo(
            id=str(uuid.uuid4()),
            violation_id=violation_id,
            photo_type=PhotoType.CONTEXT,
            storage_url=storage_result["url"],
            storage_key=storage_result["key"],
            file_size=len(file_data),
            mime_type=file.content_type,
            uploaded_at=datetime.utcnow(),
        )

        violation.has_road_sign_photo = True

        self.db.add(photo)
        await self.db.commit()
        await self.db.refresh(photo)

        logger.info(f"Uploaded road sign photo {photo.id} for violation {violation_id}")
        return photo

    async def get_timer_status(self, violation_id: str, user_id: str) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if not violation.timer_started_at:
            return {
                "timer_required": not violation.has_road_sign_photo,
                "can_submit": violation.has_road_sign_photo,
            }

        timer_duration = timedelta(minutes=5)
        timer_expires_at = violation.timer_started_at + timer_duration
        now = datetime.utcnow()
        seconds_remaining = max(0, int((timer_expires_at - now).total_seconds()))

        return {
            "timer_required": True,
            "timer_started_at": violation.timer_started_at,
            "timer_expires_at": timer_expires_at,
            "seconds_remaining": seconds_remaining,
            "can_submit": seconds_remaining == 0,
        }

    async def start_timer(self, violation_id: str, user_id: str) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if violation.timer_started_at:
            raise HTTPException(
                status_code=400,
                detail="Timer already started",
            )

        if violation.has_road_sign_photo:
            raise HTTPException(
                status_code=400,
                detail="Timer not required when road sign photo is uploaded",
            )

        violation.timer_started_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(violation)

        timer_duration = timedelta(minutes=5)
        timer_expires_at = violation.timer_started_at + timer_duration

        logger.info(f"Started timer for violation {violation_id}")
        return {
            "timer_started_at": violation.timer_started_at,
            "timer_expires_at": timer_expires_at,
        }

    async def submit_violation(
        self,
        violation_id: str,
        user_id: str,
        violation_reason: str,
        violation_code: str,
        notes: Optional[str] = None,
    ) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        photos_stmt = select(Photo).where(
            Photo.violation_id == violation_id,
            Photo.photo_type == PhotoType.INITIAL,
        )
        photos_result = await self.db.execute(photos_stmt)
        initial_photos = photos_result.scalars().all()

        if not any(p.ocr_results and p.ocr_results.get("status") == "OK" for p in initial_photos):
            raise HTTPException(
                status_code=400,
                detail="Must have at least one photo with successful OCR detection",
            )

        if not violation.has_road_sign_photo:
            if not violation.timer_started_at:
                raise HTTPException(
                    status_code=400,
                    detail="Must start timer or upload road sign photo before submission",
                )

            timer_duration = timedelta(minutes=5)
            timer_expires_at = violation.timer_started_at + timer_duration
            if datetime.utcnow() < timer_expires_at:
                raise HTTPException(
                    status_code=400,
                    detail="Must wait for 5-minute timer to complete before submission",
                )

        violation.violation_reason = violation_reason
        violation.violation_code = violation_code
        if notes:
            violation.notes = notes
        violation.submitted_at = datetime.utcnow()
        await self._update_status(violation, ViolationStatus.SUBMITTED)
        await self.db.commit()
        await self.db.refresh(violation)

        logger.info(f"Submitted violation {violation_id}")
        return {
            "id": violation.id,
            "status": violation.status,
            "submitted_at": violation.submitted_at,
            "pdf_url": f"/api/v1/violations/{violation.id}/pdf",
        }

    async def get_pdf_url(self, violation_id: str, user_id: str) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if violation.status != ViolationStatus.SUBMITTED:
            raise HTTPException(
                status_code=400,
                detail="Violation must be submitted to generate PDF",
            )

        pdf_key = f"violations/{violation_id}/report.pdf"
        presigned_url = await self.storage.generate_presigned_url(pdf_key, expires_in=3600)

        expires_at = datetime.utcnow() + timedelta(hours=1)

        logger.info(f"Generated presigned URL for violation {violation_id}")
        return {
            "pdf_url": presigned_url,
            "expires_at": expires_at,
        }

    async def submit_to_police(
        self,
        violation_id: str,
        user_id: str,
        signature_data: Optional[str] = None,
    ) -> dict:
        violation = await self.get_violation(violation_id, user_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")

        if violation.status != ViolationStatus.VERIFIED:
            raise HTTPException(
                status_code=400,
                detail="Violation must be verified before submission",
            )

        violation.police_case_number = f"PC-{uuid.uuid4().hex[:8].upper()}"
        violation.submitted_at = datetime.utcnow()
        await self._update_status(violation, ViolationStatus.SUBMITTED)
        await self.db.commit()

        logger.info(f"Submitted violation {violation_id} to police")
        return {
            "violation_id": violation.id,
            "status": violation.status,
            "police_case_number": violation.police_case_number,
            "submitted_at": violation.submitted_at,
            "message": "Violation successfully submitted to police",
        }

    async def _update_status(self, violation: Violation, new_status: ViolationStatus):
        old_status = violation.status
        violation.status = new_status
        await self._add_status_history(violation, old_status, new_status)

    async def _add_status_history(
        self,
        violation: Violation,
        from_status: Optional[ViolationStatus],
        to_status: ViolationStatus,
    ):
        history = ViolationStatusHistory(
            id=str(uuid.uuid4()),
            violation_id=violation.id,
            from_status=from_status,
            to_status=to_status,
            changed_at=datetime.utcnow(),
        )
        self.db.add(history)
