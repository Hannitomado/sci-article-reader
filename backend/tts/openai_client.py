from __future__ import annotations

import os
from typing import Optional

from openai import OpenAI

_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """Create the OpenAI client on first use, then reuse it."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set in the environment")
        _client = OpenAI(api_key=api_key)
    return _client

