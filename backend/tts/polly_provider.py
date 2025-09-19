from __future__ import annotations

from pathlib import Path
from typing import Optional

from .types import TTSEngine


class PollyTTSProvider(TTSEngine):
    """Stub provider for Amazon Polly.

    Configure via env:
      - POLLY_REGION
      - POLLY_ACCESS_KEY_ID / POLLY_SECRET_ACCESS_KEY
      - POLLY_VOICE_ID
      - POLLY_ENGINE = standard|neural

    Pricing and usage considerations apply; see AWS documentation. This stub
    is prepared for future enablement and does not perform synthesis yet.
    """

    name = "polly"

    def __init__(self, cache_dir: Optional[Path] = None) -> None:  # noqa: D401
        self._cache_dir = cache_dir

    def synthesize(self, text: str, *, voice: str | None, rate: int | None, fmt: str = "wav") -> Path:
        raise NotImplementedError("Polly provider not yet implemented")

