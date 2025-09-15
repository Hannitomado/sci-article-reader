import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from .celery_config import celery_app
from .config import SETTINGS

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=False)

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    """Create the OpenAI client on first use, then reuse it."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set in the environment")
        _client = OpenAI(api_key=api_key)
    return _client

@celery_app.task(name="tasks.generate_audio_task")
def generate_audio_task(text: str, audio_filename: str, article_title: str, gender: str = "Male"):
    try:
        voice = "onyx" if gender.lower() == "male" else "shimmer"
        print(f"[INFO] Generating audio with voice: {voice}")

        client = get_openai_client()

        # Call OpenAI TTS
        response = client.audio.speech.create(
            model="tts-1",  # or "tts-1-hd"
            voice=voice,
            input=text
        )

        filepath = os.path.join(SETTINGS.AUDIO_OUT_DIR, audio_filename)
        with open(filepath, "wb") as f:
            f.write(response.read())

        print(f"[SUCCESS] Audio saved at {filepath}")

    except Exception as e:
        print("[ERROR] TTS generation failed:", e)
        raise e
