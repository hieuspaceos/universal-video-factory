# FastAPI entry point for the WhisperX alignment service.
# Binds to 127.0.0.1:8765 only — no external access.
# Endpoints: GET /health, POST /align

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

from align_service import align_audio

app = FastAPI(title="WhisperX Alignment Service", version="1.0.0")


@app.get("/health")
async def health():
    """Liveness check — returns 200 when service is ready."""
    return {"status": "ok"}


@app.post("/align")
async def align(
    audio: UploadFile = File(..., description="WAV audio file to align"),
    language: Optional[str] = Form("en", description="BCP-47 language code, e.g. 'en', 'vi'"),
):
    """
    Accepts a WAV audio file and returns word-level timestamps.

    Response schema:
    {
      "words": [{"word": "Hello", "start": 0.12, "end": 0.45}, ...]
    }
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    content_type = audio.content_type or ""
    if not (content_type.startswith("audio/") or audio.filename.endswith((".wav", ".mp3", ".m4a"))):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        words = align_audio(audio_bytes, language=language)
        return JSONResponse(content={"words": words})

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Alignment failed: {str(exc)}") from exc
