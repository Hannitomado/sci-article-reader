import io
import os
from fastapi.testclient import TestClient

os.environ["MOCK_OPENAI"] = "1"  # see patch below
from backend.main import app

def test_upload_txt(tmp_path):
    client = TestClient(app)
    sample = b"Title\n\nThis is a line.\nThis continues it."
    files = {"file": ("sample.txt", io.BytesIO(sample), "text/plain")}
    r = client.post("/upload", files=files)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert len(data["paragraphs"]) >= 1
