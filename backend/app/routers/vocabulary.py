from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas import VocabItemResponse, VocabSaveRequest
from ..services.vocabulary import save_token


router = APIRouter(prefix="/api/vocab", tags=["vocabulary"])


@router.post("", response_model=VocabItemResponse)
def save_vocabulary_item(
    request: VocabSaveRequest,
    session: Session = Depends(get_session),
) -> VocabItemResponse:
    try:
        return save_token(session, request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
