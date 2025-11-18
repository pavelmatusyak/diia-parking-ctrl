from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from foundation.database import get_db
from foundation.schemas import OCRAnalysisResponse
from interactors.auth import get_current_user
from interactors.ocr import OCRInteractor

router = APIRouter()


@router.post("/analyze", response_model=OCRAnalysisResponse)
async def analyze_license_plate(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = OCRInteractor(db)
    result = await interactor.analyze_image(file)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not detect a valid license plate in the image. Please ensure the image contains a clear view of a Ukrainian license plate."
        )

    return result
