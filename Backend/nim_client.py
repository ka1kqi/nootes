"""
NIM API client for Nootes — wraps NVIDIA NIM inference endpoints.

All models are served via the hosted NVIDIA NIM API (integrate.api.nvidia.com).
Per-model base URLs can be overridden via NIM_*_BASE_URL env vars for
self-hosting on Brev or other GPU providers.

TEMPORARY: NIM call bodies are commented out and replaced with OpenAI equivalents
for development/testing. To restore NIM, uncomment each NIM block and remove
the OpenAI block directly below it.
"""

from __future__ import annotations

import os
import logging
from typing import Any
from dotenv import load_dotenv
load_dotenv()

import httpx  # kept for NIM restore — used by commented-out _post

# TEMPORARY: OpenAI async client — remove when switching back to NIM
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# ─── NIM Config ──────────────────────────────────────────────────────────────

# Shared defaults — all models use the same hosted endpoint and API key
NIM_BASE_URL = os.environ.get("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com")
NIM_API_KEY  = os.environ.get("NVIDIA_NIM_API_KEY", "")

# Per-model base URLs (optional — only needed if self-hosting on separate containers)
MERGE_BASE_URL    = os.environ.get("NIM_MERGE_BASE_URL",    NIM_BASE_URL)
MODERATE_BASE_URL = os.environ.get("NIM_MODERATE_BASE_URL", NIM_BASE_URL)
EMBED_BASE_URL    = os.environ.get("NIM_EMBED_BASE_URL",    NIM_BASE_URL)
EMBED_API_KEY     = os.environ.get("NIM_EMBED_API_KEY",     NIM_API_KEY)
GRAPH_BASE_URL    = os.environ.get("NIM_GRAPH_BASE_URL",    NIM_BASE_URL)

# NIM model identifiers
EMBED_MODEL    = os.environ.get("NIM_EMBED_MODEL",    "nvidia/llama-nemotron-embed-vl-1b-v2")
MODERATE_MODEL = os.environ.get("NIM_MODERATE_MODEL", "nvidia/nemotron-content-safety-reasoning-4b")
MERGE_MODEL    = os.environ.get("NIM_MERGE_MODEL",    "nvidia/llama-3.1-nemotron-nano-8b-v1")
GRAPH_MODEL    = os.environ.get("NIM_GRAPH_MODEL",    "nvidia/llama-3.3-nemotron-super-49b-v1")

# Shared timeout
TIMEOUT = float(os.environ.get("NIM_TIMEOUT", "120"))

# ─── TEMPORARY: OpenAI Config ────────────────────────────────────────────────
# Remove this block when switching back to NIM.

OPENAI_API_KEY     = os.environ.get("OPENAI_API", "")
OPENAI_CHAT_MODEL  = os.environ.get("OPENAI_CHAT_MODEL",  "gpt-4o-mini")  # replaces MERGE_MODEL
OPENAI_GRAPH_MODEL = os.environ.get("OPENAI_GRAPH_MODEL", "gpt-4o")       # replaces GRAPH_MODEL
OPENAI_EMBED_MODEL = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")  # replaces EMBED_MODEL

# Single shared async client; instantiated once at module load
_openai = AsyncOpenAI(api_key=OPENAI_API_KEY)


# ─── Internal NIM client (TEMPORARILY COMMENTED OUT) ────────────────────────
# Restore by uncommenting _headers and _post, then swap each function body below.

# def _headers(api_key: str | None = None) -> dict[str, str]:
#     """Build HTTP request headers, optionally injecting a Bearer token.
#
#     Args:
#         api_key: Override the global NIM_API_KEY for this request.
#
#     Returns:
#         Dict of HTTP headers ready to pass to httpx.
#     """
#     key = api_key if api_key is not None else NIM_API_KEY
#     h = {"Content-Type": "application/json"}
#     if key:  # Only add Authorization header when an API key is available
#         h["Authorization"] = f"Bearer {key}"
#     return h
#
#
# async def _post(
#     path: str,
#     payload: dict[str, Any],
#     *,
#     base_url: str | None = None,
#     api_key: str | None = None,
# ) -> dict[str, Any]:
#     """POST to a NIM endpoint and return the parsed JSON response."""
#     root = (base_url or NIM_BASE_URL).rstrip("/")  # Normalize base URL to prevent double slashes
#     url = f"{root}{path}"
#     # Log the outgoing request — model and input size help diagnose latency issues
#     model = payload.get("model", "unknown")
#     input_summary = (
#         f"{len(payload['messages'])} messages" if "messages" in payload
#         else f"{len(payload.get('input', []))} texts" if "input" in payload
#         else "unknown input"
#     )
#     logger.info("[NVIDIA NIM] → POST %s | model=%s | input=%s", url, model, input_summary)
#     print(f"[NVIDIA NIM] → POST {url} | model={model} | input={input_summary}")
#     async with httpx.AsyncClient(timeout=TIMEOUT) as client:  # Per-request client; connection is closed after the response
#         resp = await client.post(url, headers=_headers(api_key), json=payload)
#     # On error, log the full response body before raising — makes it much easier
#     # to diagnose NVIDIA API rejections (e.g. rate limits, bad model IDs, auth failures)
#     if resp.is_error:
#         error_body = resp.text
#         logger.error("[NVIDIA NIM] ✗ %s %s | body: %s", resp.status_code, url, error_body)
#         print(f"[NVIDIA NIM] ✗ {resp.status_code} {url} | body: {error_body}")
#     resp.raise_for_status()  # Raise httpx.HTTPStatusError for 4xx/5xx responses
#     # Log the response status and token usage when available
#     data = resp.json()
#     usage = data.get("usage", {})
#     usage_str = (
#         f"prompt={usage.get('prompt_tokens', '?')} completion={usage.get('completion_tokens', '?')} total={usage.get('total_tokens', '?')}"
#         if usage else "no usage info"
#     )
#     logger.info("[NVIDIA NIM] ← %s %s | tokens: %s", resp.status_code, url, usage_str)
#     print(f"[NVIDIA NIM] ← {resp.status_code} {url} | tokens: {usage_str}")
#     return data


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
    Call /v1/chat/completions — returns the assistant message content as a string.

    TEMPORARY: routed to OpenAI. Restore NIM block below when switching back.
    """

    # --- NIM implementation (commented out) ---
    # effective_model = model or MERGE_MODEL
    # logger.info("[NVIDIA NIM] nim_chat | model=%s | messages=%d | temperature=%s | max_tokens=%d",
    #             effective_model, len(messages), temperature, max_tokens)
    # print(f"[NVIDIA NIM] nim_chat | model={effective_model} | messages={len(messages)} | temperature={temperature} | max_tokens={max_tokens}")
    # body: dict[str, Any] = {
    #     "model": effective_model,
    #     "messages": messages,
    #     "temperature": temperature,
    #     "max_tokens": max_tokens,
    # }
    # data = await _post("/v1/chat/completions", body, base_url=base_url or MERGE_BASE_URL, api_key=api_key)
    # return (
    #     data.get("choices", [{}])[0]
    #     .get("message", {})
    #     .get("content", "")
    # )

    # TEMPORARY: OpenAI implementation
    openai_model = model or OPENAI_CHAT_MODEL
    logger.info("[OpenAI] nim_chat | model=%s | messages=%d | temperature=%s | max_tokens=%d",
                openai_model, len(messages), temperature, max_tokens)
    print(f"[OpenAI] nim_chat | model={openai_model} | messages={len(messages)} | temperature={temperature} | max_tokens={max_tokens}")
    try:
        resp = await _openai.chat.completions.create(
            model=openai_model,
            messages=messages,       # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
        )
        usage = resp.usage
        if usage:
            logger.info("[OpenAI] nim_chat ← prompt=%d completion=%d total=%d",
                        usage.prompt_tokens, usage.completion_tokens, usage.total_tokens)
            print(f"[OpenAI] nim_chat ← prompt={usage.prompt_tokens} completion={usage.completion_tokens} total={usage.total_tokens}")
        return resp.choices[0].message.content or ""
    except Exception as e:
        error_text = getattr(getattr(e, "response", None), "text", None)
        logger.error("[OpenAI] nim_chat failed: %s | response body: %s", e, error_text)
        print(f"[OpenAI] nim_chat failed: {e} | response body: {error_text}")
        raise


# ─── Graph / Task Flow (Nemotron Super 49B) ──────────────────────────────────

async def nim_graph(
    messages: list[dict[str, str]],
) -> str:
    """
    Call the graph/task-flow model (Nemotron Super 49B).

    Higher temperature and lower max_tokens than merge — optimised for
    structured JSON DAG generation rather than long-form document synthesis.

    TEMPORARY: routed to OpenAI gpt-4o. Restore NIM block below when switching back.
    """

    # --- NIM implementation (commented out) ---
    # logger.info("[NVIDIA NIM] nim_graph | model=%s | messages=%d", GRAPH_MODEL, len(messages))
    # print(f"[NVIDIA NIM] nim_graph | model={GRAPH_MODEL} | messages={len(messages)}")
    # return await nim_chat(
    #     messages=messages,
    #     model=GRAPH_MODEL,
    #     temperature=0.7,
    #     max_tokens=4096,
    #     base_url=GRAPH_BASE_URL,
    # )

    # TEMPORARY: OpenAI implementation
    logger.info("[OpenAI] nim_graph | model=%s | messages=%d", OPENAI_GRAPH_MODEL, len(messages))
    print(f"[OpenAI] nim_graph | model={OPENAI_GRAPH_MODEL} | messages={len(messages)}")
    return await nim_chat(
        messages=messages,
        model=OPENAI_GRAPH_MODEL,
        temperature=0.7,
        max_tokens=4096,
    )


# ─── Embeddings ──────────────────────────────────────────────────────────────

async def nim_embed(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of text strings — returns a list of vectors in input order.

    TEMPORARY: routed to OpenAI text-embedding-3-small. Restore NIM block below.
    """

    # --- NIM implementation (commented out) ---
    # logger.info("[NVIDIA NIM] nim_embed | model=%s | texts=%d", EMBED_MODEL, len(texts))
    # print(f"[NVIDIA NIM] nim_embed | model={EMBED_MODEL} | texts={len(texts)}")
    # body: dict[str, Any] = {
    #     "model": EMBED_MODEL,
    #     "input": texts,
    #     "input_type": "passage",
    # }
    # data = await _post("/v1/embeddings", body, base_url=EMBED_BASE_URL, api_key=EMBED_API_KEY)
    # items = sorted(data.get("data", []), key=lambda d: d.get("index", 0))  # Sort by index to guarantee order matches input
    # return [item["embedding"] for item in items]

    # TEMPORARY: OpenAI implementation
    logger.info("[OpenAI] nim_embed | model=%s | texts=%d", OPENAI_EMBED_MODEL, len(texts))
    print(f"[OpenAI] nim_embed | model={OPENAI_EMBED_MODEL} | texts={len(texts)}")
    try:
        resp = await _openai.embeddings.create(
            model=OPENAI_EMBED_MODEL,
            input=texts,
        )
        logger.info("[OpenAI] nim_embed ← vectors=%d", len(resp.data))
        print(f"[OpenAI] nim_embed ← vectors={len(resp.data)}")
        # Sort by index to guarantee order matches input
        items = sorted(resp.data, key=lambda d: d.index)
        return [item.embedding for item in items]
    except Exception as e:
        error_text = getattr(getattr(e, "response", None), "text", None)
        logger.error("[OpenAI] nim_embed failed: %s | response body: %s", e, error_text)
        print(f"[OpenAI] nim_embed failed: {e} | response body: {error_text}")
        raise


async def nim_embed_single(text: str) -> list[float]:
    """Embed a single text string. Convenience wrapper around nim_embed."""
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
    Classify a message for content safety.

    Returns: { "allowed": bool, "category": str | None }

    TEMPORARY: routed to OpenAI Moderations API. Restore NIM block below.
    """

    # --- NIM implementation (commented out) ---
    # try:
    #     logger.info("[NVIDIA NIM] nim_moderate | model=%s | message_len=%d", MODERATE_MODEL, len(message))
    #     print(f"[NVIDIA NIM] nim_moderate | model={MODERATE_MODEL} | message_len={len(message)}")
    #     result = await nim_chat(
    #         messages=[
    #             {"role": "system", "content": _MODERATION_SYSTEM_PROMPT},
    #             {"role": "user", "content": message},
    #         ],
    #         model=MODERATE_MODEL,
    #         temperature=0.0,
    #         max_tokens=64,
    #         base_url=MODERATE_BASE_URL,
    #     )
    #     result = result.strip().upper()
    #
    #     if result.startswith("SAFE"):  # Model confirmed the content is safe
    #         logger.info("[NVIDIA NIM] nim_moderate result: SAFE")
    #         print("[NVIDIA NIM] nim_moderate result: SAFE")
    #         return {"allowed": True, "category": None}
    #
    #     # Parse UNSAFE|category
    #     if result.startswith("UNSAFE"):  # Model flagged the content — extract the violation category
    #         parts = result.split("|", 1)
    #         category = parts[1].strip().lower() if len(parts) > 1 else "unspecified"  # Category follows the pipe; default if absent
    #         logger.info("[NVIDIA NIM] nim_moderate result: UNSAFE | category=%s", category)
    #         print(f"[NVIDIA NIM] nim_moderate result: UNSAFE | category={category}")
    #         return {"allowed": False, "category": category}
    #
    #     # Fallback: if model output doesn't match expected format, allow
    #     # (fail-open for availability; tighten in production)
    #     logger.warning("Unexpected moderation response: %s", result)
    #     return {"allowed": True, "category": None}
    #
    # except Exception as e:
    #     # If the moderation model is unreachable, fail open; print the full exception for visibility
    #     error_text = getattr(getattr(e, "response", None), "text", None)
    #     logger.error("[NVIDIA NIM] nim_moderate failed: %s | response body: %s", e, error_text)
    #     print(f"[NVIDIA NIM] nim_moderate failed: {e} | response body: {error_text}")
    #     return {"allowed": True, "category": None}

    # TEMPORARY: OpenAI Moderation API implementation
    try:
        logger.info("[OpenAI] nim_moderate | message_len=%d", len(message))
        print(f"[OpenAI] nim_moderate | message_len={len(message)}")
        resp = await _openai.moderations.create(input=message)
        result = resp.results[0]
        if result.flagged:
            # Extract the first triggered category name from the flat categories object
            categories = result.categories.model_dump()
            category = next((k for k, v in categories.items() if v), "unspecified")
            logger.info("[OpenAI] nim_moderate result: UNSAFE | category=%s", category)
            print(f"[OpenAI] nim_moderate result: UNSAFE | category={category}")
            return {"allowed": False, "category": category}
        logger.info("[OpenAI] nim_moderate result: SAFE")
        print("[OpenAI] nim_moderate result: SAFE")
        return {"allowed": True, "category": None}
    except Exception as e:
        # Fail open — moderation should never block the whole request
        error_text = getattr(getattr(e, "response", None), "text", None)
        logger.error("[OpenAI] nim_moderate failed: %s | response body: %s", e, error_text)
        print(f"[OpenAI] nim_moderate failed: {e} | response body: {error_text}")
        return {"allowed": True, "category": None}
