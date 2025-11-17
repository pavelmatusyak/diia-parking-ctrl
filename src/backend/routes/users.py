from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from foundation.database import get_db
from foundation.schemas import UserResponse, ViolationResponse
from interactors.auth import get_current_user
from interactors.users import UserInteractor

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = UserInteractor(db)
    user = await interactor.get_user(current_user["id"])
    return user


@router.get("/me/violations", response_model=List[ViolationResponse])
async def get_user_violations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interactor = UserInteractor(db)
    violations = await interactor.get_user_violations(current_user["id"])
    return violations
