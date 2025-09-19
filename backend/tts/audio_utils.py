from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Optional

from ..config import SETTINGS


def transcode_wav_to(
    wav_path: Path,
    out_path: Path,
    *,
    format: str = "mp3",
    bitrate: str = "160k",
    sample_rate: int = 24000,
) -> bool:
    """Transcode WAV to delivery format using ffmpeg. Returns True on success."""
    ffmpeg = getattr(SETTINGS, "FFMPEG_PATH", "ffmpeg")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if format == "mp3":
        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            "-b:a",
            bitrate,
            str(out_path),
        ]
    elif format == "ogg":
        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            str(out_path),
        ]
    else:
        return False
    try:
        proc = subprocess.run(cmd, capture_output=True, check=False)
        return proc.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0
    except FileNotFoundError:
        return False

