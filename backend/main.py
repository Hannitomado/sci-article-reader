from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent        # .../backend
ENV_PATH = BASE_DIR / ".env"                      # .../backend/.env
load_dotenv(ENV_PATH, override=False)

import os
import re
import sys
import json
import fitz
import tiktoken
import time
import uuid
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError(f"OPENAI_API_KEY is not set. Expected it in {ENV_PATH}")
client = OpenAI(api_key=OPENAI_API_KEY)


from fastapi import UploadFile, File, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from celery.result import AsyncResult

from .tasks import generate_audio_task
from .celery_config import celery_app
from .config import SETTINGS, ensure_dirs

app = FastAPI()

# Ensure required directories exist before mounting static
ensure_dirs()

# Upload size limit in bytes (converted from MB)
MAX_BYTES = SETTINGS.MAX_UPLOAD_MB * 1024 * 1024

app.mount(
    "/static",
    StaticFiles(directory=SETTINGS.AUDIO_OUT_DIR),
    name="static"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ArticleInput(BaseModel):
    text: str

class AudioRequest(BaseModel):
    text: str
    audio_filename: str
    article_title: str
    gender: str = "Male"

tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")

# Final cleaning step

def flatten_text(raw: str) -> str:
    # Normalize newlines
    txt = raw.replace("\r\n", "\n").replace("\r", "\n")
    # Remove hyphenation across line breaks: e.g., "exam-\nple" -> "example"
    txt = re.sub(r"(\w)-\n(\w)", r"\1\2", txt)
    # Merge single newlines into spaces (keep double-newline as paragraph break)
    txt = re.sub(r"(?<!\n)\n(?!\n)", " ", txt)
    # Collapse excessive blank lines
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    # Collapse multiple spaces
    txt = re.sub(r"[ \t]{2,}", " ", txt)
    return txt.strip()

def query_openai(text: str, extract_title=False):
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
                "🔒 RULES:\n"
                "- Do NOT summarize, rewrite, shorten, or reinterpret the meaning of the text in any way.\n"
                "- All words, phrases, and sentence structures must remain literally intact.\n"
                "- Only merge lines into full paragraphs where a break was likely visual (e.g., from a PDF).\n"
                "- Preserve section titles or headings, and include them with the paragraph they introduce.\n"
                "- Keep all original ideas in the original order.\n"
                "- No bullets, no formatting — just clean, flowing, literal text.\n"
                "- Remove author/year citations like (Nguyen, 2020) or (Taylor, 2015), but keep the sentence exactly as-is otherwise.\n"
                "- Output must be readable aloud, paragraph by paragraph.\n\n"
                "✅ GOOD EXAMPLES:\n"
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
                "📢 Your output will be split into paragraphs and read aloud. Make sure each paragraph is natural, flowing, and exactly faithful to the original meaning and tone."
            )
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print("OpenAI error:", e)
        return "Error cleaning text"

# Upload and process the article
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Read once with a hard cap
    blob = await file.read(MAX_BYTES + 1)
    if len(blob) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max {SETTINGS.MAX_UPLOAD_MB} MB.")

    name = file.filename or ""
    lower_name = name.lower()

    if lower_name.endswith(".txt"):
        try:
            raw_text = blob.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = blob.decode("utf-8", errors="ignore")
    elif lower_name.endswith(".pdf"):
        raw_text = extract_text_from_pdf(blob)
        if not raw_text or not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
    else:
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")

    print("[INFO] Flattening input text...")
    flattened_text = flatten_text(raw_text)

    print("[INFO] Running final cleaning...")
    cleaned_text = query_openai(flattened_text)

    print("[INFO] Extracting title...")
    display_title = query_openai(raw_text[:2000], extract_title=True)
    if display_title.startswith("Error") or len(display_title) > 200:
        display_title = "Untitled Article"

    paragraphs = [p.strip() for p in cleaned_text.split("\n") if p.strip()]
    article_code = f"article_{int(time.time())}_{uuid.uuid4().hex[:6]}"

    final_payload = {
        "id": article_code,
        "title": display_title,
        "paragraphs": []
    }

    for i, p in enumerate(paragraphs):
        filename = f"{article_code}_{i+1}.wav"
        task = generate_audio_task.apply_async(
            args=[p, filename, article_code, "Male"],
            queue="audio"
        )
        final_payload["paragraphs"].append({
            "text": p,
            "audio": filename,
            "task_id": task.id
        })

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
                articles.append({
                    "id": filename.replace(".json", ""),
                    "title": content.get("title", "Untitled")
                })
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
    task = generate_audio_task.delay(req.text, req.audio_filename, req.article_title, req.gender)
    return {"status": "queued", "task_id": task.id}

@app.get("/task_status/{task_id}")
def get_task_status(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    }

@app.get("/ping_celery")
def ping_test():
    task = generate_audio_task.apply_async(
        args=["hello world", "test.wav", "test_article", "Male"],
        queue="audio"
    )
    return {"status": "sent", "task_id": task.id}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        texts: list[str] = []
        for i in range(doc.page_count):
            p = doc.load_page(i)
            t = p.get_text() or ""
            if not isinstance(t, str):
                t = ""
            if len(t.strip()) < 5:
                t2 = p.get_text("text")
                if isinstance(t2, str) and t2:
                    t = t2
            texts.append(t)
        return "\n".join(texts)
    except Exception as e:
        print("[ERROR] PDF extraction failed:", e)
        return ""
