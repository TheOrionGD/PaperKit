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



    # AI Providers
    gemini_api_key: str = ""
    groq_api_key: str = ""
    groq_text_model: str = "openai/gpt-oss-120b"
    groq_vision_model: str = "llama-3.2-11b-vision-preview"

    # Frontend
    frontend_url: str = "https://paperkit-web.onrender.com"

    # Firebase
    firebase_project_id: str = "paperkit-ai2026"

    # Processing tools
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
