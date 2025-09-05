# backend/celery_config.py
import os
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

def env(key: str, default: str = "") -> str:
    return os.getenv(key, default)

redis_url = env("REDIS_URL", "redis://localhost:6379/0")

broker_url = env("CELERY_BROKER_URL", redis_url)
result_backend = env("CELERY_RESULT_BACKEND", redis_url)

celery_app = Celery("tts_tasks", broker=broker_url, backend=result_backend)

# Base queue & limits
celery_app.conf.task_default_queue = env("CELERY_TASK_DEFAULT_QUEUE", "audio")

# Concurrency is set on the worker CLI, but keep as config hint:
celery_app.conf.worker_concurrency = int(env("CELERY_CONCURRENCY", "2"))

# Time limits
celery_app.conf.task_time_limit = int(env("CELERY_TASK_TIME_LIMIT_SEC", "600"))
celery_app.conf.task_soft_time_limit = int(env("CELERY_TASK_SOFT_TIME_LIMIT_SEC", "540"))

# Serialization / safety
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.broker_connection_retry_on_startup = True
