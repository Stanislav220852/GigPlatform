from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.User import User

router = APIRouter()

@router.get("/{user_id}", response_model=dict)
async def read_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "rating": float(user.rating) if user.rating else 5.0
    }

@router.get("/me", response_model=dict)
async def read_current_user(
    db: AsyncSession = Depends(get_db)
):
    """Получить текущего пользователя (для AuthContext)"""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "rating": float(user.rating) if user.rating else 5.0
    }