from typing import Literal

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from ..models import Lexeme, Sentence, Text, Token, VocabItem
from ..schemas import (
    LexiconItemResponse,
    LexiconStateUpdate,
    VocabItemResponse,
    VocabSaveRequest,
)


def save_token(session: Session, request: VocabSaveRequest) -> VocabItemResponse:
    try:
        return _save_token(session, request)
    except IntegrityError:
        # A concurrent save inserted the same word; retry to update that row.
        session.rollback()
        return _save_token(session, request)


def _save_token(
    session: Session,
    request: VocabSaveRequest,
) -> VocabItemResponse:
    token = session.get(Token, request.token_id)
    sentence = session.get(Sentence, token.sentence_id) if token is not None else None
    text = session.get(Text, request.text_id)

    if (
        token is None
        or sentence is None
        or text is None
        or sentence.text_id != text.id
    ):
        raise ValueError("The selected token does not belong to this text.")

    normalized_surface = token.surface.casefold()
    vocab_item = session.exec(
        select(VocabItem)
        .where(col(VocabItem.language) == text.language)
        .where(
            (col(VocabItem.surface_key) == normalized_surface)
            | (func.lower(col(VocabItem.lemma)) == normalized_surface)
        )
        .order_by(col(VocabItem.id))
    ).first()

    if vocab_item is None:
        vocab_item = VocabItem(
            language=text.language,
            surface=token.surface,
            lemma=request.lemma,
        )
        session.add(vocab_item)

    lexeme = _get_or_create_lexeme(
        session,
        language=text.language,
        lemma=(request.lemma or vocab_item.lemma or token.surface).strip(),
    )
    if vocab_item.state == "new":
        vocab_item.state = "learning"
    if vocab_item.lexeme_id != lexeme.id:
        vocab_item.lexeme_id = lexeme.id
    if vocab_item.lemma is None and request.lemma:
        vocab_item.lemma = request.lemma.strip()
    if lexeme.translation is None and request.translation:
        lexeme.translation = request.translation.strip()
    session.add(vocab_item)
    session.add(lexeme)
    session.commit()
    session.refresh(vocab_item)
    session.refresh(lexeme)

    if vocab_item.id is None:
        raise RuntimeError("The saved vocabulary item has an invalid state.")

    state = _validated_state(vocab_item.state)
    if state is None:
        raise RuntimeError("The saved vocabulary item has an invalid state.")

    return VocabItemResponse(
        id=vocab_item.id,
        lexeme_id=vocab_item.lexeme_id,
        surface=vocab_item.surface,
        lemma=vocab_item.lemma,
        language=vocab_item.language,
        translation=lexeme.translation,
        state=state,
    )


def list_lexicon(
    session: Session,
    state: str | None = None,
    search: str | None = None,
    vocab_item_id: int | None = None,
) -> list[LexiconItemResponse]:
    statement = select(VocabItem, Lexeme).join(
        Lexeme,
        col(VocabItem.lexeme_id) == col(Lexeme.id),
    )
    if state is not None:
        statement = statement.where(col(VocabItem.state) == state)
    if search:
        statement = statement.where(col(Lexeme.lemma).ilike(f"%{search}%"))
    if vocab_item_id is not None:
        statement = statement.where(col(VocabItem.id) == vocab_item_id)

    joined_items = session.exec(
        statement.order_by(col(Lexeme.lemma), col(VocabItem.id))
    ).all()
    # Aggregate in SQL (one row per distinct language/surface) and only for the
    # languages being listed, instead of loading every token into Python.
    languages = {lexeme.language for _, lexeme in joined_items}
    exposures: dict[tuple[str, str], int] = {}
    if languages:
        token_rows = session.exec(
            select(col(Text.language), col(Token.surface), func.count(col(Token.id)))
            .join(Sentence, col(Token.sentence_id) == col(Sentence.id))
            .join(Text, col(Sentence.text_id) == col(Text.id))
            .where(col(Text.language).in_(languages))
            .group_by(col(Text.language), col(Token.surface))
        ).all()
        for language, surface, count in token_rows:
            key = (language.casefold(), surface.casefold())
            exposures[key] = exposures.get(key, 0) + count

    result: list[LexiconItemResponse] = []
    for vocab_item, lexeme in joined_items:
        state = _validated_state(vocab_item.state)
        if state is None:
            continue
        if (
            vocab_item.id is None
            or vocab_item.created_at is None
            or lexeme.id is None
        ):
            continue
        forms = {
            vocab_item.surface.casefold(),
            lexeme.lemma.casefold(),
        }
        if vocab_item.lemma:
            forms.add(vocab_item.lemma.casefold())

        result.append(
            LexiconItemResponse(
                vocab_item_id=vocab_item.id,
                language=lexeme.language,
                lemma=lexeme.lemma,
                surface_example=vocab_item.surface,
                translation=lexeme.translation,
                state=state,
                exposure_count=sum(
                    exposures.get((lexeme.language.casefold(), form), 0)
                    for form in forms
                ),
                created_at=vocab_item.created_at,
                next_review=vocab_item.next_review,
            )
        )
    return result


def update_lexicon_state(
    session: Session,
    vocab_item_id: int,
    request: LexiconStateUpdate,
) -> LexiconItemResponse | None:
    vocab_item = session.get(VocabItem, vocab_item_id)
    if vocab_item is None or vocab_item.lexeme_id is None:
        return None

    vocab_item.state = request.state
    session.add(vocab_item)
    session.commit()
    return next(iter(list_lexicon(session, vocab_item_id=vocab_item_id)), None)


def delete_lexicon_item(session: Session, vocab_item_id: int) -> bool:
    vocab_item = session.get(VocabItem, vocab_item_id)
    if vocab_item is None:
        return False

    lexeme_id = vocab_item.lexeme_id
    session.delete(vocab_item)
    session.flush()

    if lexeme_id is not None:
        other_items = session.exec(
            select(VocabItem).where(VocabItem.lexeme_id == lexeme_id)
        ).first()
        if other_items is None:
            lexeme = session.get(Lexeme, lexeme_id)
            if lexeme is not None:
                session.delete(lexeme)

    session.commit()
    return True


def _get_or_create_lexeme(
    session: Session,
    language: str,
    lemma: str,
) -> Lexeme:
    existing_lexemes = session.exec(
        select(Lexeme).where(Lexeme.language == language)
    ).all()
    lexeme = next(
        (
            item
            for item in existing_lexemes
            if item.lemma.casefold() == lemma.casefold()
        ),
        None,
    )
    if lexeme is not None:
        return lexeme

    lexeme = Lexeme(language=language, lemma=lemma)
    session.add(lexeme)
    session.flush()
    return lexeme


def _validated_state(
    value: str,
) -> Literal["new", "learning", "known"] | None:
    if value == "new":
        return "new"
    if value == "learning":
        return "learning"
    if value == "known":
        return "known"
    return None
