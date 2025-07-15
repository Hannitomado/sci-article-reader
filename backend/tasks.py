import os
from celery import Celery
from celery_config import celery_app
from TTS.api import TTS

celery_app = Celery(
    "tts_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

# Load the TTS model only once
tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)

@celery_app.task(name="tasks.generate_audio_task", bind=True)
def generate_audio_task(self, text: str, audio_filename: str, article_title: str):
    try:
        output_dir = os.path.join("static")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, audio_filename)
        tts.tts_to_file(text=text, file_path=output_path)
        return output_path
    except Exception as e:
        print(f"Audio generation failed: {e}")
        raise e
