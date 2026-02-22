import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler
from pathlib import Path

MODERATION_PROMPT_PATH = Path(__file__).parent.parent / "gpt_prompts" / "moderation_prompt.txt"

def _load_moderation_prompt() -> str:
    try:
        return MODERATION_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "If the message is appropriate reply YES, otherwise reply NO."

def _openai(api_key: str, messages: list, model: str = "gpt-4o-mini") -> str:
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
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        api_key = os.environ.get("OPENAI_API", "")
        if not api_key:
            self._json(500, {"error": "OPENAI_API key not configured"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except Exception:
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
            allowed = result.strip().upper().startswith("YES")
            self._json(200, {"allowed": allowed})
        except urllib.error.HTTPError as e:
            self._json(e.code, {"error": e.read().decode()})
        except Exception as e:
            self._json(500, {"error": str(e)})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)
