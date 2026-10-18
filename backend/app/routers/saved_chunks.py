from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from ..database import get_session
from ..schemas import (
    SavedChunkCreateRequest,
    SavedChunkResponse,
    SavedChunkUpdateRequest,
)
from ..services.saved_chunks import (
    create_saved_chunk,
    delete_saved_chunk,
    list_saved_chunks,
    update_saved_chunk,
)


router = APIRouter(prefix="/api/lexicon/chunks", tags=["saved chunks"])


@router.post("", response_model=SavedChunkResponse, status_code=201)
def post_saved_chunk(
    request: SavedChunkCreateRequest,
    session: Session = Depends(get_session),
) -> SavedChunkResponse:
    try:
        chunk = create_saved_chunk(session, request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if chunk is None:
        raise HTTPException(
            status_code=404,
            detail="The text, sentence, or selected token was not found.",
        )
    return chunk


@router.get("", response_model=list[SavedChunkResponse])
def get_saved_chunks(
    session: Session = Depends(get_session),
) -> list[SavedChunkResponse]:
    return list_saved_chunks(session)


@router.patch("/{chunk_id}", response_model=SavedChunkResponse)
def patch_saved_chunk(
    chunk_id: int,
    request: SavedChunkUpdateRequest,
    session: Session = Depends(get_session),
) -> SavedChunkResponse:
    chunk = update_saved_chunk(session, chunk_id, request)
    if chunk is None:
        raise HTTPException(status_code=404, detail="Saved chunk not found.")
    return chunk


@router.delete("/{chunk_id}", status_code=204)
def remove_saved_chunk(
    chunk_id: int,
    session: Session = Depends(get_session),
) -> Response:
    if not delete_saved_chunk(session, chunk_id):
        raise HTTPException(status_code=404, detail="Saved chunk not found.")
    return Response(status_code=204)
