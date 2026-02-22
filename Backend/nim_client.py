"""
NIM API client for Nootes — wraps NVIDIA NIM inference endpoints.

All NIM containers (on Brev or elsewhere) expose an OpenAI-compatible API.
This module provides typed helpers for the three models we use:
  1. Embeddings  — llama-nemotron-embed-vl-1b-v2
  2. Moderation  — nemotron-content-safety-reasoning-4b
  3. Merge / Chat — llama-3.1-nemotron-nano-8b-v1

Set NVIDIA_NIM_BASE_URL and NVIDIA_NIM_API_KEY in .env.
"""

from __future__ import annotations

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────

# Base URL for the NIM endpoints (Brev tunnel/deployment or self-hosted)
# Examples:
#   https://<brev-tunnel-link>       — Brev VM tunnel
#   https://<deployment-id>.brev.dev — Brev Deployments
#   http://localhost:8000            — local NIM container
NIM_BASE_URL = os.environ.get("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com")
NIM_API_KEY = os.environ.get("NVIDIA_NIM_API_KEY", "")

# Model identifiers — override via env if deploying custom model names
EMBED_MODEL = os.environ.get("NIM_EMBED_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2")
MODERATE_MODEL = os.environ.get("NIM_MODERATE_MODEL", "nvidia/nemotron-content-safety-reasoning-4b")
MERGE_MODEL = os.environ.get("NIM_MERGE_MODEL", "nvidia/llama-3.1-nemotron-nano-8b-v1")

# Shared timeout (merge can be slow for large documents)
TIMEOUT = float(os.environ.get("NIM_TIMEOUT", "120"))


# ─── Internal client ────────────────────────────────────────────────────────

def _headers() -> dict[str, str]:
    h = {"Content-Type": "application/json"}
    if NIM_API_KEY:
        h["Authorization"] = f"Bearer {NIM_API_KEY}"
    return h


async def _post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST to a NIM endpoint and return the parsed JSON response."""
    url = f"{NIM_BASE_URL.rstrip('/')}{path}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, headers=_headers(), json=payload)
    resp.raise_for_status()
    return resp.json()


# ─── Chat Completions (merge / general) ──────────────────────────────────────

async def nim_chat(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 8192,
) -> str:
    """
    Call /v1/chat/completions on the NIM endpoint.

    Returns the assistant's message content as a string.
    """
    body: dict[str, Any] = {
        "model": model or MERGE_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    data = await _post("/v1/chat/completions", body)
    return (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )


# ─── Embeddings ──────────────────────────────────────────────────────────────

async def nim_embed(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of text strings using the NIM embedding model.

    Returns a list of 2048-dimensional vectors in the same order as input.
    """
    body: dict[str, Any] = {
        "model": EMBED_MODEL,
        "input": texts,
        "input_type": "passage",
    }
    data = await _post("/v1/embeddings", body)
    # Sort by index to guarantee order matches input
    items = sorted(data.get("data", []), key=lambda d: d.get("index", 0))
    return [item["embedding"] for item in items]


async def nim_embed_single(text: str) -> list[float]:
    """Embed a single text string. Convenience wrapper."""
    vectors = await nim_embed([text])
    if not vectors:
        raise ValueError("NIM embed returned empty result")
    return vectors[0]


# ─── Moderation ──────────────────────────────────────────────────────────────

# The Content Safety model expects a specific prompt format.
# reasoning_off = lower latency, suitable for real-time chat moderation.
_MODERATION_SYSTEM_PROMPT = """\
You are a content safety classifier. Evaluate whether the user's message \
violates any of these safety categories:

- Hate speech or discrimination
- Harassment, threats, or bullying
- Sexual content or content involving minors
- Graphic violence
- Encouragement of self-harm or suicide
- Illegal activities or instructions for wrongdoing
- Extremely offensive or abusive language

If the message is safe, reply with exactly: SAFE
If the message violates a category, reply with exactly: UNSAFE|<category>

Do not explain your reasoning. Do not output anything else."""


async def nim_moderate(message: str) -> dict[str, Any]:
    """
    Classify a message for content safety using the NIM moderation model.

    Returns: { "allowed": bool, "category": str | None }
    """
    try:
        result = await nim_chat(
            messages=[
                {"role": "system", "content": _MODERATION_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            model=MODERATE_MODEL,
            temperature=0.0,
            max_tokens=64,
        )
        result = result.strip().upper()

        if result.startswith("SAFE"):
            return {"allowed": True, "category": None}

        # Parse UNSAFE|category
        if result.startswith("UNSAFE"):
            parts = result.split("|", 1)
            category = parts[1].strip().lower() if len(parts) > 1 else "unspecified"
            return {"allowed": False, "category": category}

        # Fallback: if model output doesn't match expected format, allow
        # (fail-open for availability; tighten in production)
        logger.warning("Unexpected moderation response: %s", result)
        return {"allowed": True, "category": None}

    except Exception as e:
        # If the moderation model is unreachable, fail open
        logger.error("NIM moderation failed: %s", e)
        return {"allowed": True, "category": None}
