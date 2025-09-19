from __future__ import annotations

from pathlib import Path
from typing import Protocol


class TTSEngine(Protocol):
    """Pluggable TTS engine interface.

    Implementations should synthesize audio for the given text and return
    a Path to a local audio file. Implementations may apply internal caching.
    """

    name: str  # provider name identifier

    def synthesize(
        self,
        text: str,
        *,
        voice: str | None,
        rate: int | None,
        fmt: str = "wav",
    ) -> Path:
        ...

