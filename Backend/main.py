from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone

app = FastAPI(title="Nootes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent / "data" / "documents.json"


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

def read_store() -> dict:
    return json.loads(DATA_PATH.read_text())


def write_store(store: dict):
    DATA_PATH.write_text(json.dumps(store, indent=2))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/repos")
def list_repos():
    store = read_store()
    seen: set[str] = set()
    repos = []
    for doc in store["documents"].values():
        repo_id = doc["repoId"]
        if repo_id in seen:
            continue
        seen.add(repo_id)
        master = store["documents"].get(f"{repo_id}::master")
        repos.append({
            "id": repo_id,
            "title": doc.get("title", repo_id),
            "course": master.get("course") if master else None,
            "professor": master.get("professor") if master else None,
            "semester": master.get("semester") if master else None,
            "version": master.get("version") if master else None,
            "contributorCount": master.get("contributorCount") if master else None,
            "tags": master.get("tags") if master else [],
        })
    return {"data": repos}


@app.get("/api/repos/{repo_id}/master")
def get_master(repo_id: str):
    store = read_store()
    doc = store["documents"].get(f"{repo_id}::master")
    if not doc:
        raise HTTPException(status_code=404, detail="Master document not found")
    return {"data": doc}


@app.get("/api/repos/{repo_id}/personal/{user_id}")
def get_personal(repo_id: str, user_id: str):
    store = read_store()
    key = f"{repo_id}::{user_id}"
    doc = store["documents"].get(key)
    if not doc:
        # Auto-fork from master
        master = store["documents"].get(f"{repo_id}::master")
        if not master:
            raise HTTPException(status_code=404, detail="Repo not found")
        import copy
        forked = copy.deepcopy(master)
        forked["id"] = str(uuid.uuid4())
        forked["userId"] = user_id
        forked["title"] = f"{master['title']} — My Notes"
        forked["version"] = f"{master.get('version', '1.0')}+personal"
        forked["tags"] = list(master.get("tags", [])) + ["personal"]
        forked["createdAt"] = now_iso()
        forked["updatedAt"] = now_iso()
        store["documents"][key] = forked
        write_store(store)
        return {"data": forked}
    return {"data": doc}


@app.put("/api/repos/{repo_id}/personal/{user_id}")
def update_personal(repo_id: str, user_id: str, body: UpdateDocRequest):
    store = read_store()
    key = f"{repo_id}::{user_id}"
    doc = store["documents"].get(key)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.blocks is not None:
        doc["blocks"] = [b.model_dump() for b in body.blocks]
    if body.title is not None:
        doc["title"] = body.title
    doc["updatedAt"] = now_iso()
    store["documents"][key] = doc
    write_store(store)
    return {"data": doc}
