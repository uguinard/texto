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
