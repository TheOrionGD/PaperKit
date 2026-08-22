"""Pydantic models for File"""
from datetime import timezone, datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class FileInDB(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    original_filename: str
    content_type: str
    size: int
    page_count: Optional[int] = None
    storage_url: str           # Local path
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class FileOut(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size: int
    page_count: Optional[int] = None
    created_at: datetime
