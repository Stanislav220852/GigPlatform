from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.bid import Bid

router = APIRouter()

@router.post("/")
async def create_bid(bid: Bid, db: AsyncSession = Depends(get_db)):
    db.add(bid)
    await db.commit()
    await db.refresh(bid)
    return bid