import os
import uvicorn

port = int(os.environ.get("PORT", "3001"))
uvicorn.run("main:app", host="0.0.0.0", port=port)
