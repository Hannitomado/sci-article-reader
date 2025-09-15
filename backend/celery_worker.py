import sys
import os

# Ensure project root is on sys.path so we can import the package `backend`
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.celery_config import celery_app
import backend.tasks  # Required to register tasks
