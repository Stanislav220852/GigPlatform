import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.db.database import get_db
from app.models.chat_message import ChatMessage
from app.models.task import Task
from app.models.User import User
from app.core.security import get_current_user
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.schemas.user import UserResponse

router = APIRouter()


def build_chat_response(msg: ChatMessage) -> ChatMessageResponse:
    sender_resp = None
    if msg.sender:
        sender_resp = UserResponse(
            id=str(msg.sender.id),
            email=msg.sender.email,
            full_name=msg.sender.full_name,
            phone=msg.sender.phone,
            role=msg.sender.role,
            rating=float(msg.sender.rating) if msg.sender.rating else 5.0
        )
    return ChatMessageResponse(
        id=str(msg.id),
        task_id=str(msg.task_id),
        sender_id=str(msg.sender_id),
        message_text=msg.message_text,
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender=sender_resp
    )


@router.get("/{task_id}/messages", response_model=List[ChatMessageResponse])
@router.get("/{task_id}", response_model=List[ChatMessageResponse])
async def get_task_messages(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получение всех сообщений по заданию"""
    task_res = await db.execute(select(Task).filter(Task.id == task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    stmt = (
        select(ChatMessage)
        .options(joinedload(ChatMessage.sender))
        .filter(ChatMessage.task_id == task_id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [build_chat_response(m) for m in messages]


@router.post("/{task_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{task_id}", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_task_message(
    task_id: uuid.UUID,
    msg_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Отправка сообщения в чат по заданию"""
    task_res = await db.execute(select(Task).filter(Task.id == task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    new_msg = ChatMessage(
        task_id=task.id,
        sender_id=current_user.id,
        message_text=msg_in.message_text,
        is_read=False
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    new_msg.sender = current_user
    return build_chat_response(new_msg)
