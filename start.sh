#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[backend] installing dependencies..."
cd "$ROOT/Backend"
pip install -q -r requirements.txt

echo "[backend] starting FastAPI on :3001..."
uvicorn main:app --port 3001 --reload &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[frontend] installing dependencies..."
cd "$ROOT/Frontend"
bun install --silent

echo "[frontend] starting Vite dev server..."
bun run dev &
FRONTEND_PID=$!

# ── Shutdown handler ─────────────────────────────────────────────────────────
trap "echo ''; echo 'shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

echo ""
echo "  backend  → http://localhost:3001"
echo "  frontend → http://localhost:5173"
echo ""
echo "  press Ctrl+C to stop both"
echo ""

wait
