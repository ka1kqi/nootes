from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import uuid
import copy
import os
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
import httpx
from md_utils import document_to_markdown, markdown_to_document

load_dotenv(Path(__file__).parent.parent / "Frontend" / ".env")

app = FastAPI(title="Nootes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_DIR = Path(__file__).parent / "data" / "docs"
DOCS_DIR.mkdir(parents=True, exist_ok=True)


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
    """Return the .md file path for a document."""
    return DOCS_DIR / f"{repo_id}--{user_id}.md"


def read_doc(repo_id: str, user_id: str) -> dict | None:
    """Read a document from its .md file, or None if not found."""
    path = _doc_path(repo_id, user_id)
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    doc = markdown_to_document(text, fallback_key=f"{repo_id}--{user_id}")
    # Ensure repo/user fields are set
    doc.setdefault("repoId", repo_id)
    doc.setdefault("userId", user_id)
    return doc


def write_doc(doc: dict):
    """Write a document to its .md file."""
    repo_id = doc["repoId"]
    user_id = doc["userId"]
    path = _doc_path(repo_id, user_id)
    md = document_to_markdown(doc)
    path.write_text(md, encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_all_docs() -> list[dict]:
    """List all documents from the docs directory."""
    docs = []
    for path in DOCS_DIR.glob("*.md"):
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
    """Ensure the docs directory contains at least one .md file."""
    if any(DOCS_DIR.glob("*.md")):
        print("🌿 Seed data checked")
        return
    print("⚠️  No .md files found in data/docs/ — the editor will start empty.")


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
def update_personal(repo_id: str, user_id: str, body: UpdateDocRequest):
    doc = read_doc(repo_id, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.blocks is not None:
        doc["blocks"] = [b.model_dump() for b in body.blocks]
    if body.title is not None:
        doc["title"] = body.title
    doc["updatedAt"] = now_iso()
    write_doc(doc)
    return {"data": doc}


# ─── AI Proxy ─────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class PromptRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "gpt-4o"


@app.post("/api/prompt")
async def proxy_prompt(body: PromptRequest):
    api_key = os.environ.get("OPENAI_API")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API key not configured")
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": body.model,
                "messages": [m.model_dump() for m in body.messages],
            },
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"content": content}
