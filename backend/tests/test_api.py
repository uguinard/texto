from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.database import get_session, init_database
from app.main import app
from app.schemas import MAX_TEXT_LENGTH
from app.services.texts import (
    MAX_SENTENCE_LENGTH,
    MAX_SENTENCES_PER_TEXT,
    MAX_TOKENS_PER_TEXT,
)
from tests.test_p1_fixes import memory_engine


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = memory_engine()
    init_database(engine)

    def override() -> Iterator[Session]:
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_session] = override
    # Not used as a context manager so the real-DB lifespan never runs.
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def import_text(client: TestClient, raw: str = "The cat sleeps. The dog runs.") -> int:
    response = client.post(
        "/api/texts", json={"title": "T", "language": "en", "raw_text": raw}
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_mock_lookup_is_deterministic(client: TestClient) -> None:
    body = {"text": "hello big world"}
    first = client.post("/api/mock-lookup", json=body)
    assert first.status_code == 200
    assert first.json() == client.post("/api/mock-lookup", json=body).json()


def test_text_import_list_render_delete(client: TestClient) -> None:
    text_id = import_text(client)

    assert [t["id"] for t in client.get("/api/texts").json()] == [text_id]

    render = client.get(f"/api/texts/{text_id}/render")
    assert render.status_code == 200
    assert len(render.json()["sentences"]) == 2

    assert client.delete(f"/api/texts/{text_id}").status_code == 204
    assert client.get("/api/texts").json() == []
    assert client.get(f"/api/texts/{text_id}/render").status_code == 404
    assert client.delete(f"/api/texts/{text_id}").status_code == 404


def test_import_validation(client: TestClient) -> None:
    too_long = "a" * (MAX_TEXT_LENGTH + 1)
    response = client.post(
        "/api/texts", json={"title": "T", "language": "en", "raw_text": too_long}
    )
    assert response.status_code == 422
    assert client.post("/api/texts", json={"title": "T"}).status_code == 422


def test_import_limits_accept_sentence_boundary_and_reject_oversized_work(
    client: TestClient,
) -> None:
    boundary = client.post(
        "/api/texts",
        json={
            "title": "Boundary",
            "language": "en",
            "raw_text": "x" * MAX_SENTENCE_LENGTH,
        },
    )
    assert boundary.status_code == 201

    token_limit_sentences = MAX_TOKENS_PER_TEXT // 4_901 + 1
    over_limit_inputs = (
        "x" * (MAX_SENTENCE_LENGTH + 1),
        ". " * (MAX_SENTENCES_PER_TEXT + 1),
        ("x " * 4_900 + ". ") * token_limit_sentences,
    )
    for raw_text in over_limit_inputs:
        response = client.post(
            "/api/texts",
            json={"title": "Too large", "language": "en", "raw_text": raw_text},
        )
        assert response.status_code == 422
        assert response.json()["detail"]

    assert [item["title"] for item in client.get("/api/texts").json()] == ["Boundary"]


def test_vocab_save_is_idempotent_and_deletable(client: TestClient) -> None:
    text_id = import_text(client)
    sentence = client.get(f"/api/texts/{text_id}/render").json()["sentences"][0]
    token = next(t for t in sentence["tokens"] if t["surface"] == "cat")
    payload = {"text_id": text_id, "token_id": token["id"]}

    first = client.post("/api/vocab", json=payload)
    second = client.post("/api/vocab", json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert len(client.get("/api/lexicon").json()) == 1

    item_id = first.json()["id"]
    assert client.delete(f"/api/lexicon/{item_id}").status_code == 204
    assert client.get("/api/lexicon").json() == []


def test_practice_session_empty_without_vocabulary(client: TestClient) -> None:
    response = client.get("/api/practice/session")
    assert response.status_code == 200
    assert response.json() == []


def test_unknown_resources_return_404(client: TestClient) -> None:
    assert client.delete("/api/lexicon/999").status_code == 404
    assert client.delete("/api/annotations/999").status_code == 404
    assert client.delete("/api/lexicon/chunks/999").status_code == 404
