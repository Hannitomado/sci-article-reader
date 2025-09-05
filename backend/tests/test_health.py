import os
from fastapi.testclient import TestClient

# Important to import after setting env if needed
from backend.main import app

def test_health():
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
