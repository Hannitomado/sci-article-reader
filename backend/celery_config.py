from celery import Celery

celery_app = Celery("tts_tasks")
celery_app.conf.broker_url = "redis://localhost:6379/0"
celery_app.conf.result_backend = "redis://localhost:6379/0"
celery_app.conf.task_default_queue = "audio"
