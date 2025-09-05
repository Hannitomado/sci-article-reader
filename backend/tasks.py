import os
import time
import shutil
from celery import Celery
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Set up Celery
celery_app = Celery(
    "tts_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

# Directory to save audio
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@celery_app.task(name="tasks.generate_audio_task")
def generate_audio_task(text: str, audio_filename: str, article_title: str, gender: str = "Male"):
    try:
        voice = "onyx" if gender.lower() == "male" else "shimmer"

        print(f"[INFO] Generating audio with voice: {voice}")

        # Call OpenAI TTS
        response = client.audio.speech.create(
            model="tts-1",  # or "tts-1-hd"
            voice=voice,
            input=text
        )

        filepath = os.path.join(STATIC_DIR, audio_filename)
        with open(filepath, "wb") as f:
            f.write(response.read())

        print(f"[SUCCESS] Audio saved at {filepath}")

    except Exception as e:
        print("[ERROR] TTS generation failed:", e)
        raise e
