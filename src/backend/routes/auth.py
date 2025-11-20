from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import uuid
import random

from interactors.auth import create_access_token
from foundation.database import get_db
from foundation.models import User

router = APIRouter()

TEST_USERS = {
    "user1": {
        "password": "password123",
        "diia_user_id": "diia-001",
        "name": "Іван Петренко",
    },
    "user2": {
        "password": "password123",
        "diia_user_id": "diia-002",
        "name": "Олена Коваленко",
    },
    "user3": {
        "password": "password123",
        "diia_user_id": "diia-003",
        "name": "Андрій Шевченко",
    },
    "user4": {
        "password": "password123",
        "diia_user_id": "diia-004",
        "name": "Марія Сидоренко",
    },
    "user5": {
        "password": "password123",
        "diia_user_id": "diia-005",
        "name": "Олег Мельник",
    },
    "user6": {
        "password": "password123",
        "diia_user_id": "diia-006",
        "name": "Наталія Кравченко",
    },
    "user7": {
        "password": "password123",
        "diia_user_id": "diia-007",
        "name": "Сергій Бондаренко",
    },
    "user8": {
        "password": "password123",
        "diia_user_id": "diia-008",
        "name": "Тетяна Лисенко",
    },
    "user9": {
        "password": "password123",
        "diia_user_id": "diia-009",
        "name": "Дмитро Ткаченко",
    },
    "user10": {
        "password": "password123",
        "diia_user_id": "diia-010",
        "name": "Юлія Павленко",
    },
}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    diia_user_id: str
    name: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint for test users.

    Test credentials:
    - Username: user1, user2, user3, ..., user10
    - Password: password123 (for all users)

    Returns JWT access token.
    """
    if request.username not in TEST_USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = TEST_USERS[request.username]

    if request.password != user_data["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": request.username,
            "diia_user_id": user_data["diia_user_id"],
            "name": user_data["name"],
        }
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=request.username,
        diia_user_id=user_data["diia_user_id"],
        name=user_data["name"],
    )


@router.get("/users")
async def list_test_users():
    """
    List all available test users (without passwords).
    """
    return {
        "users": [
            {
                "username": username,
                "diia_user_id": user_data["diia_user_id"],
                "name": user_data["name"],
            }
            for username, user_data in TEST_USERS.items()
        ],
        "default_password": "password123",
    }


ANONYMOUS_NAMES = [
    "Гість Демонстраційний",
    "Аноним Київський",
    "Тестовий Користувач",
    "Демо Учасник",
    "Гість Системи",
    "Відвідувач Анонімний",
    "Пробний Акаунт",
    "Тимчасовий Юзер",
    "Демо Аналітик",
    "Гість Презентації",
]


class AnonymousUserResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    diia_user_id: str
    name: str
    is_anonymous: bool


@router.post("/anonymous", response_model=AnonymousUserResponse)
async def create_anonymous_user(db: AsyncSession = Depends(get_db)):
    """
    Create an anonymous/guest user for demo purposes.

    This endpoint generates a temporary user with a unique ID and JWT token.
    Perfect for demos where multiple people need to try the system without registration.

    No authentication required.
    Each call creates a new unique anonymous user.
    """
    anonymous_id = str(uuid.uuid4())
    anonymous_name = random.choice(ANONYMOUS_NAMES)
    diia_id = f"anon-{uuid.uuid4().hex[:8]}"

    user = User(
        id=anonymous_id,
        diia_user_id=diia_id,
        full_name=anonymous_name,
        is_active=True,
        is_verified=False,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow(),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": anonymous_id,
            "diia_user_id": diia_id,
            "name": anonymous_name,
            "is_anonymous": True,
        }
    )

    return AnonymousUserResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=anonymous_id,
        diia_user_id=diia_id,
        name=anonymous_name,
        is_anonymous=True,
    )
