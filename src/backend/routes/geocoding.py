from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from foundation.database import get_db
from foundation.schemas import GeocodeReverseRequest, GeocodeReverseResponse
from interactors.auth import get_current_user
from interactors.geocoding import GeocodingInteractor

router = APIRouter()


@router.post("/reverse", response_model=GeocodeReverseResponse)
async def reverse_geocode(
    request: GeocodeReverseRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = GeocodingInteractor(db)
    result = await interactor.reverse_geocode(request.latitude, request.longitude)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find address for coordinates: {request.latitude}, {request.longitude}"
        )

    return result
