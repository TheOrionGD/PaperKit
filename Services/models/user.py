"""Pydantic models for User"""
from datetime import timezone, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class UserBase(BaseModel):
    name: str
    email: EmailStr
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = {
        "dark_mode": False,
        "default_view": "list",
        "language": "en"
    }


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    hashed_password: Optional[str] = None  # None for OAuth/Firebase users
    oauth_provider: Optional[str] = None
    oauth_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class UserOut(UserBase):
    id: str
    created_at: datetime
    avatar_url: Optional[str] = None
