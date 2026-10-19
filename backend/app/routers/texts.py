from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from ..database import get_session
from ..schemas import TextImportRequest, TextImportResponse, TextListItem, TextRenderResponse
from ..services.texts import (
    TextImportLimitError,
    create_text,
    delete_text,
    get_text_render,
    list_texts,
)

router = APIRouter(prefix="/api/texts", tags=["texts"])


@router.post("", response_model=TextImportResponse, status_code=201)
def import_text(
    request: TextImportRequest,
    session: Session = Depends(get_session),
) -> TextImportResponse:
    try:
        return create_text(session, request)
    except TextImportLimitError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("", response_model=list[TextListItem])
def get_texts(
    session: Session = Depends(get_session),
) -> list[TextListItem]:
    return list_texts(session)


@router.delete("/{text_id}", status_code=204)
def remove_text(
    text_id: int,
    session: Session = Depends(get_session),
) -> Response:
    if not delete_text(session, text_id):
        raise HTTPException(status_code=404, detail="Text not found.")
    return Response(status_code=204)


@router.get("/{text_id}/render", response_model=TextRenderResponse)
def render_text(
    text_id: int,
    session: Session = Depends(get_session),
) -> TextRenderResponse:
    rendered_text = get_text_render(session, text_id)
    if rendered_text is None:
        raise HTTPException(status_code=404, detail="Text not found.")
    return rendered_text
