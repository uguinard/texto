from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas import (
    PracticeCardResponse,
    PracticeReviewRequest,
    PracticeReviewResponse,
)
from ..services.practice import create_practice_session, record_practice_review


router = APIRouter(prefix="/api/practice", tags=["practice"])


@router.get("/session", response_model=list[PracticeCardResponse])
def get_practice_session(
    session: Session = Depends(get_session),
) -> list[PracticeCardResponse]:
    return create_practice_session(session)


@router.post("/review", response_model=PracticeReviewResponse)
def review_practice_card(
    request: PracticeReviewRequest,
    session: Session = Depends(get_session),
) -> PracticeReviewResponse:
    result = record_practice_review(session, request)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="The practice card and learning item do not match.",
        )
    return result
