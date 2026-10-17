from sqlmodel import Session, select

from ..models import Sentence, Text, Token, VocabItem
from ..schemas import VocabItemResponse, VocabSaveRequest


def save_token(session: Session, request: VocabSaveRequest) -> VocabItemResponse:
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
    existing_items = session.exec(
        select(VocabItem).where(VocabItem.language == text.language)
    ).all()
    vocab_item = next(
        (
            item
            for item in existing_items
            if normalized_surface
            in {
                item.surface.casefold(),
                item.lemma.casefold() if item.lemma is not None else "",
            }
        ),
        None,
    )

    if vocab_item is None:
        vocab_item = VocabItem(
            language=text.language,
            surface=token.surface,
            state="learning",
        )
        session.add(vocab_item)
        session.commit()
        session.refresh(vocab_item)

    if vocab_item.id is None:
        raise RuntimeError("The saved vocabulary item has an invalid state.")

    if vocab_item.state == "known":
        state = "known"
    elif vocab_item.state == "learning":
        state = "learning"
    else:
        raise RuntimeError("The saved vocabulary item has an invalid state.")

    return VocabItemResponse(
        id=vocab_item.id,
        surface=vocab_item.surface,
        lemma=vocab_item.lemma,
        language=vocab_item.language,
        state=state,
    )
