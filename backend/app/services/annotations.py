from typing import TypeGuard

from sqlmodel import Session, col, select

from ..models import Annotation, Sentence, Text, Token
from ..schemas import (
    AnnotationCategory,
    AnnotationCreateRequest,
    AnnotationResponse,
)


def create_annotation(
    session: Session,
    request: AnnotationCreateRequest,
) -> AnnotationResponse | None:
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

    annotation = Annotation(
        text_id=text.id,
        sentence_id=sentence.id,
        start_token_id=start_token.id,
        end_token_id=end_token.id,
        category=request.category,
        note=request.note,
    )
    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return _annotation_response(annotation)


def list_text_annotations(
    session: Session,
    text_id: int,
) -> list[AnnotationResponse] | None:
    if session.get(Text, text_id) is None:
        return None
    annotations = session.exec(
        select(Annotation)
        .join(Token, col(Annotation.start_token_id) == col(Token.id))
        .where(col(Annotation.text_id) == text_id)
        .order_by(col(Annotation.sentence_id), col(Token.order_index))
    ).all()
    return [
        _annotation_response(annotation)
        for annotation in annotations
        if annotation.id is not None
    ]


def delete_annotation(session: Session, annotation_id: int) -> bool:
    annotation = session.get(Annotation, annotation_id)
    if annotation is None:
        return False
    session.delete(annotation)
    session.commit()
    return True


def _annotation_response(annotation: Annotation) -> AnnotationResponse:
    if (
        annotation.id is None
        or annotation.created_at is None
        or not _is_annotation_category(annotation.category)
    ):
        raise RuntimeError("The database did not assign annotation metadata.")
    return AnnotationResponse(
        id=annotation.id,
        text_id=annotation.text_id,
        sentence_id=annotation.sentence_id,
        start_token_id=annotation.start_token_id,
        end_token_id=annotation.end_token_id,
        category=annotation.category,
        note=annotation.note,
        created_at=annotation.created_at,
    )


def _is_annotation_category(value: str) -> TypeGuard[AnnotationCategory]:
    return value in {"lexical", "syntactic", "pragmatic", "metaphor", "discourse"}
