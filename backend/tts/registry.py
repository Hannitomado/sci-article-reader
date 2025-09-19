from __future__ import annotations

from typing import Dict
from .types import TTSEngine

_REGISTRY: Dict[str, TTSEngine] = {}


def register_provider(name: str, provider: TTSEngine) -> None:
    _REGISTRY[name.lower()] = provider


def get_provider(name: str) -> TTSEngine | None:
    return _REGISTRY.get((name or "").lower())


def list_providers() -> list[str]:
    return sorted(_REGISTRY.keys())

