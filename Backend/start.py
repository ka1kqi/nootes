"""
Nootes Backend entrypoint — used by Docker / cloud run commands.

Reads the PORT env var (default 8080), performs a pre-flight import of
main.py to catch configuration errors early, then starts uvicorn serving
the FastAPI app on all interfaces.
"""

import os
import sys
import uvicorn

# Resolve the port from environment (Render, Railway, Cloud Run, etc. inject PORT)
port = int(os.environ.get("PORT", "8080"))
print(f"[start] PORT={port}  cwd={os.getcwd()}  python={sys.version}", flush=True)

# Pre-flight: verify main.py imports cleanly so errors show in logs before
# uvicorn swallows startup output.
try:
    from main import app  # noqa: F401
    print("[start] main.py imported OK", flush=True)
except Exception as exc:  # Import failure — log the error and exit so the container restarts cleanly
    print(f"[start] FATAL import error: {exc}", flush=True)
    sys.exit(1)

# Start the ASGI server; listen on all interfaces so Docker port mapping works
uvicorn.run("main:app", host="0.0.0.0", port=port)
