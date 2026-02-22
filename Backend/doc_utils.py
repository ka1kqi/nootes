"""
JSON document storage utilities for Nootes.

File format: Plain JSON containing the full document with metadata and blocks.
"""

from __future__ import annotations

import json
import uuid
from typing import Any


def document_to_json(doc: dict) -> str:
    """Serialize a full document dict to a JSON string."""
    return json.dumps(doc, indent=2, ensure_ascii=False)


def json_to_document(text: str, fallback_key: str = "") -> dict:
    """Parse a JSON string into a document dict."""
    try:
        doc: dict[str, Any] = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        doc = {}

    # Ensure required fields
    if "id" not in doc:
        doc["id"] = str(uuid.uuid4())
    if "repoId" not in doc and fallback_key:
        parts = fallback_key.split("--")
        if len(parts) >= 2:
            doc["repoId"] = parts[0]
            doc["userId"] = parts[1]
    if "blocks" not in doc:
        doc["blocks"] = []

    return doc


def blocks_to_json_str(blocks: list[dict]) -> str:
    """Serialize blocks to a compact JSON string for LLM consumption."""
    clean = [{"type": b.get("type", "paragraph"), "content": b.get("content", "")} for b in blocks]
    return json.dumps(clean, ensure_ascii=False)


def blocks_to_markdown(blocks: list[dict], title: str | None = None) -> str:
    """Convert a list of blocks to a markdown string for LLM consumption.
    If title is provided it is prepended as an H1 so embeddings include the document title.
    """
    parts: list[str] = []
    if title and title.strip():
        parts.append(f"# {title.strip()}")
    for block in blocks:
        t = block.get("type", "paragraph")
        content = block.get("content", "")
        meta: dict = block.get("meta") or {}

        if t == "h1":
            parts.append(f"# {content}")
        elif t == "h2":
            parts.append(f"## {content}")
        elif t == "h3":
            parts.append(f"### {content}")
        elif t == "paragraph":
            parts.append(content)
        elif t == "divider":
            parts.append("---")
        elif t == "quote":
            parts.append(f"> {content}")
        elif t == "latex":
            parts.append(f"$$\n{content}\n$$")
        elif t == "chemistry":
            caption = meta.get("caption", "")
            parts.append(f"$$\n{content}\n$$" + (f"\n_{caption}_" if caption else ""))
        elif t == "code":
            lang = meta.get("language", "")
            parts.append(f"```{lang}\n{content}\n```")
        elif t == "diagram":
            parts.append(f"```mermaid\n{content}\n```")
        elif t == "table":
            caption = meta.get("caption", "")
            parts.append(content + (f"\n_{caption}_" if caption else ""))
        elif t == "callout":
            callout_type = meta.get("calloutType", "info")
            parts.append(f"> **{callout_type.upper()}:** {content}")
        else:
            parts.append(content)

    return "\n\n".join(parts)


def markdown_to_blocks(markdown: str) -> list[dict]:
    """Convert a markdown string (e.g. LLM output) into a list of blocks."""
    blocks: list[dict] = []
    lines = markdown.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        # Fenced code blocks (including mermaid)
        if line.startswith("```"):
            lang = line[3:].strip()
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            content = "\n".join(code_lines)
            if lang == "mermaid":
                blocks.append({"id": str(uuid.uuid4()), "type": "diagram", "content": content, "meta": {}})
            else:
                blocks.append({"id": str(uuid.uuid4()), "type": "code", "content": content, "meta": {"language": lang, "filename": ""}})
            i += 1
            continue

        # Display math $$...$$
        if line.strip() == "$$":
            math_lines: list[str] = []
            i += 1
            while i < len(lines) and lines[i].strip() != "$$":
                math_lines.append(lines[i])
                i += 1
            content = "\n".join(math_lines)
            blocks.append({"id": str(uuid.uuid4()), "type": "latex", "content": content})
            i += 1
            continue

        # Headings
        if line.startswith("# "):
            blocks.append({"id": str(uuid.uuid4()), "type": "h1", "content": line[2:].strip()})
        elif line.startswith("## "):
            blocks.append({"id": str(uuid.uuid4()), "type": "h2", "content": line[3:].strip()})
        elif line.startswith("### "):
            blocks.append({"id": str(uuid.uuid4()), "type": "h3", "content": line[4:].strip()})
        # Divider
        elif line.strip() == "---":
            blocks.append({"id": str(uuid.uuid4()), "type": "divider", "content": ""})
        # Blockquote / callout
        elif line.startswith("> "):
            inner = line[2:].strip()
            # Detect callout format: > **TYPE:** text
            import re
            m = re.match(r'\*\*(INFO|TIP|WARNING|IMPORTANT)\*\*:\s*(.*)', inner, re.IGNORECASE)
            if m:
                callout_type = m.group(1).lower()
                blocks.append({"id": str(uuid.uuid4()), "type": "callout", "content": m.group(2), "meta": {"calloutType": callout_type}})
            else:
                blocks.append({"id": str(uuid.uuid4()), "type": "quote", "content": inner})
        # Non-empty paragraph
        elif line.strip():
            blocks.append({"id": str(uuid.uuid4()), "type": "paragraph", "content": line.strip()})

        i += 1

    if not blocks:
        blocks.append({"id": str(uuid.uuid4()), "type": "paragraph", "content": ""})

    return blocks
