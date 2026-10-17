import re
from typing import Literal

from sqlmodel import Session, col, select

from ..models import Sentence, Text, Token, VocabItem
from ..schemas import (
    RenderedSentence,
    RenderedToken,
    TextImportRequest,
    TextImportResponse,
    TextListItem,
    TextRenderResponse,
)
from .tokenizer import tokenize_sentence


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

    for sentence_index, sentence_content in enumerate(sentences):
        sentence = Sentence(
            text_id=text_id,
            position=sentence_index,
            content=sentence_content,
        )
        session.add(sentence)
        session.flush()

        sentence_id = sentence.id
        if sentence_id is None:
            raise RuntimeError("The database did not assign an ID to the sentence.")

        session.add_all(
            Token(
                sentence_id=sentence_id,
                order_index=token_index,
                surface=token.surface,
                whitespace_after=token.whitespace_after,
            )
            for token_index, token in enumerate(tokenize_sentence(sentence_content))
        )

    session.commit()
    session.refresh(text)

    return TextImportResponse(
        id=text_id,
        sentence_count=len(sentences),
        approximate_token_count=len(request.raw_text.split()),
    )


def list_texts(session: Session) -> list[TextListItem]:
    texts = session.exec(select(Text).order_by(col(Text.id).desc())).all()
    return [
        TextListItem(id=text.id, title=text.title, language=text.language)
        for text in texts
        if text.id is not None
    ]


def get_text_render(session: Session, text_id: int) -> TextRenderResponse | None:
    text = session.get(Text, text_id)
    if text is None:
        return None

    sentences = session.exec(
        select(Sentence)
        .where(col(Sentence.text_id) == text_id)
        .order_by(col(Sentence.position))
    ).all()
    sentence_ids = [sentence.id for sentence in sentences if sentence.id is not None]
    tokens_by_sentence: dict[int, list[RenderedToken]] = {
        sentence_id: [] for sentence_id in sentence_ids
    }
    vocab_items = session.exec(
        select(VocabItem).where(VocabItem.language == text.language)
    ).all()
    vocab_states: dict[str, Literal["learning", "known"]] = {}
    for item in vocab_items:
        if item.state not in {"learning", "known"}:
            continue
        for form in (item.surface, item.lemma):
            if form is None:
                continue
            normalized_form = form.casefold()
            current_state = vocab_states.get(normalized_form)
            if item.state == "known" or current_state is None:
                vocab_states[normalized_form] = (
                    "known" if item.state == "known" else "learning"
                )

    if sentence_ids:
        tokens = session.exec(
            select(Token)
            .where(col(Token.sentence_id).in_(sentence_ids))
            .order_by(col(Token.sentence_id), col(Token.order_index))
        ).all()
        for token in tokens:
            if token.id is None:
                continue
            tokens_by_sentence[token.sentence_id].append(
                RenderedToken(
                    id=token.id,
                    surface=token.surface,
                    sentence_id=token.sentence_id,
                    order_index=token.order_index,
                    whitespace_after=token.whitespace_after,
                    state=vocab_states.get(token.surface.casefold(), "new"),
                )
            )

    return TextRenderResponse(
        text_id=text_id,
        title=text.title,
        language=text.language,
        sentences=[
            RenderedSentence(
                id=sentence.id,
                position=sentence.position,
                content=sentence.content,
                tokens=tokens_by_sentence[sentence.id],
            )
            for sentence in sentences
            if sentence.id is not None
        ],
    )
