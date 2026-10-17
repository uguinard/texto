from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings

class MockLookupRequest(BaseModel):
    text: str


class TextImportRequest(BaseModel):
    text: str


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/mock-lookup")
async def mock_lookup(request: MockLookupRequest):
    """
    Deterministic fake JSON lookup response for development.
    Returns a mock response with word analysis.
    """
    text = request.text
    words = text.strip().split()
    results = []

    for i, word in enumerate(words):
        # Deterministic mock data based on word position and content
        results.append({
            "surface": word,
            "lemma": word.lower().rstrip(".,!?;:"),
            "pos": "NOUN" if i % 3 == 0 else ("VERB" if i % 3 == 1 else "ADJ"),
            "translation": f"mock_translation_{i}",
            "definition": f"Mock definition for '{word}'",
            "confidence": "high",
            "uncertain": False,
            "source": "mock",
        })

    return {
        "text": text,
        "tokens": results,
        "mode": "mock",
    }


@app.post("/api/texts")
async def import_text(request: TextImportRequest):
    """
    Import a text for reading.
    In the future, this will save to database and return a text ID.
    """
    return {
        "id": "mock-text-id",
        "content": request.text,
        "status": "imported",
        "message": "Text imported successfully (mock mode)",
    }