from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from foundation.models import User, Violation


class UserInteractor:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_violations(self, user_id: str) -> List[Violation]:
        stmt = select(Violation).where(Violation.user_id == user_id).order_by(Violation.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_or_update_user(self, diia_user_id: str, email: str = None, phone: str = None, full_name: str = None) -> User:
        stmt = select(User).where(User.diia_user_id == diia_user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            if email:
                user.email = email
            if phone:
                user.phone = phone
            if full_name:
                user.full_name = full_name
        else:
            import uuid
            user = User(
                id=str(uuid.uuid4()),
                diia_user_id=diia_user_id,
                email=email,
                phone=phone,
                full_name=full_name,
                is_active=True,
                is_verified=True,
            )
            self.db.add(user)

        await self.db.commit()
        await self.db.refresh(user)
        return user
