from datetime import UTC, datetime
from typing import Literal, TypeGuard

from sqlmodel import Session, col, select

from ..models import (
    SavedChunk,
    Sentence,
    Text,
    Token,
)
from ..schemas import SavedChunkCreateRequest, SavedChunkResponse, SavedChunkUpdateRequest


def create_saved_chunk(
    session: Session,
    request: SavedChunkCreateRequest,
) -> SavedChunkResponse | None:
    text = session.get(Text, request.text_id)
    sentence = session.get(Sentence, request.sentence_id)
    start_token = session.get(Token, request.start_token_id)
    end_token = session.get(Token, request.end_token_id)
    if (
        text is None
        or sentence is None
        or start_token is None
        or end_token is None
        or text.id is None
        or sentence.id is None
        or start_token.id is None
        or end_token.id is None
    ):
        return None
    if (
        sentence.text_id != text.id
        or start_token.sentence_id != sentence.id
        or end_token.sentence_id != sentence.id
    ):
        raise ValueError("The selected tokens must belong to the specified sentence and text.")
    if start_token.order_index > end_token.order_index:
        raise ValueError("The start token must come before or match the end token.")

    existing = session.exec(
        select(SavedChunk).where(
            col(SavedChunk.text_id) == text.id,
            col(SavedChunk.sentence_id) == sentence.id,
            col(SavedChunk.start_token_id) == start_token.id,
            col(SavedChunk.end_token_id) == end_token.id,
        )
    ).first()
    if existing is not None:
        return _saved_chunk_response(session, existing)

    tokens = session.exec(
        select(Token)
        .where(col(Token.sentence_id) == sentence.id)
        .where(
            col(Token.order_index).between(
                start_token.order_index,
                end_token.order_index,
            )
        )
        .order_by(col(Token.order_index))
    ).all()
    if not tokens:
        raise RuntimeError("The selected source token range is empty.")
    if not any(
        character.isalnum()
        for token in tokens
        for character in token.surface
    ):
        raise ValueError("A saved chunk must contain at least one word.")
    phrase = "".join(token.surface + token.whitespace_after for token in tokens).rstrip()
    chunk = SavedChunk(
        text_id=text.id,
        sentence_id=sentence.id,
        start_token_id=start_token.id,
        end_token_id=end_token.id,
        phrase=phrase,
        note=request.note,
        state="learning",
    )
    session.add(chunk)
    session.commit()
    session.refresh(chunk)
    return _saved_chunk_response(session, chunk)


def list_saved_chunks(session: Session) -> list[SavedChunkResponse]:
    chunks = session.exec(
        select(SavedChunk)
        .order_by(col(SavedChunk.created_at).desc(), col(SavedChunk.id).desc())
    ).all()
    texts = _by_id(session, Text, {chunk.text_id for chunk in chunks})
    sentences = _by_id(session, Sentence, {chunk.sentence_id for chunk in chunks})
    return [
        _saved_chunk_response(
            session,
            chunk,
            text=texts.get(chunk.text_id),
            sentence=sentences.get(chunk.sentence_id),
        )
        for chunk in chunks
    ]


def _by_id(session: Session, model, ids: set[int]) -> dict:  # type: ignore[no-untyped-def]
    if not ids:
        return {}
    rows = session.exec(select(model).where(col(model.id).in_(ids))).all()
    return {row.id: row for row in rows}


def update_saved_chunk(
    session: Session,
    chunk_id: int,
    request: SavedChunkUpdateRequest,
) -> SavedChunkResponse | None:
    chunk = session.get(SavedChunk, chunk_id)
    if chunk is None:
        return None
    if "note" in request.model_fields_set:
        chunk.note = request.note
    if request.state is not None:
        chunk.state = request.state
        if request.state == "learning" and chunk.next_review is None:
            chunk.next_review = datetime.now(UTC)
        elif request.state != "learning":
            chunk.next_review = None
    session.add(chunk)
    session.commit()
    session.refresh(chunk)
    return _saved_chunk_response(session, chunk)


def delete_saved_chunk(session: Session, chunk_id: int) -> bool:
    chunk = session.get(SavedChunk, chunk_id)
    if chunk is None:
        return False
    session.delete(chunk)
    session.commit()
    return True


def _saved_chunk_response(
    session: Session,
    chunk: SavedChunk,
    text: Text | None = None,
    sentence: Sentence | None = None,
) -> SavedChunkResponse:
    text = text or session.get(Text, chunk.text_id)
    sentence = sentence or session.get(Sentence, chunk.sentence_id)
    if (
        chunk.id is None
        or chunk.created_at is None
        or text is None
        or text.id is None
        or sentence is None
        or sentence.id is None
        or not _is_saved_chunk_state(chunk.state)
    ):
        raise RuntimeError("The database contains incomplete saved-chunk data.")
    return SavedChunkResponse(
        id=chunk.id,
        text_id=text.id,
        text_title=text.title,
        language=text.language,
        sentence_id=sentence.id,
        start_token_id=chunk.start_token_id,
        end_token_id=chunk.end_token_id,
        phrase=chunk.phrase,
        source_sentence=sentence.content,
        note=chunk.note,
        state=chunk.state,
        created_at=chunk.created_at,
        next_review=chunk.next_review,
    )


def _is_saved_chunk_state(
    value: str,
) -> TypeGuard[Literal["new", "learning", "known"]]:
    return value in {"new", "learning", "known"}
