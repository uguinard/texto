from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlmodel import Session

from ..database import get_session
from ..schemas import (
    LexiconItemResponse,
    LexiconStateUpdate,
    VocabItemResponse,
    VocabSaveRequest,
)
from ..services.vocabulary import (
    delete_lexicon_item,
    list_lexicon,
    save_token,
    update_lexicon_state,
)


router = APIRouter(tags=["vocabulary"])


@router.get("/api/lexicon", response_model=list[LexiconItemResponse])
def get_lexicon(
    state: Literal["new", "learning", "known"] | None = None,
    search: str | None = Query(default=None, max_length=100),
    session: Session = Depends(get_session),
) -> list[LexiconItemResponse]:
    return list_lexicon(session, state=state, search=search)


@router.patch("/api/lexicon/{vocab_item_id}", response_model=LexiconItemResponse)
def patch_lexicon_item(
    vocab_item_id: int,
    request: LexiconStateUpdate,
    session: Session = Depends(get_session),
) -> LexiconItemResponse:
    item = update_lexicon_state(session, vocab_item_id, request)
    if item is None:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    return item


@router.delete("/api/lexicon/{vocab_item_id}", status_code=204)
def remove_lexicon_item(
    vocab_item_id: int,
    session: Session = Depends(get_session),
) -> Response:
    if not delete_lexicon_item(session, vocab_item_id):
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    return Response(status_code=204)


@router.post("/api/vocab", response_model=VocabItemResponse)
def save_vocabulary_item(
    request: VocabSaveRequest,
    session: Session = Depends(get_session),
) -> VocabItemResponse:
    try:
        return save_token(session, request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
