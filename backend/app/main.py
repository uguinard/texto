from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .database import create_db_and_tables
from .routers.annotations import router as annotations_router
from .routers.lookup import router as lookup_router
from .routers.practice import router as practice_router
from .routers.texts import router as texts_router
from .routers.vocabulary import router as vocabulary_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield


class MockLookupRequest(BaseModel):
    text: str


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)
app.include_router(texts_router)
app.include_router(annotations_router)
app.include_router(lookup_router)
app.include_router(vocabulary_router)
app.include_router(practice_router)

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
