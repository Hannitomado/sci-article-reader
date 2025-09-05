# backend/config.py
import os
from typing import List
from dotenv import load_dotenv

# Load .env once
load_dotenv()

BASE_DIR = os.path.dirname(__file__)

def env(key: str, default: str = "") -> str:
    return os.getenv(key, default)

class Settings:
    # App / loggin
    ENV: str = env("ENV", "dev")
    LOG_LEVEL: str = env("LOG_LEVEL", "INFO")

    # Paths 
    AUDIO_OUT_DIR: str = os.path.join(BASE_DIR, env("AUDIO_OUT_DIR", "static"))
    CLEANED_DIR: str = os.path.join(BASE_DIR, env("CLEANED_DIR", "cleaned"))
    UPLOAD_TMP_DIR: str = os.path.join(BASE_DIR, env("UPLOAD_TMP_DIR", "tmp"))

    # CORS
    CORS_ORIGINS: List[str] = [
        o.strip() for o in env("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]

SETTINGS = Settings()

def ensure_dirs() -> None:
    for d in (SETTINGS.AUDIO_OUT_DIR, SETTINGS.CLEANED_DIR, SETTINGS.UPLOAD_TMP_DIR):
        os.makedirs(d, exist_ok=True)