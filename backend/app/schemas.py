from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


AnnotationCategory = Literal[
    "lexical",
    "syntactic",
    "pragmatic",
    "metaphor",
    "discourse",
]


# =============================================================================
# Core API-First Contract Schemas
# These schemas define the strict contract between FastAPI backend and SolidJS frontend.
# Frontend TypeScript interfaces in `frontend/src/types/api.ts` must mirror these exactly.
# =============================================================================


class Text(BaseModel):
    """
    Core Text entity.
    Corresponds to frontend: Text (frontend/src/types/api.ts)
    Backing model: backend/app/models.py -> Text
    """
    id: int
    title: str
    content: str
    created_at: datetime


class WordContext(BaseModel):
    """
    Word lookup context returned by the lookup endpoint.
    Corresponds to frontend: WordContext (frontend/src/types/api.ts)
    Backing service: backend/app/services/lookup.py -> mock_lookup
    """
    word: str
    sentence: str
    definition: str | None
    translation: str | None
    confidence: Literal["high", "medium", "low"]


# =============================================================================
# Existing Request/Response Schemas (unchanged, kept for backward compatibility)
# =============================================================================


class TextImportRequest(BaseModel):
    title: str = Field(min_length=1)
    language: str = Field(min_length=1)
    raw_text: str = Field(min_length=1)

    @field_validator("title", "language")
    @classmethod
    def strip_required_labels(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("raw_text")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Text cannot be blank.")
        return value


class TextImportResponse(BaseModel):
    id: int
    sentence_count: int
    approximate_token_count: int


class TextListItem(BaseModel):
    id: int
    title: str
    language: str
    created_at: datetime
    sentence_count: int
    token_count: int


class RenderedToken(BaseModel):
    id: int
    surface: str
    lemma: str | None
    pos: str | None
    translation: str | None
    sentence_id: int
    order_index: int
    whitespace_after: str
    state: Literal["new", "learning", "known"]


class RenderedSentence(BaseModel):
    id: int
    position: int
    paragraph_index: int
    content: str
    tokens: list[RenderedToken]


class TextRenderResponse(BaseModel):
    text_id: int
    title: str
    language: str
    created_at: datetime
    sentence_count: int
    token_count: int
    sentences: list[RenderedSentence]


class AnnotationCreateRequest(BaseModel):
    text_id: int = Field(gt=0)
    sentence_id: int = Field(gt=0)
    start_token_id: int = Field(gt=0)
    end_token_id: int = Field(gt=0)
    category: AnnotationCategory
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class AnnotationResponse(BaseModel):
    id: int
    text_id: int
    sentence_id: int
    start_token_id: int
    end_token_id: int
    category: AnnotationCategory
    note: str | None
    created_at: datetime


class VocabSaveRequest(BaseModel):
    text_id: int = Field(gt=0)
    token_id: int = Field(gt=0)
    lemma: str | None = None
    translation: str | None = None


class VocabItemResponse(BaseModel):
    id: int
    surface: str
    lemma: str | None
    language: str
    translation: str | None
    state: Literal["new", "learning", "known"]


class LexiconItemResponse(BaseModel):
    vocab_item_id: int
    language: str
    lemma: str
    surface_example: str
    translation: str | None
    state: Literal["new", "learning", "known"]
    exposure_count: int
    created_at: datetime
    next_review: datetime | None


class LexiconStateUpdate(BaseModel):
    state: Literal["new", "learning", "known"]


class PracticeCardResponse(BaseModel):
    id: int
    item_type: Literal["word", "chunk"] = "word"
    vocab_item_id: int | None = None
    saved_chunk_id: int | None = None
    card_type: Literal["cloze"]
    sentence: str
    answer: str
    hint: str | None


class PracticeReviewRequest(BaseModel):
    card_id: int = Field(gt=0)
    vocab_item_id: int | None = Field(default=None, gt=0)
    saved_chunk_id: int | None = Field(default=None, gt=0)
    correct: bool
    answer_given: str
    answer_revealed: bool = False

    @model_validator(mode="after")
    def require_one_learning_item(self) -> "PracticeReviewRequest":
        if (self.vocab_item_id is None) == (self.saved_chunk_id is None):
            raise ValueError("Specify exactly one vocabulary item or saved chunk.")
        return self


class PracticeReviewResponse(BaseModel):
    card_id: int
    vocab_item_id: int | None = None
    saved_chunk_id: int | None = None
    mastery: float


class SavedChunkCreateRequest(BaseModel):
    text_id: int = Field(gt=0)
    sentence_id: int = Field(gt=0)
    start_token_id: int = Field(gt=0)
    end_token_id: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SavedChunkUpdateRequest(BaseModel):
    state: Literal["new", "learning", "known"] | None = None
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SavedChunkResponse(BaseModel):
    id: int
    text_id: int
    text_title: str
    language: str
    sentence_id: int
    start_token_id: int
    end_token_id: int
    phrase: str
    source_sentence: str
    note: str | None
    state: Literal["new", "learning", "known"]
    created_at: datetime
    next_review: datetime | None


class LookupRequest(BaseModel):
    text_id: int = Field(gt=0)
    token_id: int = Field(gt=0)
    surface: str = Field(min_length=1)
    sentence: str = Field(min_length=1)
    language: str = Field(min_length=1)


class LookupResponse(BaseModel):
    surface: str
    lemma: str | None
    translation: str | None
    target_definition: str | None
    example: str | None
    grammar_note: str | None
    pragmatics_note: str | None
    confidence: Literal["high", "medium", "low"]
    uncertain: bool
