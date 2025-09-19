from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict


@dataclass(frozen=True)
class Voice:
    id: str
    provider: str  # "piper" for now
    label: str
    model_path: str  # container path, e.g., /opt/piper/models/.../en_US-lessac-medium.onnx
    speaker_id: Optional[int] = None
    language: str = "en"
    gender: Optional[str] = None
    license: Optional[str] = None
    notes: Optional[str] = None


_VOICES: Dict[str, Voice] = {}


def _register(v: Voice) -> None:
    _VOICES[v.id] = v


# Static English voices (adjust to your models under /opt/piper/models)
_register(
    Voice(
        id="en_us_m_lessac_med",
        provider="piper",
        label="EN US (male) Lessac Medium",
        model_path="/opt/piper/models/en/en_US/lessac/en_US-lessac-medium.onnx",
        language="en",
        gender="male",
        license="See model card",
    )
)
_register(
    Voice(
        id="en_us_f_kristin_med",
        provider="piper",
        label="EN US (female) Kristin Medium",
        model_path="/opt/piper/models/en/en_US/kristin/en_US-kristin-medium.onnx",
        language="en",
        gender="female",
        license="See model card",
    )
)
_register(
    Voice(
        id="en_gb_f_alba_med",
        provider="piper",
        label="EN GB (female) Alba Medium",
        model_path="/opt/piper/models/en/en_GB/alba/en_GB-alba-medium.onnx",
        language="en",
        gender="female",
        license="See model card",
    )
)
_register(
    Voice(
        id="en_gb_f_jenny_med",
        provider="piper",
        label="EN GB (female) Jenny Dioco Medium",
        model_path="/opt/piper/models/en/en_GB/jenny_dioco/en_GB-jenny_dioco-medium.onnx",
        language="en",
        gender="female",
        license="See model card",
    )
)


def list_voices() -> Dict[str, Voice]:
    return dict(_VOICES)


def resolve_voice(lang: str = "en", gender: Optional[str] = None, preferred_id: Optional[str] = None) -> Voice:
    if preferred_id and preferred_id in _VOICES:
        return _VOICES[preferred_id]
    # Simple resolution: pick first that matches language/gender
    for v in _VOICES.values():
        if v.language == lang and (gender is None or v.gender == gender):
            return v
    # Fallback to any
    return next(iter(_VOICES.values()))

