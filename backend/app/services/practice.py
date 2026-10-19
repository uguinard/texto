from collections.abc import Sequence
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, col, select

from ..models import (
    Lexeme,
    PracticeCard,
    ReviewLog,
    SavedChunk,
    SavedChunkPracticeCard,
    SavedChunkReviewLog,
    Sentence,
    Text,
    Token,
    VocabItem,
)
from ..schemas import (
    PracticeCardResponse,
    PracticeReviewRequest,
    PracticeReviewResponse,
)


MASTERY_STEP = 0.05
FAILED_RETRY_DELAY = timedelta(minutes=10)
MIN_EASE = 1.3
MAX_EASE = 3.0


def _reuse_or_add_card(
    session: Session,
    card: PracticeCard | SavedChunkPracticeCard,
) -> PracticeCard | SavedChunkPracticeCard:
    """Return the stored card for the same item and sentence, adding it only if new."""
    existing: PracticeCard | SavedChunkPracticeCard | None
    if isinstance(card, PracticeCard):
        existing = session.exec(
            select(PracticeCard)
            .where(col(PracticeCard.vocab_item_id) == card.vocab_item_id)
            .where(col(PracticeCard.sentence) == card.sentence)
            .where(col(PracticeCard.answer) == card.answer)
        ).first()
    else:
        existing = session.exec(
            select(SavedChunkPracticeCard)
            .where(col(SavedChunkPracticeCard.saved_chunk_id) == card.saved_chunk_id)
            .where(col(SavedChunkPracticeCard.sentence) == card.sentence)
            .where(col(SavedChunkPracticeCard.answer) == card.answer)
        ).first()
    if existing is not None:
        existing.hint = card.hint
        session.add(existing)
        return existing
    session.add(card)
    return card


def _apply_review(item: VocabItem | SavedChunk, correct: bool) -> None:
    """Update mastery and schedule; failed answers return after a short delay."""
    adjustment = MASTERY_STEP if correct else -MASTERY_STEP
    item.mastery = min(1.0, max(0.0, item.mastery + adjustment))
    now = datetime.now(timezone.utc)
    if correct:
        item.interval_days = (
            1.0 if item.interval_days < 1.0 else item.interval_days * item.ease_factor
        )
        item.ease_factor = min(MAX_EASE, item.ease_factor + 0.05)
        item.next_review = now + timedelta(days=item.interval_days)
    else:
        item.interval_days = 0.0
        item.ease_factor = max(MIN_EASE, item.ease_factor - 0.2)
        item.next_review = now + FAILED_RETRY_DELAY


def create_practice_session(session: Session) -> list[PracticeCardResponse]:
    now = datetime.now(timezone.utc)
    learning_items = session.exec(
        select(VocabItem)
        .where(col(VocabItem.state) == "learning")
        .where(
            col(VocabItem.next_review).is_(None)
            | (col(VocabItem.next_review) <= now)
        )
        .order_by(
            col(VocabItem.next_review),
            col(VocabItem.created_at),
            col(VocabItem.id),
        )
    ).all()
    learning_chunks = session.exec(
        select(SavedChunk)
        .where(col(SavedChunk.state) == "learning")
        .where(
            col(SavedChunk.next_review).is_(None)
            | (col(SavedChunk.next_review) <= now)
        )
        .order_by(
            col(SavedChunk.next_review),
            col(SavedChunk.created_at),
            col(SavedChunk.id),
        )
    ).all()

    due_items: list[tuple[float, float, str, VocabItem | SavedChunk]] = []
    for item in learning_items:
        due_items.append(
            (
                _sort_datetime(item.next_review),
                _sort_datetime(item.created_at),
                "word",
                item,
            )
        )
    for chunk in learning_chunks:
        due_items.append(
            (
                _sort_datetime(chunk.next_review),
                _sort_datetime(chunk.created_at),
                "chunk",
                chunk,
            )
        )

    cards: list[PracticeCard | SavedChunkPracticeCard] = []
    for _, _, item_type, item in sorted(due_items, key=lambda entry: entry[:2]):
        if len(cards) >= 10:
            break
        if item_type == "word":
            if not isinstance(item, VocabItem) or item.id is None:
                continue
            occurrence = _find_occurrence(session, item)
            if occurrence is None:
                continue
            sentence, tokens, target_token = occurrence
            cloze_sentence = "".join(
                "____" + token.whitespace_after
                if token.id == target_token.id
                else token.surface + token.whitespace_after
                for token in tokens
            )
            lexeme = session.get(Lexeme, item.lexeme_id) if item.lexeme_id else None
            card: PracticeCard | SavedChunkPracticeCard = PracticeCard(
                vocab_item_id=item.id,
                card_type="cloze",
                sentence=cloze_sentence or sentence.content,
                answer=target_token.surface,
                hint=lexeme.translation if lexeme is not None else None,
            )
        else:
            if not isinstance(item, SavedChunk) or item.id is None:
                continue
            occurrence = _find_chunk_occurrence(session, item)
            if occurrence is None:
                continue
            sentence, tokens, start_order, end_order = occurrence
            cloze_sentence = _chunk_cloze_sentence(
                sentence,
                tokens,
                start_order,
                end_order,
            )
            card = SavedChunkPracticeCard(
                saved_chunk_id=item.id,
                card_type="cloze",
                sentence=cloze_sentence,
                answer=item.phrase,
                hint=item.note,
            )
        cards.append(_reuse_or_add_card(session, card))

    session.commit()
    responses: list[PracticeCardResponse] = []
    for card in cards:
        session.refresh(card)
        if card.id is None:
            raise RuntimeError("The database did not assign a practice card ID.")
        if isinstance(card, PracticeCard):
            responses.append(
                PracticeCardResponse(
                    id=card.id,
                    item_type="word",
                    vocab_item_id=card.vocab_item_id,
                    card_type="cloze",
                    sentence=card.sentence,
                    answer=card.answer,
                    hint=card.hint,
                )
            )
        else:
            responses.append(
                PracticeCardResponse(
                    id=card.id,
                    item_type="chunk",
                    saved_chunk_id=card.saved_chunk_id,
                    card_type="cloze",
                    sentence=card.sentence,
                    answer=card.answer,
                    hint=card.hint,
                )
            )
    return responses


def record_practice_review(
    session: Session,
    request: PracticeReviewRequest,
) -> PracticeReviewResponse | None:
    if request.saved_chunk_id is not None:
        return _record_chunk_review(session, request)

    card = session.get(PracticeCard, request.card_id)
    if request.vocab_item_id is None:
        return None
    item = session.get(VocabItem, request.vocab_item_id)
    if (
        card is None
        or item is None
        or card.vocab_item_id != item.id
        or card.id is None
        or item.id is None
    ):
        return None

    mastery_before = item.mastery
    _apply_review(item, request.correct and not request.answer_revealed)
    session.add(
        ReviewLog(
            card_id=card.id,
            vocab_item_id=item.id,
            correct=request.correct and not request.answer_revealed,
            answer_given=request.answer_given,
            mastery_before=mastery_before,
            mastery_after=item.mastery,
        )
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    if card.id is None or item.id is None:
        raise RuntimeError("The reviewed practice item has an invalid ID.")
    return PracticeReviewResponse(
        card_id=card.id,
        vocab_item_id=item.id,
        mastery=item.mastery,
    )


def _record_chunk_review(
    session: Session,
    request: PracticeReviewRequest,
) -> PracticeReviewResponse | None:
    chunk_id = request.saved_chunk_id
    if chunk_id is None:
        return None
    card = session.get(SavedChunkPracticeCard, request.card_id)
    chunk = session.get(SavedChunk, chunk_id)
    if (
        card is None
        or chunk is None
        or card.saved_chunk_id != chunk.id
        or card.id is None
        or chunk.id is None
    ):
        return None

    mastery_before = chunk.mastery
    _apply_review(chunk, request.correct and not request.answer_revealed)

    session.add(
        SavedChunkReviewLog(
            card_id=card.id,
            saved_chunk_id=chunk.id,
            correct=request.correct and not request.answer_revealed,
            answer_given=request.answer_given,
            mastery_before=mastery_before,
            mastery_after=chunk.mastery,
        )
    )
    session.add(chunk)
    session.commit()
    session.refresh(chunk)
    return PracticeReviewResponse(
        card_id=card.id,
        saved_chunk_id=chunk.id,
        mastery=chunk.mastery,
    )


def _find_occurrence(
    session: Session,
    item: VocabItem,
) -> tuple[Sentence, list[Token], Token] | None:
    if item.id is None:
        return None
    tokens_and_sentences = session.exec(
        select(Token, Sentence)
        .join(Sentence, col(Token.sentence_id) == col(Sentence.id))
        .join(Text, col(Sentence.text_id) == col(Text.id))
        .where(col(Text.language) == item.language)
        .order_by(col(Sentence.id), col(Token.order_index))
    ).all()
    candidate_forms = {item.surface.casefold()}
    if item.lemma:
        candidate_forms.add(item.lemma.casefold())

    grouped: dict[int, tuple[Sentence, list[Token]]] = {}
    for token, sentence in tokens_and_sentences:
        if sentence.id is None:
            continue
        if sentence.id not in grouped:
            grouped[sentence.id] = (sentence, [])
        grouped[sentence.id][1].append(token)

    for sentence, tokens in grouped.values():
        target = next(
            (
                token
                for token in tokens
                if token.surface.casefold() in candidate_forms
            ),
            None,
        )
        if target is not None:
            return sentence, tokens, target
    return None


def _find_chunk_occurrence(
    session: Session,
    chunk: SavedChunk,
) -> tuple[Sentence, Sequence[Token], int, int] | None:
    sentence = session.get(Sentence, chunk.sentence_id)
    start_token = session.get(Token, chunk.start_token_id)
    end_token = session.get(Token, chunk.end_token_id)
    if (
        sentence is None
        or start_token is None
        or end_token is None
        or sentence.text_id != chunk.text_id
        or start_token.sentence_id != sentence.id
        or end_token.sentence_id != sentence.id
        or start_token.order_index > end_token.order_index
    ):
        return None
    tokens = session.exec(
        select(Token)
        .where(col(Token.sentence_id) == sentence.id)
        .order_by(col(Token.order_index))
    ).all()
    return sentence, tokens, start_token.order_index, end_token.order_index


def _sort_datetime(value: datetime | None) -> float:
    if value is None:
        return float("-inf")
    normalized = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return normalized.timestamp()


def _chunk_cloze_sentence(
    sentence: Sentence,
    tokens: Sequence[Token],
    start_order: int,
    end_order: int,
) -> str:
    parts: list[str] = []
    for token in tokens:
        if token.order_index == start_order:
            parts.append("____")
            if start_order == end_order:
                parts.append(token.whitespace_after)
        elif start_order < token.order_index <= end_order:
            if token.order_index == end_order:
                parts.append(token.whitespace_after)
        else:
            parts.append(token.surface + token.whitespace_after)
    return "".join(parts) or sentence.content
