#!/bin/bash
# Start the WhisperX FastAPI alignment service.
# Creates a local .venv, installs dependencies, then runs uvicorn on 127.0.0.1:8765.

set -e

cd "$(dirname "$0")"

# Create venv if it does not exist
if [ ! -d ".venv" ]; then
  echo "[whisperx] Creating Python venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "[whisperx] Installing dependencies (quiet)..."
pip install -r requirements.txt -q

echo "[whisperx] Starting service on 127.0.0.1:8765..."
exec uvicorn main:app --host 127.0.0.1 --port 8765
