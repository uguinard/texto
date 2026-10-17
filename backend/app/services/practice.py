from sqlmodel import Session, col, select

from ..models import Lexeme, PracticeCard, ReviewLog, Sentence, Text, Token, VocabItem
from ..schemas import PracticeCardResponse, PracticeReviewRequest, PracticeReviewResponse


MASTERY_STEP = 0.05


def create_practice_session(session: Session) -> list[PracticeCardResponse]:
    learning_items = session.exec(
        select(VocabItem)
        .where(col(VocabItem.state) == "learning")
        .order_by(col(VocabItem.created_at), col(VocabItem.id))
    ).all()

    cards: list[PracticeCard] = []
    for item in learning_items:
        if len(cards) >= 10:
            break
        if item.id is None:
            continue

        matching_occurrence = _find_occurrence(session, item)
        if matching_occurrence is None:
            continue

        sentence, tokens, target_token = matching_occurrence
        cloze_sentence = "".join(
            "____" + token.whitespace_after
            if token.id == target_token.id
            else token.surface + token.whitespace_after
            for token in tokens
        )
        lexeme = session.get(Lexeme, item.lexeme_id) if item.lexeme_id else None
        card = PracticeCard(
            vocab_item_id=item.id,
            card_type="cloze",
            sentence=cloze_sentence or sentence.content,
            answer=target_token.surface,
            hint=lexeme.translation if lexeme is not None else None,
        )
        session.add(card)
        cards.append(card)

    session.commit()
    for card in cards:
        session.refresh(card)
        if card.id is None:
            raise RuntimeError("The database did not assign a practice card ID.")

    return [
        PracticeCardResponse(
            id=card.id,
            vocab_item_id=card.vocab_item_id,
            card_type="cloze",
            sentence=card.sentence,
            answer=card.answer,
            hint=card.hint,
        )
        for card in cards
        if card.id is not None
    ]


def record_practice_review(
    session: Session,
    request: PracticeReviewRequest,
) -> PracticeReviewResponse | None:
    card = session.get(PracticeCard, request.card_id)
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
    adjustment = MASTERY_STEP if request.correct else -MASTERY_STEP
    item.mastery = min(1.0, max(0.0, mastery_before + adjustment))
    session.add(
        ReviewLog(
            card_id=card.id,
            vocab_item_id=item.id,
            correct=request.correct,
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
