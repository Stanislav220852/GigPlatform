from pydantic import BaseModel, EmailStr, field_validator
from .user import UserResponse


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "client"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("client", "contractor"):
            raise ValueError("Role must be 'client' or 'contractor'")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse