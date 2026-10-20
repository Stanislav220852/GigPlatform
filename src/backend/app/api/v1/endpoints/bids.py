import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.db.database import get_db
from app.models.task_proposal import TaskProposal
from app.models.task import Task
from app.models.User import User
from app.core.security import get_current_user
from app.schemas.bid import BidCreate, BidUpdate, BidResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/", response_model=List[BidResponse])
async def read_bids(
    task_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(TaskProposal).options(joinedload(TaskProposal.contractor))
    if task_id:
        query = query.filter(TaskProposal.task_id == task_id)

    result = await db.execute(query)
    bids = result.scalars().all()

    return [
        BidResponse(
            id=str(bid.id),
            task_id=str(bid.task_id),
            contractor_id=str(bid.contractor_id),
            offered_price=float(bid.offered_price) if bid.offered_price else 0.0,
            eta_minutes=bid.eta_minutes,
            cover_letter=bid.cover_letter,
            status=bid.status,
            contractor=UserResponse(
                id=str(bid.contractor.id),
                email=bid.contractor.email,
                full_name=bid.contractor.full_name,
                phone=bid.contractor.phone,
                role=bid.contractor.role,
                rating=float(bid.contractor.rating) if bid.contractor.rating else 5.0
            ) if bid.contractor else None
        )
        for bid in bids
    ]


@router.get("/{bid_id}", response_model=BidResponse)
async def read_bid(
    bid_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(TaskProposal)
        .options(joinedload(TaskProposal.contractor))
        .filter(TaskProposal.id == bid_id)
    )
    result = await db.execute(stmt)
    bid = result.scalar_one_or_none()

    if bid is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found")

    return BidResponse(
        id=str(bid.id),
        task_id=str(bid.task_id),
        contractor_id=str(bid.contractor_id),
        offered_price=float(bid.offered_price) if bid.offered_price else 0.0,
        eta_minutes=bid.eta_minutes,
        cover_letter=bid.cover_letter,
        status=bid.status,
        contractor=UserResponse(
            id=str(bid.contractor.id),
            email=bid.contractor.email,
            full_name=bid.contractor.full_name,
            phone=bid.contractor.phone,
            role=bid.contractor.role,
            rating=float(bid.contractor.rating) if bid.contractor.rating else 5.0
        ) if bid.contractor else None
    )


@router.post("/", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
async def create_bid(
    bid_in: BidCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify task exists
    task_res = await db.execute(select(Task).filter(Task.id == bid_in.task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    new_bid = TaskProposal(
        task_id=bid_in.task_id,
        contractor_id=current_user.id,
        offered_price=bid_in.offered_price,
        eta_minutes=bid_in.eta_minutes,
        cover_letter=bid_in.cover_letter,
        status="pending"
    )

    db.add(new_bid)
    await db.commit()
    await db.refresh(new_bid)

    return BidResponse(
        id=str(new_bid.id),
        task_id=str(new_bid.task_id),
        contractor_id=str(new_bid.contractor_id),
        offered_price=float(new_bid.offered_price) if new_bid.offered_price else 0.0,
        eta_minutes=new_bid.eta_minutes,
        cover_letter=new_bid.cover_letter,
        status=new_bid.status,
        contractor=UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            phone=current_user.phone,
            role=current_user.role,
            rating=float(current_user.rating) if current_user.rating else 5.0
        )
    )


@router.put("/{bid_id}", response_model=BidResponse)
async def update_bid(
    bid_id: uuid.UUID,
    bid_in: BidUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(TaskProposal)
        .options(joinedload(TaskProposal.contractor))
        .filter(TaskProposal.id == bid_id)
    )
    result = await db.execute(stmt)
    bid = result.scalar_one_or_none()

    if bid is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found")

    update_dict = bid_in.model_dump(exclude_unset=True)

    # Если предложение принимается — обновляем статус задачи и назначаем исполнителя
    if update_dict.get("status") == "accepted":
        task_res = await db.execute(select(Task).filter(Task.id == bid.task_id))
        task = task_res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        if task.client_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только автор задачи может принять отклик")

        task.status = "in_progress"
        task.assigned_contractor_id = bid.contractor_id

        # Отклоняем остальные отклики по этой задаче
        from sqlalchemy import update
        await db.execute(
            update(TaskProposal)
            .where(TaskProposal.task_id == task.id, TaskProposal.id != bid.id)
            .values(status="rejected")
        )

    for key, value in update_dict.items():
        if hasattr(bid, key):
            setattr(bid, key, value)

    await db.commit()
    await db.refresh(bid)

    return BidResponse(
        id=str(bid.id),
        task_id=str(bid.task_id),
        contractor_id=str(bid.contractor_id),
        offered_price=float(bid.offered_price) if bid.offered_price else 0.0,
        eta_minutes=bid.eta_minutes,
        cover_letter=bid.cover_letter,
        status=bid.status,
        contractor=UserResponse(
            id=str(bid.contractor.id),
            email=bid.contractor.email,
            full_name=bid.contractor.full_name,
            phone=bid.contractor.phone,
            role=bid.contractor.role,
            rating=float(bid.contractor.rating) if bid.contractor.rating else 5.0
        ) if bid.contractor else None
    )
