from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas import LookupRequest, LookupResponse
from ..services.lookup import mock_lookup


router = APIRouter(prefix="/api", tags=["lookup"])


@router.post("/lookup", response_model=LookupResponse)
def lookup(
    request: LookupRequest,
    session: Session = Depends(get_session),
) -> LookupResponse:
    try:
        return mock_lookup(session, request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
