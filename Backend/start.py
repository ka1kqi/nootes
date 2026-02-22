import os
import sys
import uvicorn

port = int(os.environ.get("PORT", "8080"))
print(f"[start] PORT={port}  cwd={os.getcwd()}  python={sys.version}", flush=True)

# Pre-flight: verify main.py imports cleanly so errors show in logs
try:
    from main import app  # noqa: F401
    print("[start] main.py imported OK", flush=True)
except Exception as exc:
    print(f"[start] FATAL import error: {exc}", flush=True)
    sys.exit(1)

uvicorn.run("main:app", host="0.0.0.0", port=port)
