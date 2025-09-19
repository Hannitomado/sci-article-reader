from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


MODELS_DIR = Path(os.getenv("MODELS_DIR", "/opt/piper/models")).resolve()
TIMEOUT = int(os.getenv("PIPER_TIMEOUT_SEC", "60"))

app = FastAPI(title="Piper Sidecar", version="0.1.0")


class SynthRequest(BaseModel):
    text: str
    model_path: str
    speaker_id: Optional[int] = None
    sample_rate: Optional[int] = None
    loudness_norm: Optional[bool] = None


@app.get("/healthz")
def healthz():
    try:
        proc = subprocess.run(["piper", "--help"], capture_output=True, check=False, timeout=10)
        ok = proc.returncode == 0
        return {"status": "ok" if ok else "fail"}
    except Exception:
        return {"status": "fail"}


@app.post("/synthesize")
def synth(req: SynthRequest):
    # Validate model path inside models dir
    model = Path(req.model_path).resolve()
    try:
        model.relative_to(MODELS_DIR)
    except Exception:
        raise HTTPException(status_code=400, detail="model_path must be under /opt/piper/models")

    # Ensure paired json exists
    json_path = model.with_suffix(model.suffix + ".json") if not model.name.endswith(".onnx.json") else Path(str(model))
    if model.suffix == ".onnx" and not json_path.exists():
        alt = Path(str(model) + ".json")
        json_path = alt if alt.exists() else json_path
    if not model.exists() or not json_path.exists():
        raise HTTPException(status_code=400, detail="model .onnx and .onnx.json must exist")

    cmd = ["piper", "--model", str(model), "--output_raw", "false", "--output_file", "-", "--json_config", str(json_path)]
    if req.speaker_id is not None:
        cmd += ["--speaker", str(req.speaker_id)]
    try:
        proc = subprocess.run(cmd, input=req.text.encode("utf-8"), capture_output=True, check=False, timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="piper timeout")
    if proc.returncode != 0 or not proc.stdout:
        raise HTTPException(status_code=500, detail="piper failed")
    return app.response_class(content=proc.stdout, media_type="audio/wav")

