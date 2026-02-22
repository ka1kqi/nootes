We are integrating NVIDIA Nemotron models into our Nootes backend using self-hosted NIM containers on NVIDIA Brev (GPU rental). All NIM endpoints use the OpenAI-compatible API format (`/v1/chat/completions`, `/v1/embeddings`).

## Current State

The backend is at `Backend/main.py` (FastAPI). We've already partially scaffolded:
- `Backend/nim_client.py` — shared async NIM client (wraps httpx, configurable `NVIDIA_NIM_BASE_URL`)
- `Backend/main.py` — has endpoints for moderation (`/api/moderate`), embedding (`/api/embed`), and merge (`/api/repos/{repo_id}/merge`) using nim_client
- `gpt_prompts/merge_prompt.txt` — merge system prompt
- `Frontend/.env` — has `NVIDIA_NIM_BASE_URL` and `NVIDIA_NIM_API_KEY` placeholders
- `supabase/embeddings_migration.sql` — pgvector migration for embedding storage

## What needs to be done

### 1. Add graph model to nim_client.py

Add a `GRAPH_MODEL` config to `nim_client.py`:
```
GRAPH_MODEL = os.environ.get("NIM_GRAPH_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1")
```

Add a `nim_graph()` helper function that calls `nim_chat()` with the graph model, `temperature=0.7`, and `max_tokens=4096`.

### 2. Replace `/api/prompt` with NIM-backed graph endpoint

Currently `/api/prompt` proxies to OpenAI GPT-4o for graph task generation. Replace this:

- Keep the existing `/api/prompt` endpoint signature (accepts `PromptRequest` with `messages` list)
- Instead of calling `_openai_chat()` with the OpenAI API, call `nim_graph()` from nim_client
- Load the system prompt from `gpt_prompts/gpt_prompt.txt` (already exists)
- The graph system prompt should be prepended to the messages if not already present
- Remove the `_openai_chat()` function and the `OPENAI_API` dependency entirely — we're fully migrating off OpenAI
- Remove the `httpx` import if it's no longer used elsewhere
- Remove `os.environ.get("OPENAI_API")` references

### 3. Add `.env` variable for graph model

Add to `Frontend/.env`:
```
# NIM_GRAPH_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
```

### 4. Clean up old OpenAI references

- Remove `OPENAI_API` and `VITE_OPENAI_API` from `.env` (we no longer use OpenAI)
- Remove `VITE_API_URL` from `.env` (was pointing to the old OpenAI proxy)
- Remove the `_openai_chat()` helper function from main.py
- Remove any dead imports (`httpx` if unused)

### 5. Update nim_client.py model configs

Make sure these model identifiers are configurable via env vars:
- `NIM_EMBED_MODEL` — default: `nvidia/llama-nemotron-embed-vl-1b-v2`
- `NIM_MODERATE_MODEL` — default: `nvidia/nemotron-content-safety-reasoning-4b`
- `NIM_MERGE_MODEL` — default: `nvidia/llama-3.1-nemotron-nano-8b-v1`
- `NIM_GRAPH_MODEL` — default: `nvidia/llama-3.3-nemotron-super-49b-v1`

All four share the same `NVIDIA_NIM_BASE_URL` and `NVIDIA_NIM_API_KEY`.

## Architecture Summary

We are running 4 Nemotron models on NVIDIA Brev GPU instances:

| Endpoint | Model | Use Case |
|----------|-------|----------|
| `POST /api/moderate` | nemotron-content-safety-reasoning-4b | Chat message safety classification |
| `POST /api/embed` | llama-nemotron-embed-vl-1b-v2 | Embed noots as 2048-dim vectors |
| `POST /api/repos/{repo_id}/merge` | llama-3.1-nemotron-nano-8b-v1 | Merge user forks into master document |
| `POST /api/prompt` | llama-3.3-nemotron-super-49b-v1 | Graph task flow generation (JSON DAGs) |

Auto-embed also fires on document save (`PUT /api/repos/{repo_id}/personal/{user_id}`).

## Important constraints

- Documents are stored as `.json` files (not `.md`), using `document_to_json` / `json_to_document` from `md_utils.py`
- The NIM API is OpenAI-compatible: same `/v1/chat/completions` and `/v1/embeddings` format
- All NIM calls go through the shared `nim_client.py` module
- Keep error handling consistent: NIM failures should return 502 with descriptive messages
- The frontend currently sends requests to `/api/prompt` with a `messages` array — the endpoint signature must stay the same so the frontend doesn't break
