#!/bin/bash
# start.sh — Development convenience script.
# Starts the FastAPI backend and the Vite frontend in parallel.
# Press Ctrl+C to gracefully stop both processes.
set -e  # Exit immediately if any command fails

# Resolve the repo root regardless of the working directory
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[backend] setting up virtual environment..."
cd "$ROOT/Backend"

# Create the virtual environment on first run; reuse it on subsequent runs
if [ ! -d ".venv" ]; then
  python3 -m venv .venv  # Create an isolated Python environment for the backend
fi
source .venv/bin/activate  # Activate the venv for pip and uvicorn

echo "[backend] installing dependencies..."
pip install -q -r requirements.txt  # Quiet install to reduce noise

echo "[backend] starting FastAPI on :3001..."
# --reload enables hot-reloading on source changes (development only)
uvicorn main:app --port 3001 --reload &
BACKEND_PID=$!  # Capture PID so we can kill it on exit

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[frontend] installing dependencies..."
cd "$ROOT/Frontend"
bun install --silent  # Fast, quiet install via Bun

echo "[frontend] starting Vite dev server..."
bun run dev &  # Launch Vite dev server in the background
FRONTEND_PID=$!  # Capture PID so we can kill it on exit

# ── Shutdown handler ─────────────────────────────────────────────────────────
# Trap Ctrl+C (INT) and termination signals so both child processes are
# cleaned up before the script exits.
trap "echo ''; echo 'shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

echo ""
echo "  backend  → http://localhost:3001"
echo "  frontend → http://localhost:5173"
echo ""
echo "  press Ctrl+C to stop both"
echo ""

# Block until both background processes exit
wait
