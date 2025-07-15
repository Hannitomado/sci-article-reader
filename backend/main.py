import os
import sys
import json
import fitz
import tiktoken
import re
from openai import OpenAI

from fastapi import UploadFile, File, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from celery.result import AsyncResult
from dotenv import load_dotenv

from tasks import generate_audio_task
from celery_config import celery_app

sys.path.append(os.path.dirname(__file__))

# Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Serve static files (audio)
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")),
    name="static"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

# Tokenizer
tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")

# Chunk by headings/chapters
def chunk_by_headings(text: str, max_tokens=3000):
    sections = re.split(r"(?<=\n)(\d{1,2}\..+|[A-Z][A-Z\s]{3,}|#{1,3} .+)(?=\n)", text)
    grouped = []
    i = 0
    while i < len(sections):
        if i + 1 < len(sections):
            grouped.append(sections[i] + sections[i + 1])
            i += 2
        else:
            grouped.append(sections[i])
            i += 1

    chunks = []
    current_chunk = ""
    token_count = 0

    for section in grouped:
        section_tokens = len(tokenizer.encode(section))
        if token_count + section_tokens > max_tokens:
            chunks.append(current_chunk.strip())
            current_chunk = section
            token_count = section_tokens
        else:
            current_chunk += "\n" + section
            token_count += section_tokens

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks

# OpenAI cleaning
def query_openai(text: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that prepares academic text for text-to-speech narration. "
                        "Remove all in-text citations like (Smith, 2020), figure references, and table mentions. "
                        "Do not summarize. Return the cleaned version of the text."
                    )
                },
                {"role": "user", "content": text}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("OpenAI error:", e)
        return "Error cleaning text"

# Upload, clean, and trigger audio
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

    chunks = chunk_by_headings(raw_text)
    cleaned_chunks = []

    for chunk in chunks:
        cleaned = query_openai(chunk)
        if cleaned.startswith("Error"):
            raise HTTPException(status_code=500, detail="Text cleaning failed.")
        cleaned_chunks.append(cleaned)

    cleaned_full = "\n\n".join(cleaned_chunks)
    paragraphs = [p.strip() for p in cleaned_full.split("\n") if p.strip()]
    article_title = os.path.splitext(file.filename)[0]

    final_payload = {
        "title": article_title,
        "paragraphs": []
    }

    for i, p in enumerate(paragraphs):
        filename = f"{article_title}_{i+1}.wav"
        task = generate_audio_task.apply_async(
            args=[p, filename, article_title],
            queue="audio"
        )

        final_payload["paragraphs"].append({
            "text": p,
            "audio": filename,
            "task_id": task.id
        })

    with open("cleaned_article.json", "w", encoding="utf-8") as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)

    return final_payload

@app.get("/api/cleaned-article")
def get_cleaned_article():
    try:
        with open("cleaned_article.json", "r", encoding="utf-8") as f:
            content = json.load(f)
        return JSONResponse(content)
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate_audio/")
def generate_audio(req: AudioRequest):
    task = generate_audio_task.delay(req.text, req.audio_filename, req.article_title)
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
        args=["hello world", "test.wav", "test_article"],
        queue="audio"
    )
    return {"status": "sent", "task_id": task.id}
