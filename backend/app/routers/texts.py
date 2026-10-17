from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas import TextImportRequest, TextImportResponse, TextListItem, TextRenderResponse
from ..services.texts import create_text, get_text_render, list_texts


router = APIRouter(prefix="/api/texts", tags=["texts"])


@router.post("", response_model=TextImportResponse, status_code=201)
def import_text(
    request: TextImportRequest,
    session: Session = Depends(get_session),
) -> TextImportResponse:
    return create_text(session, request)


@router.get("", response_model=list[TextListItem])
def get_texts(
    session: Session = Depends(get_session),
) -> list[TextListItem]:
    return list_texts(session)


@router.get("/{text_id}/render", response_model=TextRenderResponse)
def render_text(
    text_id: int,
    session: Session = Depends(get_session),
) -> TextRenderResponse:
    rendered_text = get_text_render(session, text_id)
    if rendered_text is None:
        raise HTTPException(status_code=404, detail="Text not found.")
    return rendered_text
