from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class ChatMessageCreate(BaseModel):
    message_text: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    sender_id: str
    message_text: str
    is_read: bool = False
    created_at: Optional[datetime] = None
    sender: Optional[UserResponse] = None
