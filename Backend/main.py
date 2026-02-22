from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import asyncio
import uuid
import copy
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from md_utils import document_to_json, json_to_document, blocks_to_markdown, markdown_to_blocks
from nim_client import nim_chat, nim_graph, nim_embed_single, nim_moderate

app = FastAPI(title="Nootes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_DIR = Path(__file__).parent / "data" / "docs"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)


# ─── Models ──────────────────────────────────────────────────────────────────

class Block(BaseModel):
    id: str
    type: str
    content: str
    meta: Optional[dict[str, Any]] = None


class UpdateDocRequest(BaseModel):
    blocks: Optional[list[Block]] = None
    title: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _doc_path(repo_id: str, user_id: str) -> Path:
    """Return the .json file path for a document."""
    return DOCS_DIR / f"{repo_id}--{user_id}.json"


def read_doc(repo_id: str, user_id: str) -> dict | None:
    """Read a document from its .md file, or None if not found."""
    path = _doc_path(repo_id, user_id)
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    doc = json_to_document(text, fallback_key=f"{repo_id}--{user_id}")
    # Ensure repo/user fields are set
    doc.setdefault("repoId", repo_id)
    doc.setdefault("userId", user_id)
    return doc


def write_doc(doc: dict):
    """Write a document to its .md file."""
    repo_id = doc["repoId"]
    user_id = doc["userId"]
    path = _doc_path(repo_id, user_id)
    md = document_to_json(doc)
    path.write_text(md, encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_all_docs() -> list[dict]:
    """List all documents from the docs directory."""
    docs = []
    for path in DOCS_DIR.glob("*.json"):
        key = path.stem  # e.g. "cs-ua-310--master"
        parts = key.split("--", 1)
        if len(parts) != 2:
            continue
        repo_id, user_id = parts
        doc = read_doc(repo_id, user_id)
        if doc:
            docs.append(doc)
    return docs


# ─── Seed data check ────────────────────────────────────────────────────────

def check_seed_data():
    """Ensure the docs directory contains at least one .json file."""
    if any(DOCS_DIR.glob("*.json")):
        print("🌿 Seed data checked")
        return
    print("⚠️  No .json files found in data/docs/ — the editor will start empty.")


check_seed_data()


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/repos")
def list_repos():
    docs = list_all_docs()
    seen: set[str] = set()
    repos = []
    # Index masters for metadata
    masters: dict[str, dict] = {}
    for doc in docs:
        if doc.get("userId") == "master":
            masters[doc["repoId"]] = doc

    for doc in docs:
        repo_id = doc["repoId"]
        if repo_id in seen:
            continue
        seen.add(repo_id)
        master = masters.get(repo_id, doc)
        repos.append({
            "id": repo_id,
            "title": master.get("title", repo_id),
            "course": master.get("course"),
            "professor": master.get("professor"),
            "semester": master.get("semester"),
            "version": master.get("version"),
            "contributorCount": master.get("contributorCount"),
            "tags": master.get("tags", []),
        })
    return {"data": repos}


@app.get("/api/repos/{repo_id}/master")
def get_master(repo_id: str):
    doc = read_doc(repo_id, "master")
    if not doc:
        raise HTTPException(status_code=404, detail="Master document not found")
    return {"data": doc}


@app.get("/api/repos/{repo_id}/personal/{user_id}")
def get_personal(repo_id: str, user_id: str):
    doc = read_doc(repo_id, user_id)
    if not doc:
        # Auto-fork from master
        master = read_doc(repo_id, "master")
        if not master:
            raise HTTPException(status_code=404, detail="Repo not found")
        forked = copy.deepcopy(master)
        forked["id"] = str(uuid.uuid4())
        forked["userId"] = user_id
        forked["title"] = f"{master['title']} — My Notes"
        forked["version"] = f"{master.get('version', '1.0')}+personal"
        forked["tags"] = list(master.get("tags", [])) + ["personal"]
        forked["createdAt"] = now_iso()
        forked["updatedAt"] = now_iso()
        write_doc(forked)
        return {"data": forked}
    return {"data": doc}


@app.put("/api/repos/{repo_id}/personal/{user_id}")
async def update_personal(repo_id: str, user_id: str, body: UpdateDocRequest):
    doc = read_doc(repo_id, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.blocks is not None:
        doc["blocks"] = [b.model_dump() for b in body.blocks]
    if body.title is not None:
        doc["title"] = body.title
    doc["updatedAt"] = now_iso()
    write_doc(doc)

    # Fire-and-forget: embed the updated document for semantic search
    asyncio.create_task(_embed_document_safe(repo_id, user_id, doc))

    return {"data": doc}


# ─── Graph / Task Flow (Nemotron Super 49B via NIM) ──────────────────────────

GRAPH_PROMPT_PATH = Path(__file__).parent.parent / "gpt_prompts" / "gpt_prompt.txt"


def _load_graph_prompt() -> str:
    try:
        return GRAPH_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "You are a graph task flow generation assistant."


class ChatMessage(BaseModel):
    role: str
    content: str


class PromptRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "gpt-4o"  # ignored — NIM_GRAPH_MODEL is always used


@app.post("/api/prompt")
async def proxy_prompt(body: PromptRequest):
    messages = [m.model_dump() for m in body.messages]
    # Prepend graph system prompt if not already present
    if not messages or messages[0].get("role") != "system":
        messages.insert(0, {"role": "system", "content": _load_graph_prompt()})
    try:
        content = await nim_graph(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM graph failed: {e}")
    return {"content": content}


# ─── Moderation (Nemotron Content Safety 4B via NIM) ─────────────────────────

class ModerateRequest(BaseModel):
    message: str


@app.post("/api/moderate")
async def moderate_message(body: ModerateRequest):
    """Classify a chat message for content safety using Nemotron Content Safety 4B."""
    try:
        result = await nim_moderate(body.message)
        return {"allowed": result["allowed"], "category": result.get("category")}
    except Exception as e:
        logger.error("Moderation failed, falling back to allow: %s", e)
        return {"allowed": True, "category": None}


# ─── Embeddings (Nemotron Embed VL 1B via NIM) ───────────────────────────────

class EmbedRequest(BaseModel):
    repo_id: str
    user_id: str


async def _embed_document_safe(repo_id: str, user_id: str, doc: dict):
    """Fire-and-forget embedding — errors are logged, not raised."""
    try:
        markdown = blocks_to_markdown(doc.get("blocks", []))
        if not markdown.strip():
            return
        vector = await nim_embed_single(markdown)
        # TODO: Store vector in Supabase pgvector column
        # For now, log success
        logger.info("Embedded doc %s/%s — %d dims", repo_id, user_id, len(vector))
    except Exception as e:
        logger.error("Background embed failed for %s/%s: %s", repo_id, user_id, e)


@app.post("/api/embed")
async def embed_document(body: EmbedRequest):
    """Manually trigger embedding for a document."""
    doc = read_doc(body.repo_id, body.user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    markdown = blocks_to_markdown(doc.get("blocks", []))
    if not markdown.strip():
        raise HTTPException(status_code=400, detail="Document has no content to embed")

    try:
        vector = await nim_embed_single(markdown)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM embed failed: {e}")

    # TODO: Store vector in Supabase pgvector column
    return {"repo_id": body.repo_id, "user_id": body.user_id, "dimensions": len(vector)}


# ─── Merge (Nemotron Nano 8B via NIM) ────────────────────────────────────────

MERGE_PROMPT_PATH = Path(__file__).parent.parent / "gpt_prompts" / "merge_prompt.txt"


def _load_merge_prompt() -> str:
    try:
        return MERGE_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "You are a document merge assistant. Merge the provided documents into one."


def _format_merge_input(master: dict, forks: list[dict]) -> str:
    """Build the user message containing master + all forks for the merge model."""
    parts = []

    # Master document
    master_md = blocks_to_markdown(master.get("blocks", []))
    parts.append(f"## MASTER DOCUMENT\n\n{master_md}")

    # Fork documents
    for i, fork in enumerate(forks, 1):
        fork_md = blocks_to_markdown(fork.get("blocks", []))
        user_id = fork.get("userId", "unknown")
        parts.append(f"## FORK-{i} (contributor: {user_id})\n\n{fork_md}")

    return "\n\n---\n\n".join(parts)


def _parse_merge_result(result: str) -> tuple[str, str]:
    """Split merge model output into (merged_markdown, summary)."""
    separator = "---MERGE_SUMMARY---"
    if separator in result:
        merged, summary = result.split(separator, 1)
        return merged.strip(), summary.strip()
    # Fallback: entire output is the merged document
    return result.strip(), "Merge completed (no summary generated)."


@app.post("/api/repos/{repo_id}/merge")
async def merge_documents(repo_id: str):
    """
    Merge all user forks for a repo into the master document.

    Uses Nemotron Nano 8B to synthesize content based on
    correctness > completeness > recency > clarity > style.
    """
    # 1. Load master
    master = read_doc(repo_id, "master")
    if not master:
        raise HTTPException(status_code=404, detail="Master document not found")

    # 2. Find all forks
    forks = [
        doc for doc in list_all_docs()
        if doc["repoId"] == repo_id and doc.get("userId") != "master"
    ]
    if not forks:
        raise HTTPException(status_code=400, detail="No forks to merge")

    # 3. Build prompt
    merge_prompt = _load_merge_prompt()
    user_content = _format_merge_input(master, forks)

    # 4. Call Nemotron Nano 8B
    try:
        result = await nim_chat(
            messages=[
                {"role": "system", "content": merge_prompt},
                {"role": "user", "content": user_content},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM merge failed: {e}")

    # 5. Parse result
    merged_md, summary = _parse_merge_result(result)

    # 6. Update master document with merged content
    merged_blocks = markdown_to_blocks(merged_md)
    master["blocks"] = merged_blocks
    master["updatedAt"] = now_iso()
    master["version"] = _bump_version(master.get("version", "1.0.0"))
    write_doc(master)

    return {
        "data": master,
        "summary": summary,
        "forks_merged": len(forks),
    }


def _bump_version(version: str) -> str:
    """Increment the patch version: 1.0.0 → 1.0.1."""
    try:
        parts = version.split(".")
        if len(parts) == 3:
            parts[2] = str(int(parts[2]) + 1)
            return ".".join(parts)
    except (ValueError, IndexError):
        pass
    return version
