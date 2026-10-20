import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.User import User
from app.models.contractor_profile import ContractorProfile
from app.core.security import get_current_user
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    ContractorProfileResponse,
    ContractorProfileUpdate,
)

router = APIRouter()


async def build_user_response(user: User, db: AsyncSession) -> UserResponse:
    prof_resp = None
    if user.role == "contractor":
        res = await db.execute(select(ContractorProfile).filter(ContractorProfile.user_id == user.id))
        prof = res.scalar_one_or_none()
        if prof:
            prof_resp = ContractorProfileResponse(
                user_id=str(prof.user_id),
                bio=prof.bio,
                categories=prof.categories or "all",
                has_own_tools=bool(prof.has_own_tools),
                is_verified=bool(prof.is_verified),
                completed_tasks_count=int(prof.completed_tasks_count or 0)
            )
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        rating=float(user.rating) if user.rating else 5.0,
        contractor_profile=prof_resp
    )


@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить текущего пользователя (для AuthContext)"""
    return await build_user_response(current_user, db)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить профиль текущего пользователя"""
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone

    await db.commit()
    await db.refresh(current_user)

    return await build_user_response(current_user, db)


@router.put("/me/contractor-profile", response_model=ContractorProfileResponse)
async def update_contractor_profile(
    prof_in: ContractorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить профиль исполнителя (био, категории, инструмент)"""
    res = await db.execute(select(ContractorProfile).filter(ContractorProfile.user_id == current_user.id))
    prof = res.scalar_one_or_none()

    if not prof:
        prof = ContractorProfile(
            user_id=current_user.id,
            bio=prof_in.bio or "",
            categories=prof_in.categories or "all",
            has_own_tools=prof_in.has_own_tools or False,
            is_verified=False,
            completed_tasks_count=0
        )
        db.add(prof)
    else:
        if prof_in.bio is not None:
            prof.bio = prof_in.bio
        if prof_in.categories is not None:
            prof.categories = prof_in.categories
        if prof_in.has_own_tools is not None:
            prof.has_own_tools = prof_in.has_own_tools

    await db.commit()
    await db.refresh(prof)

    return ContractorProfileResponse(
        user_id=str(prof.user_id),
        bio=prof.bio,
        categories=prof.categories or "all",
        has_own_tools=bool(prof.has_own_tools),
        is_verified=bool(prof.is_verified),
        completed_tasks_count=int(prof.completed_tasks_count or 0)
    )


@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await build_user_response(user, db)
