from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from ..database import get_session
from ..schemas import AnnotationCreateRequest, AnnotationResponse
from ..services.annotations import (
    create_annotation,
    delete_annotation,
    list_text_annotations,
)

router = APIRouter(tags=["annotations"])


@router.post("/api/annotations", response_model=AnnotationResponse, status_code=201)
def post_annotation(
    request: AnnotationCreateRequest,
    session: Session = Depends(get_session),
) -> AnnotationResponse:
    try:
        annotation = create_annotation(session, request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if annotation is None:
        raise HTTPException(
            status_code=404,
            detail="The text, sentence, or selected token was not found.",
        )
    return annotation


@router.get(
    "/api/texts/{text_id}/annotations",
    response_model=list[AnnotationResponse],
)
def get_text_annotations(
    text_id: int,
    session: Session = Depends(get_session),
) -> list[AnnotationResponse]:
    annotations = list_text_annotations(session, text_id)
    if annotations is None:
        raise HTTPException(status_code=404, detail="Text not found.")
    return annotations


@router.delete("/api/annotations/{annotation_id}", status_code=204)
def remove_annotation(
    annotation_id: int,
    session: Session = Depends(get_session),
) -> Response:
    if not delete_annotation(session, annotation_id):
        raise HTTPException(status_code=404, detail="Annotation not found.")
    return Response(status_code=204)
