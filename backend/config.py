from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

from dotenv import load_dotenv


# Resolve backend directory and load .env once from a deterministic path
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=False)


def _parse_cors(origins_env: str | None) -> List[str]:
    default = ["http://localhost:3000"]
    if not origins_env:
        return default
    parts = [p.strip() for p in origins_env.split(",")]
    parts = [p for p in parts if p]
    return parts or default


def _abs_under_base(relative_or_abs: str, *, base: Path) -> str:
    p = Path(relative_or_abs)
    if not p.is_absolute():
        p = base / p
    return str(p.resolve())


@dataclass(frozen=True)
class _Settings:
    # Environment and logging
    ENV: str
    LOG_LEVEL: str

    # CORS
    CORS_ORIGINS: List[str]

    # Directories (absolute)
    AUDIO_OUT_DIR: str
    CLEANED_DIR: str
    UPLOAD_TMP_DIR: str

    # Limits and misc
    MAX_UPLOAD_MB: int

    # Optional (unused for now)
    OPENAI_CHAT_MODEL: str
    TTS_MODEL: str
    TTS_VOICE: str
    TTS_FORMAT: str
    TTS_SAMPLE_RATE: int


def _build_settings() -> _Settings:
    env = os.getenv("ENV", "dev")
    log_level = os.getenv("LOG_LEVEL", "INFO")

    cors_origins = _parse_cors(os.getenv("CORS_ORIGINS"))

    audio_out_dir = _abs_under_base(os.getenv("AUDIO_OUT_DIR", "static"), base=BASE_DIR)
    cleaned_dir = _abs_under_base(os.getenv("CLEANED_DIR", "cleaned"), base=BASE_DIR)
    upload_tmp_dir = _abs_under_base(os.getenv("UPLOAD_TMP_DIR", "tmp"), base=BASE_DIR)

    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "20"))

    openai_chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
    # Prefer the newer unified TTS model by default
    tts_model = os.getenv("TTS_MODEL", "gpt-4o-mini-tts")
    tts_voice = os.getenv("TTS_VOICE", "onyx")
    tts_format = os.getenv("TTS_FORMAT", "wav")
    tts_sample_rate = int(os.getenv("TTS_SAMPLE_RATE", "22050"))

    return _Settings(
        ENV=env,
        LOG_LEVEL=log_level,
        CORS_ORIGINS=cors_origins,
        AUDIO_OUT_DIR=audio_out_dir,
        CLEANED_DIR=cleaned_dir,
        UPLOAD_TMP_DIR=upload_tmp_dir,
        MAX_UPLOAD_MB=max_upload_mb,
        OPENAI_CHAT_MODEL=openai_chat_model,
        TTS_MODEL=tts_model,
        TTS_VOICE=tts_voice,
        TTS_FORMAT=tts_format,
        TTS_SAMPLE_RATE=tts_sample_rate,
    )


SETTINGS = _build_settings()


def ensure_dirs() -> None:
    """Create required directories if they don't exist."""
    for d in (SETTINGS.AUDIO_OUT_DIR, SETTINGS.CLEANED_DIR, SETTINGS.UPLOAD_TMP_DIR):
        os.makedirs(d, exist_ok=True)
