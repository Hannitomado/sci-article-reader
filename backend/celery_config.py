import os
from pathlib import Path
from dotenv import load_dotenv
from celery import Celery

# Load env from backend/.env deterministically
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=False)

celery_app = Celery("tts_tasks")

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app.conf.broker_url = redis_url
celery_app.conf.result_backend = redis_url
celery_app.conf.task_default_queue = "audio"

# Ensure tasks are imported so the worker registers them
celery_app.conf.include = ["backend.tasks"]
