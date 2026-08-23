"""PaperKit backend configuration — reads from .env"""
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


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
    groq_vision_model: str = ""

    # Frontend
    frontend_url: str = "https://paperkit-web.onrender.com"

    # PDF Rectification & Positional Engine Configuration
    pdf_editor_engine: str = "positional"
    pdf_editor_legacy_fallback: bool = False
    pdf_preserve_page_geometry: bool = True
    pdf_preserve_fonts: bool = True
    pdf_preserve_images: bool = True

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
