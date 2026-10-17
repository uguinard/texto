from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..schemas import TextImportRequest, TextImportResponse
from ..services.texts import create_text


router = APIRouter(prefix="/api/texts", tags=["texts"])


@router.post("", response_model=TextImportResponse, status_code=201)
def import_text(
    request: TextImportRequest,
    session: Session = Depends(get_session),
) -> TextImportResponse:
    return create_text(session, request)
