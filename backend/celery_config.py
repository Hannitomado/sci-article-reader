import os
from pathlib import Path
from dotenv import load_dotenv
from celery import Celery
from packaging.version import Version, InvalidVersion

# Load env from backend/.env deterministically
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=False)

celery_app = Celery("tts_tasks")

# Ensure redis client library is present and compatible (clear error early)
try:
    import redis as _redis
except Exception as e:
    raise RuntimeError(
        "Missing Python Redis client. Install with: pip install \"celery[redis]==5.5.3\" or \"redis>=5,<6\""
    ) from e

_ver_str = getattr(_redis, "__version__", "0")
try:
    _ver = Version(_ver_str)
except InvalidVersion:
    _ver = Version("0")

if not (Version("5.0.0") <= _ver < Version("6.0.0")):
    raise RuntimeError(
        f"Incompatible redis client version: {_ver_str}. Require >=5,<6. Install a compatible version."
    )

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app.conf.broker_url = redis_url
celery_app.conf.result_backend = redis_url
celery_app.conf.task_default_queue = "audio"

# Ensure tasks are imported so the worker registers them
celery_app.conf.include = ["backend.tasks"]
