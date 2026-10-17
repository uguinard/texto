import re

from sqlmodel import Session

from ..models import Sentence, Text
from ..schemas import TextImportRequest, TextImportResponse


def split_sentences(raw_text: str) -> list[str]:
    return [
        sentence
        for part in re.split(r"(?<=[.!?])\s+", raw_text.strip())
        if (sentence := part.strip())
    ]


def create_text(session: Session, request: TextImportRequest) -> TextImportResponse:
    sentences = split_sentences(request.raw_text)
    text = Text(
        title=request.title,
        language=request.language,
        raw_text=request.raw_text,
    )
    session.add(text)
    session.flush()

    text_id = text.id
    if text_id is None:
        raise RuntimeError("The database did not assign an ID to the imported text.")

    session.add_all(
        Sentence(text_id=text_id, position=index, content=sentence)
        for index, sentence in enumerate(sentences)
    )
    session.commit()
    session.refresh(text)

    return TextImportResponse(
        id=text_id,
        sentence_count=len(sentences),
        approximate_token_count=len(request.raw_text.split()),
    )
