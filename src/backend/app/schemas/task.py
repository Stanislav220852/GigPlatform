from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class LocationSchema(BaseModel):
    lat: float
    lng: float
    address_name: Optional[str] = None


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    category: str = Field(default="other", max_length=50)
    price: float = Field(..., ge=0)
    urgency: str = Field(default="flexible", max_length=20)
    latitude: float
    longitude: float
    address_name: str = Field(..., min_length=2, max_length=255)


class TaskCompleteRequest(BaseModel):
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    review: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    category: str
    price: float
    urgency: str
    location: LocationSchema
    status: str
    created_at: Optional[datetime] = None
    client_id: str
    client: Optional[UserResponse] = None
    assigned_contractor_id: Optional[str] = None
    assigned_contractor: Optional[UserResponse] = None
