from __future__ import annotations

import hashlib


def cache_key(
    *,
    text: str,
    provider: str,
    voice: str | None,
    rate: int | None,
    delivery_format: str,
    engine_version: str,
) -> str:
    norm = "|".join([
        (text or "").replace("\r\n", "\n").strip(),
        provider or "",
        voice or "",
        str(rate or 0),
        delivery_format or "wav",
        engine_version or "v1",
    ])
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()

