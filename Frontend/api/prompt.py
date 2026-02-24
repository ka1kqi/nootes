"""
Vercel serverless function — /api/prompt

Thin proxy that forwards a chat conversation to the OpenAI chat completions
API and returns the assistant's reply.  The caller supplies the model and
the full message history; this handler just injects the API key from the
environment so it is never exposed to the browser.

Environment variables required:
    OPENAI_API  — OpenAI secret key
"""

import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    """Vercel HTTP handler for the /api/prompt endpoint.

    Accepts POST requests with a JSON body::

        {
            "model":    "gpt-4o",          # optional, defaults to gpt-4o
            "messages": [...]              # OpenAI message array
        }

    Returns ``{ "content": "<reply>" }`` on success, or an error object.
    OPTIONS is handled for CORS preflight.
    """

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        """Forward the chat request to OpenAI and stream back the reply."""
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

        # Build the OpenAI request payload from the client-supplied fields
        payload = json.dumps({
            "model": body.get("model", "gpt-4o"),
            "messages": body.get("messages", []),
        }).encode()

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:  # Open connection and read full response body
                data = json.loads(resp.read())
            # Extract the assistant's text from the first choice
            content = data["choices"][0]["message"]["content"]
            self._json(200, {"content": content})
        except urllib.error.HTTPError as e:  # Forward HTTP errors from OpenAI (e.g. 401 invalid key, 429 rate limit)
            self._json(e.code, {"error": e.read().decode()})
        except Exception as e:  # Catch network failures, timeouts, and JSON parse errors
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
