"""
JSON document storage utilities for Nootes.

File format: Plain JSON containing the full document with metadata and blocks.
"""

from __future__ import annotations

import json
from typing import Any


def document_to_json(doc: dict) -> str:
    """Serialize a full document dict to a JSON string."""
    return json.dumps(doc, indent=2, ensure_ascii=False)


def json_to_document(text: str, fallback_key: str = "") -> dict:
    """Parse a JSON string into a document dict."""
    import uuid

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
