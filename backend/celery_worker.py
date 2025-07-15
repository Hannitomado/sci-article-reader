import sys
import os

sys.path.append(os.path.dirname(__file__))

from celery_config import celery_app
import tasks  # Required to register tasks
