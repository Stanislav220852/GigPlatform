from pydantic import BaseModel, EmailStr, field_validator


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    role: str
    rating: float

    class Config:
        from_attributes = True
