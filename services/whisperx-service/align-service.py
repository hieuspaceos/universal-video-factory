# WhisperX alignment logic — loads model once at startup, exposes align() function.
# Uses "base" model for CPU inference (~30s on M4 for 2-3 min audio).

import tempfile
import os
from typing import Optional

import whisperx

# Model cache — loaded once per process lifecycle
_whisper_model = None
_align_models: dict = {}
_device = "cpu"
_compute_type = "int8"
_model_size = "base"


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print(f"[align-service] Loading WhisperX model '{_model_size}' on {_device}...")
        _whisper_model = whisperx.load_model(
            _model_size,
            device=_device,
            compute_type=_compute_type,
        )
        print("[align-service] Model loaded.")
    return _whisper_model


def _get_align_model(language_code: str):
    if language_code not in _align_models:
        print(f"[align-service] Loading alignment model for language '{language_code}'...")
        model, metadata = whisperx.load_align_model(
            language_code=language_code,
            device=_device,
        )
        _align_models[language_code] = (model, metadata)
        print(f"[align-service] Alignment model loaded for '{language_code}'.")
    return _align_models[language_code]


def align_audio(audio_bytes: bytes, language: Optional[str] = "en") -> list[dict]:
    """
    Transcribe and force-align audio bytes.
    Returns list of word-level dicts: [{word, start, end}, ...]
    """
    lang = language or "en"

    # Write to temp file — whisperx needs a file path
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = _get_whisper_model()

        # Transcribe
        audio = whisperx.load_audio(tmp_path)
        result = model.transcribe(audio, language=lang, batch_size=4)

        # Force align
        align_model, metadata = _get_align_model(lang)
        aligned = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio,
            device=_device,
            return_char_alignments=False,
        )

        # Extract word-level timestamps
        words = []
        for segment in aligned.get("segments", []):
            for w in segment.get("words", []):
                entry = {
                    "word": w.get("word", "").strip(),
                    "start": round(float(w.get("start", 0)), 3),
                    "end": round(float(w.get("end", 0)), 3),
                }
                if entry["word"]:
                    words.append(entry)

        return words

    finally:
        os.unlink(tmp_path)
