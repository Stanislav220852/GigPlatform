from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.task_proposal import TaskProposal
from app.models.User import User
import uuid

router = APIRouter()

@router.get("/")
async def read_bids(
    task_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(TaskProposal)
    if task_id:
        query = query.filter(TaskProposal.task_id == task_id)
    
    result = await db.execute(query)
    bids = result.scalars().all()
    
    bids_response = []
    for bid in bids:
        contractor_result = await db.execute(select(User).filter(User.id == bid.contractor_id))
        contractor = contractor_result.scalar_one_or_none()
        bids_response.append({
            "id": str(bid.id),
            "task_id": str(bid.task_id),
            "contractor_id": str(bid.contractor_id),
            "contractor": {
                "id": str(contractor.id) if contractor else None,
                "full_name": contractor.full_name if contractor else "Unknown",
                "role": contractor.role if contractor else "contractor"
            } if contractor else None,
            "offered_price": float(bid.offered_price) if bid.offered_price else 0,
            "eta_minutes": bid.eta_minutes,
            "cover_letter": bid.cover_letter,
            "status": bid.status
        })
    
    return bids_response

@router.get("/{bid_id}", response_model=dict)
async def read_bid(
    bid_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaskProposal).filter(TaskProposal.id == bid_id))
    bid = result.scalar_one_or_none()
    
    if bid is None:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    contractor_result = await db.execute(select(User).filter(User.id == bid.contractor_id))
    contractor = contractor_result.scalar_one_or_none()
    
    return {
        "id": str(bid.id),
        "task_id": str(bid.task_id),
        "contractor_id": str(bid.contractor_id),
        "contractor": {
            "id": str(contractor.id) if contractor else None,
            "full_name": contractor.full_name if contractor else "Unknown",
            "role": contractor.role if contractor else "contractor"
        } if contractor else None,
        "offered_price": float(bid.offered_price) if bid.offered_price else 0,
        "eta_minutes": bid.eta_minutes,
        "cover_letter": bid.cover_letter,
        "status": bid.status
    }

@router.post("/", response_model=dict)
async def create_bid(
    bid_data: dict,
    db: AsyncSession = Depends(get_db)
):
    new_bid = TaskProposal(
        task_id=bid_data.get("task_id"),
        contractor_id=bid_data.get("contractor_id"),
        offered_price=bid_data.get("offered_price"),
        eta_minutes=bid_data.get("eta_minutes"),
        cover_letter=bid_data.get("cover_letter"),
        status="pending"
    )
    
    db.add(new_bid)
    await db.commit()
    await db.refresh(new_bid)
    
    return {
        "id": str(new_bid.id),
        "task_id": str(new_bid.task_id),
        "contractor_id": str(new_bid.contractor_id),
        "offered_price": float(new_bid.offered_price) if new_bid.offered_price else 0,
        "eta_minutes": new_bid.eta_minutes,
        "cover_letter": new_bid.cover_letter,
        "status": new_bid.status
    }

@router.put("/{bid_id}", response_model=dict)
async def update_bid(
    bid_id: uuid.UUID,
    bid_data: dict,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaskProposal).filter(TaskProposal.id == bid_id))
    bid = result.scalar_one_or_none()
    
    if bid is None:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    for key, value in bid_data.items():
        if hasattr(bid, key):
            setattr(bid, key, value)
    
    await db.commit()
    await db.refresh(bid)
    
    return {
        "id": str(bid.id),
        "task_id": str(bid.task_id),
        "contractor_id": str(bid.contractor_id),
        "offered_price": float(bid.offered_price) if bid.offered_price else 0,
        "eta_minutes": bid.eta_minutes,
        "cover_letter": bid.cover_letter,
        "status": bid.status
    }
