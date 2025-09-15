import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError
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
        client = get_openai_client()

        # Determine output path and ensure directory
        filepath = os.path.join(SETTINGS.AUDIO_OUT_DIR, audio_filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        def _voice_for(model: str, g: str) -> str:
            gm = (g or "").lower()
            if model.startswith("gpt-4o-mini-tts"):
                return "alloy" if gm == "male" else "verse"
            return "onyx" if gm == "male" else "shimmer"

        # Try configured model first, then fallbacks
        tried: list[str] = []
        for model in dict.fromkeys([getattr(SETTINGS, "TTS_MODEL", None), "gpt-4o-mini-tts", "tts-1"]):
            if not model:
                continue
            tried.append(model)
            voice = _voice_for(model, gender)
            print(f"[INFO] Generating audio: model={model} voice={voice}")
            try:
                # Prefer streaming API
                with client.audio.speech.with_streaming_response.create(
                    model=model,
                    voice=voice,
                    input=text,
                ) as response:
                    response.stream_to_file(filepath)
                break
            except AttributeError:
                # Fallback for clients without streaming helper
                try:
                    result = client.audio.speech.create(
                        model=model,
                        voice=voice,
                        input=text,
                    )
                    data = result if isinstance(result, (bytes, bytearray)) else getattr(result, "content", None)
                    if data is None:
                        data = result.read() if hasattr(result, "read") else None
                    if not data:
                        raise RuntimeError("TTS API returned no audio data")
                    with open(filepath, "wb") as f:
                        f.write(data)
                    break
                except OpenAIError as oe:
                    msg = str(oe).lower()
                    if "invalid model" in msg:
                        print(f"[WARN] Invalid TTS model '{model}', trying next if available...")
                        continue
                    raise
            except OpenAIError as oe:
                msg = str(oe).lower()
                if "invalid model" in msg:
                    print(f"[WARN] Invalid TTS model '{model}', trying next if available...")
                    continue
                raise
        else:
            raise RuntimeError(f"No supported TTS model available. Tried: {tried}")

        print(f"[SUCCESS] Audio saved at {filepath}")

    except Exception as e:
        print("[ERROR] TTS generation failed:", e)
        raise e
