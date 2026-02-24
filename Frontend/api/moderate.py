"""
Vercel serverless function — /api/moderate

Proxies a chat message to OpenAI (gpt-4o-mini) using a content moderation
prompt and returns { "allowed": bool } to the caller.  Intended for
real-time chat safety checks before storing a message in Supabase.

Environment variables required:
    OPENAI_API  — OpenAI secret key
"""

import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Resolve moderation prompt file relative to this script's location
MODERATION_PROMPT_PATH = Path(__file__).parent.parent / "gpt_prompts" / "moderation_prompt.txt"

def _load_moderation_prompt() -> str:
    """Load the moderation system prompt from disk, or fall back to a minimal default.

    Returns:
        The prompt string to send as the system message.
    """
    try:
        return MODERATION_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "If the message is appropriate reply YES, otherwise reply NO."

def _openai(api_key: str, messages: list, model: str = "gpt-4o-mini") -> str:
    """Send a chat completion request to the OpenAI API and return the reply text.

    Args:
        api_key:  OpenAI secret key.
        messages: Conversation history in OpenAI message format.
        model:    Model identifier to use (default: gpt-4o-mini).

    Returns:
        The assistant's reply content as a plain string.

    Raises:
        urllib.error.HTTPError: On non-2xx responses from the API.
    """
    payload = json.dumps({"model": model, "messages": messages}).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"]


class handler(BaseHTTPRequestHandler):
    """Vercel HTTP handler for the /api/moderate endpoint.

    Accepts POST requests with a JSON body ``{ "message": "..." }`` and
    returns ``{ "allowed": true|false }`` after consulting the moderation model.
    OPTIONS is handled for CORS preflight.
    """

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        """Moderate a chat message and return an allowed/blocked decision."""
        api_key = os.environ.get("OPENAI_API", "")
        if not api_key:  # Fail fast before making any external calls
            self._json(500, {"error": "OPENAI_API key not configured"})
            return

        # Parse the incoming JSON body
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except Exception:  # Malformed or missing body — return 400
            self._json(400, {"error": "Invalid JSON body"})
            return

        try:
            result = _openai(
                api_key,
                [
                    {"role": "system", "content": _load_moderation_prompt()},
                    {"role": "user", "content": body.get("message", "")},
                ],
                model="gpt-4o-mini",
            )
            # Model is expected to reply with "YES" (safe) or "NO" (blocked)
            allowed = result.strip().upper().startswith("YES")
            self._json(200, {"allowed": allowed})
        except urllib.error.HTTPError as e:  # Forward HTTP errors from OpenAI (e.g. 429 rate limit)
            self._json(e.code, {"error": e.read().decode()})
        except Exception as e:  # Catch network failures, timeouts, and unexpected errors
            self._json(500, {"error": str(e)})

    def _cors(self):
        """Append CORS headers to the current response."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, data: dict):
        """Write a JSON response with the given HTTP status code.

        Args:
            status: HTTP status code (e.g. 200, 400, 500).
            data:   Dict to serialise as the response body.
        """
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)
