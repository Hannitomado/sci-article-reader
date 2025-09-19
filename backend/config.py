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
    # Encoding / tools
    FFMPEG_PATH: str
    # New TTS plumbing
    TTS_PROVIDER: str
    TTS_PROVIDER_ORDER: str
    TTS_RATE: int
    TTS_VOICE_EN: str
    TTS_VOICE_SV: str
    # Piper
    PIPER_MODE: str
    PIPER_URL: str
    PIPER_MODEL_PATH: str
    PIPER_DEFAULT_VOICE: str
    PIPER_TIMEOUT_SEC: int
    PIPER_BIN: str
    # Delivery
    TTS_DELIVERY_FORMAT: str
    TTS_KEEP_WAV_MASTER: bool
    TTS_ENCODER_OFFSET_MS: int

    # Strict cleaning and chunking
    STRICT_MODE: bool
    USE_LLM_TITLE: bool
    REMOVE_CITATIONS: bool
    CHUNK_CHAR_LIMIT: int


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
    ffmpeg_path = os.getenv("FFMPEG_PATH", "ffmpeg")
    # New TTS plumbing defaults (use openai by default to preserve behavior)
    tts_provider = os.getenv("TTS_PROVIDER", "openai")
    tts_provider_order = os.getenv("TTS_PROVIDER_ORDER", "openai")
    tts_rate = int(os.getenv("TTS_RATE", "0"))
    tts_voice_en = os.getenv("TTS_VOICE_EN", "onyx")
    tts_voice_sv = os.getenv("TTS_VOICE_SV", "sv-SE-nst")
    # Piper
    piper_mode = os.getenv("PIPER_MODE", "HTTP").upper()
    piper_url = os.getenv("PIPER_URL", "http://localhost:5000")
    piper_model_path = os.getenv("PIPER_MODEL_PATH", "")
    piper_default_voice = os.getenv("PIPER_DEFAULT_VOICE", "sv-SE-nst")
    piper_timeout = int(os.getenv("PIPER_TIMEOUT_SEC", "60"))
    piper_bin = os.getenv("PIPER_BIN", "piper")
    # Delivery / encoding
    tts_delivery_format = os.getenv("TTS_DELIVERY_FORMAT", "mp3").lower()
    keep_wav_master = str(os.getenv("TTS_KEEP_WAV_MASTER", "false")).strip().lower() in {"1","true","yes","on"}
    encoder_offset_ms = int(os.getenv("TTS_ENCODER_OFFSET_MS", "0"))

    def _get_bool(name: str, default: bool) -> bool:
        val = os.getenv(name)
        if val is None:
            return default
        return str(val).strip().lower() in {"1", "true", "yes", "on"}

    strict_mode = _get_bool("STRICT_MODE", True)
    use_llm_title = _get_bool("USE_LLM_TITLE", False)
    remove_citations = _get_bool("REMOVE_CITATIONS", False)
    chunk_char_limit = int(os.getenv("CHUNK_CHAR_LIMIT", "1400"))

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
        FFMPEG_PATH=ffmpeg_path,
        TTS_PROVIDER=tts_provider,
        TTS_PROVIDER_ORDER=tts_provider_order,
        TTS_RATE=tts_rate,
        TTS_VOICE_EN=tts_voice_en,
        TTS_VOICE_SV=tts_voice_sv,
        PIPER_MODE=piper_mode,
        PIPER_URL=piper_url,
        PIPER_MODEL_PATH=piper_model_path,
        PIPER_DEFAULT_VOICE=piper_default_voice,
        PIPER_TIMEOUT_SEC=piper_timeout,
        PIPER_BIN=piper_bin,
        TTS_DELIVERY_FORMAT=tts_delivery_format,
        TTS_KEEP_WAV_MASTER=keep_wav_master,
        TTS_ENCODER_OFFSET_MS=encoder_offset_ms,
        STRICT_MODE=strict_mode,
        USE_LLM_TITLE=use_llm_title,
        REMOVE_CITATIONS=remove_citations,
        CHUNK_CHAR_LIMIT=chunk_char_limit,
    )


SETTINGS = _build_settings()


def ensure_dirs() -> None:
    """Create required directories if they don't exist."""
    for d in (SETTINGS.AUDIO_OUT_DIR, SETTINGS.CLEANED_DIR, SETTINGS.UPLOAD_TMP_DIR):
        os.makedirs(d, exist_ok=True)
