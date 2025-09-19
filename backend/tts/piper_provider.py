from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import httpx

from ..config import SETTINGS
from .voices import resolve_voice
from .types import TTSEngine
from .utils import cache_key


class PiperTTSProvider(TTSEngine):
    name = "piper"

    def __init__(self, cache_dir: Optional[Path] = None) -> None:
        base = Path(SETTINGS.AUDIO_OUT_DIR)
        self._cache_dir = Path(cache_dir) if cache_dir else (base / "_cache" / self.name)
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def synthesize(self, text: str, *, voice: str | None, rate: int | None, fmt: str = "wav") -> Path:
        # Resolve voice id to model path (HTTP) or use model path from env (CLI)
        v = resolve_voice(lang="en", preferred_id=voice)  # Extend for language routing as needed
        out_fmt = "wav"
        key = cache_key(
            text=text,
            provider=self.name,
            voice=v.id,
            rate=rate or 0,
            delivery_format=out_fmt,
            engine_version="piper-v1",
        )
        out = self._cache_dir / f"{key}.{out_fmt}"
        if out.exists():
            return out

        mode = (SETTINGS.PIPER_MODE or "HTTP").upper()
        timeout = max(5, int(getattr(SETTINGS, "PIPER_TIMEOUT_SEC", 60)))

        if mode == "HTTP":
            url = SETTINGS.PIPER_URL.rstrip("/") + "/synthesize"
            payload = {"text": text, "model_path": v.model_path}
            with httpx.Client(timeout=timeout) as client:
                r = client.post(url, json=payload)
                r.raise_for_status()
                out.write_bytes(r.content)
            return out

        # CLI mode
        model_path = SETTINGS.PIPER_MODEL_PATH or v.model_path
        if not model_path:
            raise RuntimeError("PIPER_MODEL_PATH is required for CLI mode")
        piper_bin = getattr(SETTINGS, "PIPER_BIN", "piper") or "piper"
        model_path_str = str(model_path)
        # Try to locate a paired JSON config (e.g., en_US-voice.onnx.json)
        try:
            mp = Path(model_path_str)
            json_path = mp.with_suffix(mp.suffix + ".json")
        except Exception:
            json_path = None

        cmd = [
            piper_bin,
            "--model",
            model_path_str,
            "--output_raw",
            "false",
            "--output_file",
            str(out),
        ]
        if json_path and Path(json_path).exists():
            cmd += ["--json_config", str(json_path)]
        # Piper CLI reads from stdin by default
        proc = subprocess.run(cmd, input=text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
        if proc.returncode != 0:
            raise RuntimeError(f"piper CLI failed: {proc.stderr.decode(errors='ignore')}")
        if not out.exists() or out.stat().st_size == 0:
            raise RuntimeError("piper produced no audio")
        return out
