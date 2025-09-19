FROM rhasspy/piper:latest

# Minimal HTTP wrapper around Piper CLI
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir fastapi "uvicorn[standard]"

WORKDIR /app
COPY server.py /app/server.py

ENV PIPER_MODE=CLI \
    PIPER_TIMEOUT_SEC=60 \
    MODELS_DIR=/opt/piper/models

EXPOSE 5000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5000"]
