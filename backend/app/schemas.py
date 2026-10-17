from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


class RenderedToken(BaseModel):
    id: int
    surface: str
    sentence_id: int
    order_index: int
    whitespace_after: str
    state: Literal["new", "learning", "known"]


class RenderedSentence(BaseModel):
    id: int
    position: int
    content: str
    tokens: list[RenderedToken]


class TextRenderResponse(BaseModel):
    text_id: int
    title: str
    language: str
    sentences: list[RenderedSentence]


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
    vocab_item_id: int
    card_type: Literal["cloze"]
    sentence: str
    answer: str
    hint: str | None


class PracticeReviewRequest(BaseModel):
    card_id: int = Field(gt=0)
    vocab_item_id: int = Field(gt=0)
    correct: bool
    answer_given: str


class PracticeReviewResponse(BaseModel):
    card_id: int
    vocab_item_id: int
    mastery: float


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
