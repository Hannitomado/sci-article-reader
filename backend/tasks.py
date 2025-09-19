import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError
from .celery_config import celery_app
from .config import SETTINGS
from .tts.registry import get_provider, register_provider, list_providers
from .tts.openai_provider import OpenAITTSProvider
from .tts.piper_provider import PiperTTSProvider
from .tts.audio_utils import transcode_wav_to
from pathlib import Path
import shutil

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

_provider_failures: dict[str, int] = {}
_CIRCUIT_THRESHOLD = 3


@celery_app.task(name="tasks.generate_audio_task")
def generate_audio_task(
    text: str,
    audio_filename: str,
    article_title: str,
    gender: str = "Male",
    provider_override: str | None = None,
    voice_override: str | None = None,
):
    """Generate audio using configured TTS provider stack.

    Keeps the externally visible file name and path identical to the previous
    implementation to avoid frontend changes. Applies internal caching per
    provider to avoid redundant synthesis.
    """
    try:
        # Ensure providers are registered (idempotent)
        if get_provider("openai") is None:
            register_provider("openai", OpenAITTSProvider())
        if get_provider("piper") is None:
            try:
                register_provider("piper", PiperTTSProvider())
            except Exception as e:
                print(f"[WARN] Could not register Piper provider: {e}")

        # Resolve provider order (override short-circuits)
        if provider_override:
            order = [provider_override]
        else:
            order = [p.strip() for p in (SETTINGS.TTS_PROVIDER_ORDER or "").split(",") if p.strip()] or [SETTINGS.TTS_PROVIDER]
        # Place the configured provider first if not already
        if SETTINGS.TTS_PROVIDER and SETTINGS.TTS_PROVIDER not in order:
            order.insert(0, SETTINGS.TTS_PROVIDER)

        # Determine output path and ensure directory (respect delivery format)
        delivery_ext = (getattr(SETTINGS, "TTS_DELIVERY_FORMAT", "mp3") or "mp3").lower()
        base_name = Path(audio_filename).stem
        dest_path = Path(SETTINGS.AUDIO_OUT_DIR) / f"{base_name}.{delivery_ext}"
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        # Fast path: if destination already exists, reuse
        if dest_path.exists():
            print(f"[INFO] Reusing existing audio file: {dest_path}")
            return

        # Choose a voice hint
        voice_hint = voice_override or SETTINGS.TTS_VOICE
        if (article_title or "").lower().startswith("sv"):
            voice_hint = SETTINGS.TTS_VOICE_SV or voice_hint
        elif (article_title or "").lower().startswith("en"):
            voice_hint = SETTINGS.TTS_VOICE_EN or voice_hint

        last_error: Exception | None = None
        provider_used: str | None = None
        for name in order:
            provider = get_provider(name)
            if not provider:
                continue
            # Circuit breaker: skip provider if too many consecutive failures
            if _provider_failures.get(name, 0) >= _CIRCUIT_THRESHOLD:
                print(f"[WARN] Skipping provider '{name}' due to circuit breaker")
                continue
            try:
                print(f"[INFO] TTS provider '{name}' synthesizing...")
                # Retry once for transient errors
                try:
                    # Always request WAV master from providers; transcode after
                    tmp_path = provider.synthesize(text, voice=voice_hint, rate=SETTINGS.TTS_RATE, fmt="wav")
                except Exception as e1:  # noqa: BLE001
                    print(f"[WARN] Provider '{name}' first attempt failed, retrying once: {e1}")
                    tmp_path = provider.synthesize(text, voice=voice_hint, rate=SETTINGS.TTS_RATE, fmt="wav")

                # Transcode to delivery format if needed
                if delivery_ext != "wav":
                    ok = transcode_wav_to(tmp_path, dest_path, format=delivery_ext)
                    if not ok:
                        print("[WARN] Transcode failed or ffmpeg missing; serving WAV")
                        shutil.copyfile(tmp_path, dest_path.with_suffix(".wav"))
                        dest_path = dest_path.with_suffix(".wav")
                else:
                    shutil.copyfile(tmp_path, dest_path)
                print(f"[SUCCESS] Audio saved at {dest_path}")
                _provider_failures[name] = 0
                provider_used = name
                break
            except Exception as e:  # noqa: BLE001
                print(f"[WARN] Provider '{name}' failed: {e}")
                last_error = e
                _provider_failures[name] = _provider_failures.get(name, 0) + 1
                continue
        else:
            # No provider succeeded
            raise last_error or RuntimeError("No TTS provider available")
        return {"provider_used": provider_used or "", "path": str(dest_path)}

    except Exception as e:
        print("[ERROR] TTS generation failed:", e)
        raise e
