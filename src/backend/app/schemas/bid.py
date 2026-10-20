from typing import Optional
import uuid
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class BidCreate(BaseModel):
    task_id: uuid.UUID
    offered_price: float = Field(..., ge=0)
    eta_minutes: int = Field(..., gt=0)
    cover_letter: Optional[str] = None


class BidUpdate(BaseModel):
    offered_price: Optional[float] = Field(None, ge=0)
    eta_minutes: Optional[int] = Field(None, gt=0)
    cover_letter: Optional[str] = None
    status: Optional[str] = None


class BidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    contractor_id: str
    offered_price: float
    eta_minutes: int
    cover_letter: Optional[str] = None
    status: str
    contractor: Optional[UserResponse] = None
