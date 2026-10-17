import re
from typing import Literal

from sqlalchemy import func
from sqlmodel import Session, col, select

from ..models import Lexeme, Sentence, Text, Token, VocabItem
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


def split_paragraphs(raw_text: str) -> list[list[str]]:
    return [
        split_sentences(paragraph)
        for part in re.split(r"(?:\r?\n)[ \t]*(?:\r?\n)+", raw_text.strip())
        if (paragraph := part.strip())
    ]


def create_text(session: Session, request: TextImportRequest) -> TextImportResponse:
    paragraphs = split_paragraphs(request.raw_text)
    sentences = [sentence for paragraph in paragraphs for sentence in paragraph]
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

    sentence_index = 0
    for paragraph_index, paragraph in enumerate(paragraphs):
        for sentence_content in paragraph:
            sentence = Sentence(
                text_id=text_id,
                position=sentence_index,
                paragraph_index=paragraph_index,
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
            sentence_index += 1

    session.commit()
    session.refresh(text)

    return TextImportResponse(
        id=text_id,
        sentence_count=len(sentences),
        approximate_token_count=len(request.raw_text.split()),
    )


def list_texts(session: Session) -> list[TextListItem]:
    texts = session.exec(select(Text).order_by(col(Text.id).desc())).all()
    sentence_counts = dict(
        session.exec(
            select(col(Sentence.text_id), func.count(col(Sentence.id)))
            .group_by(col(Sentence.text_id))
        ).all()
    )
    token_counts = dict(
        session.exec(
            select(col(Sentence.text_id), func.count(col(Token.id)))
            .join(Token, col(Token.sentence_id) == col(Sentence.id))
            .group_by(col(Sentence.text_id))
        ).all()
    )
    return [
        TextListItem(
            id=text.id,
            title=text.title,
            language=text.language,
            created_at=text.created_at,
            sentence_count=sentence_counts.get(text.id, 0),
            token_count=token_counts.get(text.id, 0),
        )
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
    lexemes = {
        lexeme.id: lexeme
        for lexeme in session.exec(select(Lexeme)).all()
        if lexeme.id is not None
    }
    vocab_states: dict[str, Literal["new", "learning", "known"]] = {}
    vocab_details: dict[str, tuple[str | None, str | None]] = {}
    for item in vocab_items:
        if item.state == "new":
            item_state: Literal["new", "learning", "known"] = "new"
        elif item.state == "learning":
            item_state = "learning"
        elif item.state == "known":
            item_state = "known"
        else:
            continue
        for form in (item.surface, item.lemma):
            if form is None:
                continue
            normalized_form = form.casefold()
            lexeme = (
                lexemes.get(item.lexeme_id)
                if item.lexeme_id is not None
                else None
            )
            vocab_details[normalized_form] = (
                item.lemma or (lexeme.lemma if lexeme is not None else None),
                lexeme.translation if lexeme is not None else None,
            )
            current_state = vocab_states.get(normalized_form)
            state_priority = {"new": 0, "learning": 1, "known": 2}
            if (
                current_state is None
                or                 state_priority[item_state] > state_priority[current_state]
            ):
                vocab_states[normalized_form] = item_state

    if sentence_ids:
        tokens = session.exec(
            select(Token)
            .where(col(Token.sentence_id).in_(sentence_ids))
            .order_by(col(Token.sentence_id), col(Token.order_index))
        ).all()
        for token in tokens:
            if token.id is None:
                continue
            lemma, translation = vocab_details.get(
                token.surface.casefold(),
                (token.lemma, None),
            )
            tokens_by_sentence[token.sentence_id].append(
                RenderedToken(
                    id=token.id,
                    surface=token.surface,
                    lemma=lemma,
                    pos=token.pos,
                    translation=translation,
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
        created_at=text.created_at,
        sentence_count=len(sentences),
        token_count=sum(len(tokens) for tokens in tokens_by_sentence.values()),
        sentences=[
            RenderedSentence(
                id=sentence.id,
                position=sentence.position,
                paragraph_index=sentence.paragraph_index,
                content=sentence.content,
                tokens=tokens_by_sentence[sentence.id],
            )
            for sentence in sentences
            if sentence.id is not None
        ],
    )
