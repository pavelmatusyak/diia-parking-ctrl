from fastapi import APIRouter, HTTPException, status
import logging

from foundation.schemas import AnalyzeParkingRequest, AnalyzeParkingResponse
from interactors.parking_analysis import ParkingAnalysisInteractor

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeParkingResponse)
async def analyze_parking(request: AnalyzeParkingRequest):
    try:
        interactor = ParkingAnalysisInteractor()

        result = await interactor.analyze_parking(
            latitude=request.latitude,
            longitude=request.longitude,
            zoom=request.zoom,
            image_size=request.image_size,
        )

        return result

    except Exception as e:
        logger.error(f"Error analyzing parking: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze parking: {str(e)}",
        )
