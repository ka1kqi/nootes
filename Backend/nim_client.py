"""
NIM API client for Nootes — wraps NVIDIA NIM inference endpoints.

All NIM containers (on Brev or elsewhere) expose an OpenAI-compatible API.
This module provides typed helpers for the four models we use:
  1. Embeddings  — llama-nemotron-embed-vl-1b-v2
  2. Moderation  — nemotron-content-safety-reasoning-4b
  3. Merge / Chat — llama-3.1-nemotron-nano-8b-v1
  4. Graph / Tasks — llama-3.3-nemotron-super-49b-v1

All four containers run on a single H100 80GB Brev instance, each on its
own port (8001-8004). Set per-model base URLs via NIM_*_BASE_URL env vars.
"""

from __future__ import annotations

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────

# Shared defaults — used as fallback when per-model URLs are not set
NIM_BASE_URL = os.environ.get("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com")
NIM_API_KEY = os.environ.get("NVIDIA_NIM_API_KEY", "")

# Per-model base URLs (each NIM container runs on its own port / tunnel)
MERGE_BASE_URL = os.environ.get("NIM_MERGE_BASE_URL", NIM_BASE_URL)
MODERATE_BASE_URL = os.environ.get("NIM_MODERATE_BASE_URL", NIM_BASE_URL)
EMBED_BASE_URL = os.environ.get("NIM_EMBED_BASE_URL", NIM_BASE_URL)
GRAPH_BASE_URL = os.environ.get("NIM_GRAPH_BASE_URL", NIM_BASE_URL)

# Model identifiers — override via env if deploying custom model names
EMBED_MODEL = os.environ.get("NIM_EMBED_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2")
MODERATE_MODEL = os.environ.get("NIM_MODERATE_MODEL", "nvidia/nemotron-content-safety-reasoning-4b")
MERGE_MODEL = os.environ.get("NIM_MERGE_MODEL", "nvidia/llama-3.1-nemotron-nano-8b-v1")
GRAPH_MODEL = os.environ.get("NIM_GRAPH_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1")

# Shared timeout (merge/graph can be slow for large inputs)
TIMEOUT = float(os.environ.get("NIM_TIMEOUT", "120"))


# ─── Internal client ────────────────────────────────────────────────────────

def _headers(api_key: str | None = None) -> dict[str, str]:
    key = api_key if api_key is not None else NIM_API_KEY
    h = {"Content-Type": "application/json"}
    if key:
        h["Authorization"] = f"Bearer {key}"
    return h


async def _post(
    path: str,
    payload: dict[str, Any],
    *,
    base_url: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """POST to a NIM endpoint and return the parsed JSON response."""
    root = (base_url or NIM_BASE_URL).rstrip("/")
    url = f"{root}{path}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, headers=_headers(api_key), json=payload)
    resp.raise_for_status()
    return resp.json()


# ─── Chat Completions (merge / general) ──────────────────────────────────────

async def nim_chat(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 8192,
    *,
    base_url: str | None = None,
    api_key: str | None = None,
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
    data = await _post("/v1/chat/completions", body, base_url=base_url or MERGE_BASE_URL, api_key=api_key)
    return (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )


# ─── Graph / Task Flow (Nemotron Super 49B) ──────────────────────────────────

async def nim_graph(
    messages: list[dict[str, str]],
) -> str:
    """
    Call the graph/task-flow model (Nemotron Super 49B).

    Higher temperature and lower max_tokens than merge — optimised for
    structured JSON DAG generation rather than long-form document synthesis.
    """
    return await nim_chat(
        messages=messages,
        model=GRAPH_MODEL,
        temperature=0.7,
        max_tokens=4096,
        base_url=GRAPH_BASE_URL,
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
    data = await _post("/v1/embeddings", body, base_url=EMBED_BASE_URL)
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
            base_url=MODERATE_BASE_URL,
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
