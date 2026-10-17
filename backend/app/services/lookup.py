import re

from sqlmodel import Session

from ..models import Sentence, Text, Token
from ..schemas import LookupRequest, LookupResponse


def mock_lookup(
    session: Session,
    request: LookupRequest,
) -> LookupResponse:
    token = session.get(Token, request.token_id)
    if token is None or token.surface != request.surface:
        raise ValueError("The selected token does not match a saved token.")

    sentence = session.get(Sentence, token.sentence_id)
    if (
        sentence is None
        or sentence.text_id != request.text_id
        or sentence.content != request.sentence
    ):
        raise ValueError("The sentence does not match the selected token.")

    text = session.get(Text, request.text_id)
    if text is None or text.language != request.language:
        raise ValueError("The language or text does not match the selected token.")

    lemma = request.surface.lower() if re.search(r"\w", request.surface, re.UNICODE) else None

    return LookupResponse(
        surface=request.surface,
        lemma=lemma,
        translation=f"[Mock translation in {text.language} for “{request.surface}”]",
        target_definition=f"[Mock definition of “{request.surface}” in {text.language}]",
        example=f"[Mock example containing “{request.surface}” from the selected sentence]",
        grammar_note="[Mock grammar note]",
        pragmatics_note="[Mock pragmatics note]",
        confidence="low",
        uncertain=True,
    )
