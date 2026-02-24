"""
Nootes Backend API — FastAPI application entry point.

Exposes REST endpoints for:
  - Repository and document CRUD (backed by JSON files in data/docs/)
  - Semantic merge of fork documents via Nemotron Nano 8B
  - Noot AI agent (Nemotron Super 49B) for writing assistance
  - Content moderation via Nemotron Content Safety 4B
  - Document / query embedding via Nemotron Embed VL 1B
  - Node explanation using a lightweight prompt

All NIM calls are delegated to nim_client.py.
Document serialization helpers live in doc_utils.py.
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env before any os.environ reads

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import asyncio
import json
import re
import uuid
import copy
import logging
from pathlib import Path
from datetime import datetime, timezone
from doc_utils import document_to_json, json_to_document, blocks_to_markdown, blocks_to_json_str
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


class MergeRequest(BaseModel):
    master_blocks: list[dict[str, Any]]
    fork_blocks: list[dict[str, Any]]
    master_label: Optional[str] = "Master Document"
    fork_label: Optional[str] = "Fork"


class EmbedRequest(BaseModel):
    doc_id: str
    blocks: list[Any]  # permissive — validated in handler
    title: str | None = None



# ─── Helpers ─────────────────────────────────────────────────────────────────

def _doc_path(repo_id: str, user_id: str) -> Path:
    """Return the .json file path for a document."""
    return DOCS_DIR / f"{repo_id}--{user_id}.json"


def read_doc(repo_id: str, user_id: str) -> dict | None:
    """Read a document from its .json file, or None if not found."""
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
    """Write a document to its .json file."""
    repo_id = doc["repoId"]
    user_id = doc["userId"]
    path = _doc_path(repo_id, user_id)
    md = document_to_json(doc)
    path.write_text(md, encoding="utf-8")


def now_iso() -> str:
    """Return the current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def list_all_docs() -> list[dict]:
    """List all documents from the docs directory."""
    docs = []
    for path in DOCS_DIR.glob("*.json"):
        key = path.stem  # e.g. "cs-ua-310--master"
        parts = key.split("--", 1)
        if len(parts) != 2:  # Skip files that don't follow the repo_id--user_id naming convention
            continue
        repo_id, user_id = parts
        doc = read_doc(repo_id, user_id)
        if doc:  # Only include successfully parsed documents
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
    """Return a deduplicated list of all repositories with metadata sourced from master docs."""
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
        # Skip repos already added (deduplication across master + fork files)
        if repo_id in seen:
            continue
        seen.add(repo_id)
        # Prefer master doc for display metadata; fall back to any available doc
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
    """Fetch the canonical master document for a repository."""
    doc = read_doc(repo_id, "master")
    if not doc:
        raise HTTPException(status_code=404, detail="Master document not found")
    return {"data": doc}


@app.get("/api/repos/{repo_id}/personal/{user_id}")
def get_personal(repo_id: str, user_id: str):
    """Fetch a user's personal fork of a repo, auto-creating it from master if absent."""
    doc = read_doc(repo_id, user_id)
    if not doc:
        # Auto-fork from master
        master = read_doc(repo_id, "master")
        if not master:
            raise HTTPException(status_code=404, detail="Repo not found")
        forked = copy.deepcopy(master)  # Deep copy so edits don't mutate the master dict in memory
        forked["id"] = str(uuid.uuid4())  # Assign a fresh unique ID for the fork
        forked["userId"] = user_id
        forked["title"] = f"{master['title']} — My Notes"  # Distinguish the fork's title from the master
        forked["version"] = f"{master.get('version', '1.0')}+personal"  # Tag version to indicate personal fork
        forked["tags"] = list(master.get("tags", [])) + ["personal"]  # Inherit master tags and add 'personal'
        forked["createdAt"] = now_iso()
        forked["updatedAt"] = now_iso()
        write_doc(forked)  # Persist the new fork immediately so subsequent GETs find it
        return {"data": forked}
    return {"data": doc}


@app.put("/api/repos/{repo_id}/personal/{user_id}")
async def update_personal(repo_id: str, user_id: str, body: UpdateDocRequest):
    """Persist edits to a user's personal fork and trigger a background embedding."""
    doc = read_doc(repo_id, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.blocks is not None:  # Only replace blocks when the client explicitly sent new ones
        doc["blocks"] = [b.model_dump() for b in body.blocks]
    if body.title is not None:  # Only update title when explicitly provided in the request
        doc["title"] = body.title
    doc["updatedAt"] = now_iso()
    write_doc(doc)

    # Fire-and-forget: embed the updated document for semantic search
    asyncio.create_task(_embed_document_safe(repo_id, user_id, doc))

    return {"data": doc}


# ─── Prompt file resolution ──────────────────────────────────────────────────

_PROMPT_DIRS = [
    Path(__file__).parent / "gpt_prompts",          # inside Backend/ (Docker)
    Path(__file__).parent.parent / "gpt_prompts",   # repo root (local dev)
]


def _find_prompt(filename: str) -> Path | None:
    """Search known prompt directories for a prompt file.

    Args:
        filename: Prompt filename, e.g. "gpt_prompt.txt".

    Returns:
        The first matching Path, or None if not found in any directory.
    """
    for d in _PROMPT_DIRS:
        p = d / filename
        if p.exists():
            return p
    return None


# ─── Graph / Task Flow (Nemotron Super 49B via NIM) ──────────────────────────

GRAPH_PROMPT_PATH = _find_prompt("gpt_prompt.txt")


def _load_graph_prompt() -> str:
    """Load the graph/task-flow system prompt from disk, or fall back to a default."""
    if GRAPH_PROMPT_PATH:
        return GRAPH_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "You are a graph task flow generation assistant."


class ChatMessage(BaseModel):
    role: str
    content: str


class PromptRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "gpt-4o"  # ignored — NIM_GRAPH_MODEL is always used


SIMPLE_PROMPT_PATH = _find_prompt("gpt_prompt_simple.txt")


def _load_simple_prompt() -> str:
    """Load the brief node-explanation system prompt, or fall back to a default."""
    if SIMPLE_PROMPT_PATH:
        return SIMPLE_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "Explain the concept in 1–2 sentences. Plain text only."


@app.post("/api/explain")
async def explain_node(body: PromptRequest):
    """Node explanation endpoint — always uses the simple prompt, never the noot prompt."""
    messages = [m.model_dump() for m in body.messages]
    # Strip any system message the client sent — we always enforce the simple prompt.
    if messages and messages[0].get("role") == "system":
        messages = messages[1:]
    messages.insert(0, {"role": "system", "content": _load_simple_prompt()})
    try:
        content = await nim_graph(messages)  # Use the Super 49B model for concise node explanations
    except Exception as e:
    return {"content": content.strip()}



    messages = [m.model_dump() for m in body.messages]
    # Prepend graph system prompt if not already present
    if not messages or messages[0].get("role") != "system":
        messages.insert(0, {"role": "system", "content": _load_graph_prompt()})
    try:
        content = await nim_graph(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM graph failed: {e}")
    return {"content": content}


# ─── Noot Agent (dual-mode: text or graph) ───────────────────────────────────

NOOT_PROMPT_PATH = _find_prompt("noot_prompt.txt")

# Valid tool markers and substring patterns used to normalise LLM typos
_NOOT_TOOL_HINTS = [
    ("WRITE", "WRITE_TO_EDITOR"),
    ("CREATE", "CREATE_REPO"),
    ("NAVIGATE", "NAVIGATE"),
    ("GRAPH", "GRAPH"),
    ("MESSAGE", "MESSAGE"),
]


def _sanitise_latex_content(content: str) -> str:
    """
    Strip $$ or $ delimiters from a latex block's content so KaTeX receives
    pure LaTeX.  Handles three cases:
      1. Content wrapped in $$...$$  → strip outer $$
      2. Content wrapped in $...$    → strip outer $
      3. Mixed prose + $...$ inline  → strip all $ signs so KaTeX can render
         the LaTeX commands even if the prose looks odd
    """
    s = content.strip()
    # Case 1: wrapped in $$
    if s.startswith("$$") and s.endswith("$$") and len(s) > 4:
        return s[2:-2].strip()
    # Case 2: wrapped in single $
    if s.startswith("$") and s.endswith("$") and len(s) > 2:
        return s[1:-1].strip()
    # Case 3: inline $...$ mixed with prose — strip all $ delimiters
    if "$" in s:
        return s.replace("$$", "").replace("$", "")
    return s


def _fix_latex_backslashes(s: str) -> str:
    """
    Normalize backslashes in a raw JSON text string so json.loads succeeds.

    Strategy — process each \\X or \\\\X pair in one left-to-right pass:
      • \\\\X  (already-escaped backslash pair)  → leave alone → parses as \\X ✓
      • \\n \\r \\t \\u \\\\ \\"  \\/  (standard JSON escapes) → leave alone ✓
      • \\X  for any other X  (bare LaTeX: \\frac \\leq \\delta …) → double to \\\\X ✓

    \\f and \\b are technically valid JSON escapes but collide with \\frac / \\begin
    etc.  Note content never contains literal form-feed or backspace bytes.
    """
    def _repl(m: re.Match) -> str:
        # Inner replacement callback — invoked by re.sub for every \X or \\X sequence
        c = m.group(1)
        if c in ('"', '\\', '/', 'n', 'r', 't', 'u'):  # Standard JSON escape — leave unchanged
            return m.group(0)
        return '\\\\' + c  # Bare LaTeX command (e.g. \frac) — double the backslash for valid JSON
    return re.sub(r'\\(\\|["\\/nrtu]|.)', _repl, s)


def _normalise_noot_response(raw: str) -> str:
    """
    Ensure every noot response is exactly:
        [TOOL]\n{body}

    Fixes:
    - Typos in the marker (e.g. [TWRITE_TO_EDITOR] → [WRITE_TO_EDITOR])
    - Extra whitespace / blank lines between marker and body
    - Body not starting with '[' for array tools or '{' for object tools
    - $ delimiters in latex block content (WRITE_TO_EDITOR blocks only)
    """
    text = raw.strip()

    # --- Resolve marker --------------------------------------------------
    m = re.match(r'^\[([A-Z_a-z0-9 ]+)\]', text)
    if not m:  # No tool marker found — treat the entire response as a plain message
        marker = "MESSAGE"
        body = text
    else:
        raw_token = m.group(1).upper().strip()
        body = text[m.end():].lstrip("\n").lstrip()
        marker = "MESSAGE"  # default — safer than WRITE_TO_EDITOR
        for hint, tool in _NOOT_TOOL_HINTS:  # Walk hint table to resolve typo-tolerant marker
            if hint in raw_token:  # First matching hint wins
                marker = tool
                break

    # --- Trim body to correct opening bracket ----------------------------
    # Use "[{" for array tools to skip any duplicate "[MARKER]" tokens the
    # model may have emitted before the actual JSON array.
    if marker in ("GRAPH", "WRITE_TO_EDITOR"):  # Array-type tools — trim to first [{ to skip re-emitted marker tokens
        start = body.find("[{")
        if start != -1:  # Prefer [{ to skip stray [ before the actual objects
            body = body[start:]
        else:
            start = body.find("[")
            if start != -1:  # Fall back to any [ if [{ not found
                body = body[start:]
    elif marker in ("NAVIGATE", "CREATE_REPO", "MESSAGE"):  # Object-type tools — trim to first {
        start = body.find("{")
        if start != -1:
            body = body[start:]

    # --- Sanitise latex block content in WRITE_TO_EDITOR -----------------
    if marker == "WRITE_TO_EDITOR":  # Sanitise LaTeX block content so KaTeX receives clean input
        try:
            arr_end = body.rfind("]")
            if arr_end != -1:
                # Fix backslashes before JSON parsing (handles both bare \frac
                # and already-doubled \\frac without breaking either).
                json_str = _fix_latex_backslashes(body[:arr_end + 1])
                blocks = json.loads(json_str)
                for block in blocks:  # Iterate blocks to strip $ delimiters from latex content
                    if isinstance(block, dict) and block.get("type") == "latex":
                        block["content"] = _sanitise_latex_content(
                            str(block.get("content", ""))
                        )
                # Always re-serialise so the frontend gets properly escaped JSON.
                body = json.dumps(blocks, ensure_ascii=False) + body[arr_end + 1:]
        except Exception:
            # Fallback: at least fix bare backslashes in the raw body text.
            body = _fix_latex_backslashes(body)

    return f"[{marker}]\n{body}"


def _load_noot_prompt() -> str:
    """Load the Noot agent system prompt from disk, or fall back to a default."""
    if NOOT_PROMPT_PATH:
        return NOOT_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "You are Noot, a helpful AI study companion."


@app.post("/api/noot")
async def noot_chat(body: PromptRequest):
    """Noot agent endpoint — decides between plain text and graph responses."""
    messages = [m.model_dump() for m in body.messages]
    if not messages or messages[0].get("role") != "system":  # Inject Noot system prompt if not already present
        messages.insert(0, {"role": "system", "content": _load_noot_prompt()})
    try:
        content = await nim_graph(messages)  # Call Super 49B for full agent reasoning
        content = _normalise_noot_response(content)  # Normalize tool markers and fix LaTeX/JSON encoding
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM noot failed: {e}")
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

async def _embed_document_safe(repo_id: str, user_id: str, doc: dict):
    """Legacy fire-and-forget — kept for compatibility."""
    try:
        markdown = blocks_to_markdown(doc.get("blocks", []), title=doc.get("title"))
        if not markdown.strip():  # Nothing to embed — skip silently
            return
        vector = await nim_embed_single(markdown)
        logger.info("Embedded doc %s/%s — %d dims", repo_id, user_id, len(vector))
    except Exception as e:
        logger.error("Background embed failed for %s/%s: %s", repo_id, user_id, e)  # Log but don't propagate — fire-and-forget


@app.post("/api/embed")
async def embed_document(body: EmbedRequest):
    """Embed document blocks and return the vector. Caller writes to Supabase."""
    texts = [
        str(b.get("content", "") or "").strip()
        for b in body.blocks
        if isinstance(b, dict) and str(b.get("content", "") or "").strip()  # Filter non-dict entries and blank blocks
    ]
    if not texts:  # Reject requests where all blocks are empty or non-text
        raise HTTPException(status_code=400, detail="Document has no content to embed")

    markdown = blocks_to_markdown(body.blocks, title=body.title)
    try:
        vector = await nim_embed_single(markdown)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM embed failed: {e}")

    return {"doc_id": body.doc_id, "embedding": vector, "dimensions": len(vector)}


class QueryEmbedRequest(BaseModel):
    text: str


@app.post("/api/embed/query")
async def embed_query(body: QueryEmbedRequest):
    """Embed a search query string and return the vector."""
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Query text is empty")
    try:
        vector = await nim_embed_single(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM embed failed: {e}")
    return {"embedding": vector}


# ─── Merge (Nemotron Nano 8B via NIM) ────────────────────────────────────────

MERGE_PROMPT_PATH = _find_prompt("merge_prompt.txt")


def _load_merge_prompt() -> str:
    """Load the document-merge system prompt from disk, or fall back to a default."""
    if MERGE_PROMPT_PATH:
        return MERGE_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return (
        "You are a document merge assistant. Merge the provided document blocks into one. "
        "Return ONLY a JSON array of block objects with 'type' and 'content' fields. "
        "After the JSON array, add a line '---MERGE_SUMMARY---' followed by a brief summary."
    )


def _format_merge_input(master: dict, forks: list[dict]) -> str:
    """Build the user message containing master + all forks for the merge model."""
    master_json = blocks_to_json_str(master.get("blocks", []))
    parts = [f"## MASTER DOCUMENT\n\n{master_json}"]

    for i, fork in enumerate(forks, 1):  # Enumerate from 1 for human-readable FORK-1, FORK-2 labels
        fork_json = blocks_to_json_str(fork.get("blocks", []))
        user_id = fork.get("userId", "unknown")
        parts.append(f"## FORK-{i} (contributor: {user_id})\n\n{fork_json}")

    return "\n\n---\n\n".join(parts)


def _parse_merge_result(result: str) -> tuple[list[dict], str]:
    """Parse merge model output into (blocks, summary)."""
    separator = "---MERGE_SUMMARY---"
    if separator in result:
        merged_raw, summary = result.split(separator, 1)
    else:
        merged_raw, summary = result, "Merge completed (no summary generated)."

    merged_raw = merged_raw.strip()

    # Strip ```json ... ``` fences if present
    if merged_raw.startswith("```"):
        merged_raw = re.sub(r"^```\w*\n?", "", merged_raw)
        merged_raw = re.sub(r"\n?```\s*$", "", merged_raw)
        merged_raw = merged_raw.strip()

    # ── Strategy 1: find a JSON array ────────────────────────────────────────
    bracket_idx = merged_raw.find("[")
    if bracket_idx >= 0:  # Found a JSON array in the response — attempt direct parse
        candidate = merged_raw[bracket_idx:]
        try:
            blocks = json.loads(candidate)
            if isinstance(blocks, list):  # Valid array — assign IDs and return immediately
                for b in blocks:  # Ensure every block has the required fields
                    b["id"] = uuid.uuid4().hex[:8]
                    b.setdefault("type", "paragraph")
                    b.setdefault("content", "")
                return blocks, summary.strip()
        except json.JSONDecodeError:  # Not valid JSON — fall through to strategy 2
            pass

    # ── Strategy 2: model returned ---\n{obj}\n--- delimited blocks ──────────
    # Strip leading/trailing --- lines and split on blank-line-separated objects
    lines = merged_raw.splitlines()
    json_chunks: list[str] = []
    current: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped == "---":  # Delimiter found — flush the accumulated block
            if current:  # Only flush when there's content to flush
                json_chunks.append("\n".join(current).strip())
                current = []
        else:
            if stripped:  # Skip blank lines within a block
                current.append(line)
    if current:  # Flush any remaining block that wasn't followed by a ---
        json_chunks.append("\n".join(current).strip())

    blocks: list[dict] = []
    for chunk in json_chunks:
        if not chunk:  # Skip empty strings from consecutive --- delimiters
            continue
        # Each chunk may be a single object or a JSON array
        try:
            parsed = json.loads(chunk)
            if isinstance(parsed, list):  # Chunk is a JSON array of blocks — extend the list
                blocks.extend(parsed)
            elif isinstance(parsed, dict):  # Chunk is a single block object — append it
                blocks.append(parsed)
        except json.JSONDecodeError:
            continue

    if blocks:
        for b in blocks:  # Normalize each parsed block before returning
            b["id"] = uuid.uuid4().hex[:8]
            b.setdefault("type", "paragraph")
            b.setdefault("content", "")
        return blocks, summary.strip()

    # ── Strategy 3: extract every {...} object anywhere in the text ──────────
    objects = re.findall(r'\{[^{}]+\}', merged_raw)
    for obj_str in objects:
        try:
            b = json.loads(obj_str)
            if "type" in b or "content" in b:  # Only include objects that look like valid block dicts
                b["id"] = uuid.uuid4().hex[:8]
                b.setdefault("type", "paragraph")
                b.setdefault("content", "")
                blocks.append(b)
        except json.JSONDecodeError:
            continue

    if blocks:
        return blocks, summary.strip()

    logger.warning("Merge model returned unparseable content: %s", merged_raw[:300])
    return [], summary.strip()


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
        if doc["repoId"] == repo_id and doc.get("userId") != "master"  # Collect all non-master forks for this repo
    ]
    if not forks:  # Nothing to merge — abort early
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
    merged_blocks, summary = _parse_merge_result(result)

    # 6. Update master document with merged content
    # Empty blocks = model found no changes; keep master as-is
    if merged_blocks:
        master["blocks"] = merged_blocks
    master["updatedAt"] = now_iso()
    master["version"] = _bump_version(master.get("version", "1.0.0"))
    write_doc(master)

    return {
        "data": master,
        "summary": summary,
        "forks_merged": len(forks),
    }


@app.post("/api/merge")
async def merge_documents_direct(body: MergeRequest):
    """
    Merge a fork into a master document using blocks supplied directly in the
    request body.  Returns the merged blocks + a summary; the caller is
    responsible for persisting the result.
    """
    master = {"blocks": body.master_blocks}
    fork   = {"blocks": body.fork_blocks, "userId": body.fork_label}

    merge_prompt = _load_merge_prompt()

    master_json = blocks_to_json_str(master.get("blocks", []))
    fork_json   = blocks_to_json_str(fork.get("blocks", []))
    user_content = (
        f"## {body.master_label}\n\n{master_json}"
        f"\n\n---\n\n## {body.fork_label}\n\n{fork_json}"
    )

    try:
        result = await nim_chat(
            messages=[
                {"role": "system", "content": merge_prompt},
                {"role": "user",   "content": user_content},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NIM merge failed: {e}")

    merged_blocks, summary = _parse_merge_result(result)

    logger.info("Merge result: %d blocks, raw[:120]=%s", len(merged_blocks), repr(result[:120]))

    return {
        "merged_blocks": merged_blocks,
        "summary": summary,
        "raw_preview": result[:300] if not merged_blocks else None,
    }



def _bump_version(version: str) -> str:
    """Increment the patch version: 1.0.0 → 1.0.1."""
    try:
        parts = version.split(".")
        if len(parts) == 3:  # Only bump if the version string follows semver (X.Y.Z) format
            parts[2] = str(int(parts[2]) + 1)  # Increment the patch segment
            return ".".join(parts)
    except (ValueError, IndexError):  # Malformed patch segment — return the version unchanged
        pass
    return version
