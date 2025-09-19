from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from ..config import SETTINGS
from .types import TTSEngine
from .utils import cache_key
from .openai_client import get_openai_client  # reuse client factory without circular import
from openai import OpenAIError


class OpenAITTSProvider(TTSEngine):
    name = "openai"

    def __init__(self, cache_dir: Optional[Path] = None) -> None:
        base = Path(SETTINGS.AUDIO_OUT_DIR)
        self._cache_dir = Path(cache_dir) if cache_dir else (base / "_cache" / self.name)
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def synthesize(self, text: str, *, voice: str | None, rate: int | None, fmt: str = "wav") -> Path:
        # Compute cache path
        key = cache_key(
            text=text,
            provider=self.name,
            voice=voice or SETTINGS.TTS_VOICE,
            rate=rate or SETTINGS.TTS_RATE,
            delivery_format=fmt or SETTINGS.TTS_FORMAT,
            engine_version="openai-v1",
        )
        out = self._cache_dir / f"{key}.{fmt or 'wav'}"
        if out.exists():
            return out

        client = get_openai_client()

        # Choose model and voice similar to existing behavior
        def _voice_for(model: str, g: str | None) -> str:
            gm = (g or "").lower()
            if model.startswith("gpt-4o-mini-tts"):
                return "alloy" if gm == "male" else "verse"
            return "onyx" if gm == "male" else "shimmer"

        tried: list[str] = []
        model_candidates = [getattr(SETTINGS, "TTS_MODEL", None), "gpt-4o-mini-tts", "tts-1"]
        for model in dict.fromkeys(model_candidates):
            if not model:
                continue
            tried.append(model)
            v = _voice_for(model, voice or SETTINGS.TTS_VOICE)
            try:
                # Streaming helper preferred
                with client.audio.speech.with_streaming_response.create(
                    model=model,
                    voice=v,
                    input=text,
                ) as response:
                    response.stream_to_file(str(out))
                return out
            except AttributeError:
                # Fallback to non-streaming
                try:
                    result = client.audio.speech.create(
                        model=model,
                        voice=v,
                        input=text,
                    )
                    data = result if isinstance(result, (bytes, bytearray)) else getattr(result, "content", None)
                    if data is None:
                        data = result.read() if hasattr(result, "read") else None
                    if not data:
                        raise RuntimeError("TTS API returned no audio data")
                    out.write_bytes(data)
                    return out
                except OpenAIError as oe:
                    msg = str(oe).lower()
                    if "invalid model" in msg:
                        continue
                    raise
            except OpenAIError as oe:
                msg = str(oe).lower()
                if "invalid model" in msg:
                    continue
                raise

        raise RuntimeError(f"No supported OpenAI TTS model available. Tried: {tried}")
