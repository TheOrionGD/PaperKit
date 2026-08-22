"""PaperKit backend configuration — reads from .env"""
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    mongodb_url: str
    database_name: str = "paperkit"

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days



    # Google Gemini
    gemini_api_key: str = ""


    # Frontend
    frontend_url: str = "http://localhost:5173"

    # Firebase
    firebase_project_id: str = "paperkit-ai2026"

    # Processing tools
    libreoffice_path: str = "libreoffice"
    tesseract_cmd: str = "tesseract"
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
