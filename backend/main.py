import os
import re
import sys
import json
import fitz
import tiktoken
import time
import uuid
import logging
from openai import OpenAI

from fastapi import UploadFile, File, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from celery.result import AsyncResult
from dotenv import load_dotenv

# Keep your existing imports/structure
from tasks import generate_audio_task
from celery_config import celery_app

# Settings import
try:
    from config import SETTINGS, ensure_dirs
except ImportError:
    from .config import SETTINGS, ensure_dirs

# Allow running as "uvicorn main:app" from backend/
sys.path.append(os.path.dirname(__file__))

# Load environment variables
load_dotenv()

# ---- Logging (env-driven) ----
logging.basicConfig(
    level=getattr(logging, SETTINGS.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("sci-article-reader")

# Code Health Test Mock OpenAI
MOCK_OPENAI = os.getenv("MOCK_OPENAI", "0") == "1"

# OpenAI client & model 
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Tokenizer (not currently used, but keeping for future limits)
try:
    tokenizer = tiktoken.encoding_for_model(OPENAI_CHAT_MODEL)
except Exception:
    tokenizer = tiktoken.get_encoding("cl100k_base")

# FastAPI app 
app = FastAPI()

# Ensure storage directories exist
ensure_dirs()

# Static mount (env-driven)
app.mount("/static", StaticFiles(directory=SETTINGS.AUDIO_OUT_DIR), name="static")

# CORS (env-driven)
app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models 
class ArticleInput(BaseModel):
    text: str

class AudioRequest(BaseModel):
    text: str
    audio_filename: str
    article_title: str
    gender: str = "Male"

# Line-flattening utility 
def flatten_text(raw: str) -> str:
    """
    Merge hard-wrapped lines into paragraphs while preserving blank-line paragraph breaks.
    - Collapses multiple spaces/tabs.
    - Joins lines within a paragraph with a single space.
    - Preserves hyphenated line-break joins like 'transfor-\n mation' -> 'transformation'.
    """
    lines = raw.splitlines()
    paragraphs = []
    buf = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if buf:
                paragraphs.append(" ".join(buf))
                buf = []
        else:
            if buf and buf[-1].endswith("-"):
                # join hyphenated breaks without a space
                buf[-1] = buf[-1][:-1] + stripped
            else:
                buf.append(re.sub(r"\s+", " ", stripped))
    if buf:
        paragraphs.append(" ".join(buf))

    return "\n\n".join(paragraphs)

# OpenAI cleaning / title extraction 
def query_openai(text: str, extract_title: bool = False) -> str:
    if MOCK_OPENAI:
        return "Mock Title" if extract_title else text
    try:
        if extract_title:
            system_prompt = (
                "Your task is to extract the title of the document. "
                "Return ONLY the most likely document title as a single line. "
                "Do not include author names, introductions, or explanations. "
                "Return just the title as it appears."
            )
        else:
            system_prompt = (
                "You are a document cleaner preparing text for high-quality paragraph-based audio narration.\n"
                "Your task is to preserve the original text *exactly as written*, while reflowing broken lines and removing citation clutter.\n\n"
                "RULES:\n"
                "- Do NOT summarize, rewrite, shorten, or reinterpret the meaning of the text in any way.\n"
                "- All words, phrases, and sentence structures must remain literally intact.\n"
                "- Only merge lines into full paragraphs where a break was likely visual (e.g., from a PDF).\n"
                "- Preserve section titles or headings, and include them with the paragraph they introduce.\n"
                "- Keep all original ideas in the original order.\n"
                "- No bullets, no formatting — just clean, flowing, literal text.\n"
                "- Remove author/year citations like (Nguyen, 2020) or (Taylor, 2015), but keep the sentence exactly as-is otherwise.\n"
                "- Output must be readable aloud, paragraph by paragraph.\n\n"
                "GOOD EXAMPLES:\n"
                "1. Input:\n"
                "Introduction\n"
                "In this article, we will explore the topic of consent in modern play spaces.\n\n"
                "Output:\n"
                "Introduction In this article, we will explore the topic of consent in modern play spaces.\n\n"
                "2. Input:\n"
                "- Welcome visitors to the space.\n"
                "- Ensure they are in a grounded mental state.\n\n"
                "Output:\n"
                "Welcome visitors to the space. Ensure they are in a grounded mental state.\n\n"
                "3. Input:\n"
                "To support this, I draw from Nguyen's theory of games as agential art, especially as outlined in Chapters 6 and 7 of Games: Agency as Art (Nguyen, 2020), and examine how these ideas map onto real-world gaming practices.\n\n"
                "Output:\n"
                "To support this, I draw from Nguyen's theory of games as agential art, especially as outlined in Chapters 6 and 7 of Games: Agency as Art, and examine how these ideas map onto real-world gaming practices.\n\n"
                "4. Input:\n"
                "As discussed in the literature on digital agency (Taylor, 2015), the sense of self within online platforms is always in flux.\n\n"
                "Output:\n"
                "As discussed in the literature on digital agency, the sense of self within online platforms is always in flux.\n\n"
                "Your output will be split into paragraphs and read aloud. Make sure each paragraph is natural, flowing, and exactly faithful to the original meaning and tone."
            )

        resp = client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.2,
            max_tokens=1500,
        )
        return resp.choices[0].message.content.strip()

    except Exception as e:
        log.exception("OpenAI error")
        return "Error cleaning text"

# ---- Routes ----
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.filename.endswith(".txt"):
        contents = await file.read()
        raw_text = contents.decode("utf-8")
    elif file.filename.endswith(".pdf"):
        doc = fitz.open(stream=await file.read(), filetype="pdf")
        raw_text = "\n".join([page.get_text() for page in doc])
    else:
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")

    log.info("Flattening input text…")
    flattened_text = flatten_text(raw_text)

    log.info("Running final cleaning…")
    cleaned_text = query_openai(flattened_text)

    log.info("Extracting title…")
    display_title = query_openai(raw_text[:2000], extract_title=True)
    if display_title.startswith("Error") or len(display_title) > 200:
        display_title = "Untitled Article"

    paragraphs = [p.strip() for p in cleaned_text.split("\n") if p.strip()]
    article_code = f"article_{int(time.time())}_{uuid.uuid4().hex[:6]}"

    final_payload = {
        "id": article_code,
        "title": display_title,
        "paragraphs": [],
    }

    for i, p in enumerate(paragraphs):
        filename = f"{article_code}_{i+1}.wav"
        task = generate_audio_task.apply_async(
            args=[p, filename, article_code, "Male"],
            queue="audio",
        )
        final_payload["paragraphs"].append(
            {"text": p, "audio": filename, "task_id": task.id}
        )

    with open(os.path.join(SETTINGS.CLEANED_DIR, f"{article_code}.json"), "w", encoding="utf-8") as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)

    return final_payload

@app.get("/api/articles")
def list_articles():
    articles = []
    for filename in os.listdir(SETTINGS.CLEANED_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(SETTINGS.CLEANED_DIR, filename), "r", encoding="utf-8") as f:
                content = json.load(f)
                articles.append(
                    {
                        "id": filename.replace(".json", ""),
                        "title": content.get("title", "Untitled"),
                    }
                )
    return articles

@app.get("/api/article/{article_id}")
def get_article(article_id: str):
    path = os.path.join(SETTINGS.CLEANED_DIR, f"{article_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Article not found")
    with open(path, "r", encoding="utf-8") as f:
        content = json.load(f)
    return JSONResponse(content=content)

@app.delete("/api/article/{article_id}")
def delete_article(article_id: str):
    path = os.path.join(SETTINGS.CLEANED_DIR, f"{article_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return {"status": "deleted"}
    return {"error": "File not found"}

@app.post("/generate_audio/")
def generate_audio(req: AudioRequest):
    task = generate_audio_task.delay(
        req.text, req.audio_filename, req.article_title, req.gender
    )
    return {"status": "queued", "task_id": task.id}

@app.get("/task_status/{task_id}")
def get_task_status(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }

@app.get("/ping_celery")
def ping_test():
    task = generate_audio_task.apply_async(
        args=["hello world", "test.wav", "test_article", "Male"],
        queue="audio",
    )
    return {"status": "sent", "task_id": task.id}

# Optional: quick health endpoint
@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": os.getenv("ENV", "dev"),
        "audio_out_dir": SETTINGS.AUDIO_OUT_DIR,
        "cleaned_dir": SETTINGS.CLEANED_DIR,
    }
