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


class RenderedToken(BaseModel):
    id: int
    surface: str
    sentence_id: int
    order_index: int
    whitespace_after: str


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
