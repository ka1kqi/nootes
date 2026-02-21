"""
Markdown ↔ Block conversion utilities for Nootes.

File format:
  - YAML front matter (---…---) for document metadata
  - Body is standard Markdown with extensions:
      # / ## / ###   → h1 / h2 / h3
      > text          → quote
      $$ … $$         → latex
      ```lang file … ``` → code
      ---             → divider
      :::callout type → callout
      :::chemistry    → chemistry  (KaTeX rendered)
      :::table        → table      (CSV rows)
"""

from __future__ import annotations

import re
import uuid
import json
from typing import Any


# ─── Block → Markdown ────────────────────────────────────────────────────────

def blocks_to_markdown(blocks: list[dict]) -> str:
    """Serialize a list of block dicts into a Markdown string."""
    parts: list[str] = []

    for block in blocks:
        btype = block.get("type", "paragraph")
        content = block.get("content", "")
        meta = block.get("meta") or {}

        if btype == "h1":
            parts.append(f"# {content}\n")
        elif btype == "h2":
            parts.append(f"## {content}\n")
        elif btype == "h3":
            parts.append(f"### {content}\n")
        elif btype == "quote":
            # Multi-line quotes: prefix each line with >
            lines = content.split("\n") if content else [""]
            quoted = "\n".join(f"> {l}" for l in lines)
            parts.append(quoted + "\n")
        elif btype == "latex":
            parts.append(f"$$\n{content}\n$$\n")
        elif btype == "code":
            lang = meta.get("language", "plaintext")
            filename = meta.get("filename", "")
            header = lang
            if filename:
                header += f" {filename}"
            parts.append(f"```{header}\n{content}\n```\n")
        elif btype == "chemistry":
            caption = meta.get("caption", "")
            cap_attr = f' caption="{caption}"' if caption else ""
            parts.append(f":::chemistry{cap_attr}\n{content}\n:::\n")
        elif btype == "table":
            caption = meta.get("caption", "")
            cap_attr = f' caption="{caption}"' if caption else ""
            parts.append(f":::table{cap_attr}\n{content}\n:::\n")
        elif btype == "callout":
            callout_type = meta.get("calloutType", "info")
            parts.append(f":::callout {callout_type}\n{content}\n:::\n")
        elif btype == "divider":
            parts.append("---\n")
        else:
            # paragraph
            parts.append(f"{content}\n")

    return "\n".join(parts)


# ─── Markdown → Blocks ──────────────────────────────────────────────────────

def _new_id() -> str:
    return str(uuid.uuid4())


def markdown_to_blocks(md: str) -> list[dict]:
    """Parse a Markdown string into a list of block dicts."""
    lines = md.split("\n")
    blocks: list[dict] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]

        # ── Blank line → skip (paragraph separator) ─────────────────────
        if line.strip() == "":
            i += 1
            continue

        # ── Divider: --- (standalone, not in front matter) ──────────────
        if re.match(r"^---+\s*$", line) and blocks:  # skip if no blocks yet (front matter)
            blocks.append({"id": _new_id(), "type": "divider", "content": ""})
            i += 1
            continue

        # ── Headings ────────────────────────────────────────────────────
        heading_match = re.match(r"^(#{1,3})\s+(.*)$", line)
        if heading_match:
            level = len(heading_match.group(1))
            content = heading_match.group(2)
            blocks.append({
                "id": _new_id(),
                "type": f"h{level}",
                "content": content,
            })
            i += 1
            continue

        # ── Fenced code block ```lang filename ──────────────────────────
        code_match = re.match(r"^```(\S*)\s*(.*)?$", line)
        if code_match:
            lang = code_match.group(1) or "plaintext"
            filename = (code_match.group(2) or "").strip()
            code_lines: list[str] = []
            i += 1
            while i < n and not re.match(r"^```\s*$", lines[i]):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            meta: dict[str, Any] = {"language": lang}
            if filename:
                meta["filename"] = filename
            blocks.append({
                "id": _new_id(),
                "type": "code",
                "content": "\n".join(code_lines),
                "meta": meta,
            })
            continue

        # ── LaTeX block $$ … $$ ─────────────────────────────────────────
        if line.strip() == "$$":
            latex_lines: list[str] = []
            i += 1
            while i < n and lines[i].strip() != "$$":
                latex_lines.append(lines[i])
                i += 1
            i += 1  # skip closing $$
            blocks.append({
                "id": _new_id(),
                "type": "latex",
                "content": "\n".join(latex_lines),
            })
            continue

        # ── Directive fences :::type meta ───────────────────────────────
        directive_match = re.match(r"^:::(chemistry|table|callout)\s*(.*)$", line)
        if directive_match:
            dtype = directive_match.group(1)
            meta_str = directive_match.group(2).strip()
            body_lines: list[str] = []
            i += 1
            while i < n and lines[i].strip() != ":::":
                body_lines.append(lines[i])
                i += 1
            i += 1  # skip closing :::
            body = "\n".join(body_lines)

            if dtype == "chemistry":
                caption = _parse_caption(meta_str)
                meta_dict: dict[str, Any] = {}
                if caption:
                    meta_dict["caption"] = caption
                blocks.append({
                    "id": _new_id(),
                    "type": "chemistry",
                    "content": body,
                    "meta": meta_dict,
                })
            elif dtype == "table":
                caption = _parse_caption(meta_str)
                meta_dict = {}
                if caption:
                    meta_dict["caption"] = caption
                blocks.append({
                    "id": _new_id(),
                    "type": "table",
                    "content": body,
                    "meta": meta_dict,
                })
            elif dtype == "callout":
                callout_type = meta_str or "info"
                blocks.append({
                    "id": _new_id(),
                    "type": "callout",
                    "content": body,
                    "meta": {"calloutType": callout_type},
                })
            continue

        # ── Blockquote > text ───────────────────────────────────────────
        if line.startswith("> ") or line == ">":
            quote_lines: list[str] = []
            while i < n and (lines[i].startswith("> ") or lines[i] == ">"):
                quote_lines.append(lines[i][2:] if lines[i].startswith("> ") else "")
                i += 1
            blocks.append({
                "id": _new_id(),
                "type": "quote",
                "content": "\n".join(quote_lines),
            })
            continue

        # ── Paragraph (default) ─────────────────────────────────────────
        para_lines: list[str] = []
        while i < n and lines[i].strip() != "":
            # Stop if we hit a special line
            if (re.match(r"^#{1,3}\s+", lines[i]) or
                re.match(r"^```", lines[i]) or
                lines[i].strip() == "$$" or
                re.match(r"^:::", lines[i]) or
                re.match(r"^---+\s*$", lines[i]) or
                lines[i].startswith("> ")):
                break
            para_lines.append(lines[i])
            i += 1
        if para_lines:
            blocks.append({
                "id": _new_id(),
                "type": "paragraph",
                "content": "\n".join(para_lines),
            })

    return blocks


def _parse_caption(meta_str: str) -> str:
    """Extract caption="…" from a meta string."""
    m = re.search(r'caption="([^"]*)"', meta_str)
    return m.group(1) if m else ""


# ─── Full document serialization with YAML front matter ─────────────────────

def document_to_markdown(doc: dict) -> str:
    """Serialize a full document dict (with metadata + blocks) to a .md file."""
    # Build front matter
    fm: dict[str, Any] = {}
    for key in ("id", "repoId", "userId", "title", "course", "professor",
                "semester", "version", "contributorCount", "tags",
                "createdAt", "updatedAt"):
        if key in doc and doc[key] is not None:
            fm[key] = doc[key]

    # Simple YAML serialization (no dependency needed for our flat structure)
    fm_lines = ["---"]
    for k, v in fm.items():
        if isinstance(v, list):
            fm_lines.append(f"{k}: {json.dumps(v)}")
        elif isinstance(v, (int, float)):
            fm_lines.append(f"{k}: {v}")
        else:
            # Quote strings that contain colons or special chars
            fm_lines.append(f'{k}: "{v}"')
    fm_lines.append("---")

    body = blocks_to_markdown(doc.get("blocks", []))
    return "\n".join(fm_lines) + "\n\n" + body


def markdown_to_document(md: str, fallback_key: str = "") -> dict:
    """Parse a .md file (with optional YAML front matter) into a document dict."""
    doc: dict[str, Any] = {}
    body = md

    # Extract front matter
    if md.startswith("---"):
        end = md.find("\n---", 3)
        if end != -1:
            fm_text = md[4:end].strip()
            body = md[end + 4:].strip()
            doc = _parse_simple_yaml(fm_text)

    # Ensure required fields
    if "id" not in doc:
        doc["id"] = _new_id()
    if "repoId" not in doc and fallback_key:
        parts = fallback_key.split("--")
        if len(parts) >= 2:
            doc["repoId"] = parts[0]
            doc["userId"] = parts[1]

    doc["blocks"] = markdown_to_blocks(body)
    return doc


def _parse_simple_yaml(text: str) -> dict[str, Any]:
    """Minimal YAML parser for our flat front matter (no nested objects)."""
    result: dict[str, Any] = {}
    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r'^(\w+):\s*(.*)$', line)
        if not m:
            continue
        key = m.group(1)
        val = m.group(2).strip()

        # Try JSON array
        if val.startswith("["):
            try:
                result[key] = json.loads(val)
                continue
            except json.JSONDecodeError:
                pass

        # Unquote strings
        if (val.startswith('"') and val.endswith('"')) or \
           (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]

        # Try numeric
        if val.isdigit():
            result[key] = int(val)
            continue

        result[key] = val

    return result
