from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from foundation.schemas import AnalyzeParkingRequest, AnalyzeParkingResponse
from foundation.database import get_db
from interactors.parking_analysis import ParkingAnalysisInteractor
from interactors.violations import ViolationInteractor
from interactors.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeParkingResponse)
async def analyze_parking(
    request: AnalyzeParkingRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        violation_interactor = ViolationInteractor(db)
        violation = await violation_interactor.get_violation(
            request.violation_id, current_user["id"]
        )

        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found"
            )

        if violation.latitude is None or violation.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Violation does not have location coordinates"
            )

        parking_interactor = ParkingAnalysisInteractor()
        result = await parking_interactor.analyze_parking(
            latitude=violation.latitude,
            longitude=violation.longitude,
            zoom=request.zoom,
            image_size=request.image_size,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing parking: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze parking: {str(e)}",
        )
