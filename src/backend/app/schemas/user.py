from typing import Optional
from pydantic import BaseModel, ConfigDict


class ContractorProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    bio: Optional[str] = None
    categories: str = "all"
    has_own_tools: bool = False
    is_verified: bool = False
    completed_tasks_count: int = 0


class ContractorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    categories: Optional[str] = None
    has_own_tools: Optional[bool] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    phone: str
    role: str
    rating: float
    contractor_profile: Optional[ContractorProfileResponse] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
