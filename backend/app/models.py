from datetime import datetime, timezone
from typing import ClassVar

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class Lexeme(SQLModel, table=True):
    __tablename__: ClassVar[str] = "lexemes"

    id: int | None = Field(default=None, primary_key=True)
    language: str = Field(index=True)
    lemma: str
    translation: str | None = None


class Text(SQLModel, table=True):
    __tablename__: ClassVar[str] = "texts"

    id: int | None = Field(default=None, primary_key=True)
    title: str
    language: str
    raw_text: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    sentences: list["Sentence"] = Relationship(
        back_populates="text",
        cascade_delete=True,
    )


class Sentence(SQLModel, table=True):
    __tablename__: ClassVar[str] = "sentences"

    id: int | None = Field(default=None, primary_key=True)
    text_id: int = Field(foreign_key="texts.id", ondelete="CASCADE")
    position: int
    paragraph_index: int = Field(default=0)
    content: str

    text: Text = Relationship(back_populates="sentences")
    tokens: list["Token"] = Relationship(
        back_populates="sentence",
        cascade_delete=True,
    )


class Token(SQLModel, table=True):
    __tablename__: ClassVar[str] = "tokens"

    id: int | None = Field(default=None, primary_key=True)
    sentence_id: int = Field(foreign_key="sentences.id", ondelete="CASCADE")
    order_index: int
    surface: str
    whitespace_after: str = ""
    lemma: str | None = None
    pos: str | None = None

    sentence: Sentence = Relationship(back_populates="tokens")


class Annotation(SQLModel, table=True):
    __tablename__: ClassVar[str] = "annotations"

    id: int | None = Field(default=None, primary_key=True)
    text_id: int = Field(foreign_key="texts.id", ondelete="CASCADE")
    sentence_id: int = Field(foreign_key="sentences.id", ondelete="CASCADE")
    start_token_id: int = Field(foreign_key="tokens.id", ondelete="CASCADE")
    end_token_id: int = Field(foreign_key="tokens.id", ondelete="CASCADE")
    category: str
    note: str | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class VocabItem(SQLModel, table=True):
    __tablename__: ClassVar[str] = "vocab_items"

    id: int | None = Field(default=None, primary_key=True)
    language: str = Field(index=True)
    surface: str
    lemma: str | None = None
    state: str = Field(default="learning")
    lexeme_id: int | None = Field(default=None, foreign_key="lexemes.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    mastery: float = Field(default=0.5)
    next_review: datetime | None = None
    interval_days: float = Field(default=0.0)
    ease_factor: float = Field(default=2.5)


class PracticeCard(SQLModel, table=True):
    __tablename__: ClassVar[str] = "practice_cards"

    id: int | None = Field(default=None, primary_key=True)
    vocab_item_id: int = Field(foreign_key="vocab_items.id", ondelete="CASCADE")
    card_type: str = Field(default="cloze")
    sentence: str
    answer: str
    hint: str | None = None


class ReviewLog(SQLModel, table=True):
    __tablename__: ClassVar[str] = "review_logs"

    id: int | None = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="practice_cards.id", ondelete="CASCADE")
    vocab_item_id: int = Field(foreign_key="vocab_items.id", ondelete="CASCADE")
    correct: bool
    answer_given: str
    mastery_before: float
    mastery_after: float
    reviewed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SavedChunk(SQLModel, table=True):
    __tablename__: ClassVar[str] = "saved_chunks"
    __table_args__ = (
        UniqueConstraint(
            "text_id",
            "sentence_id",
            "start_token_id",
            "end_token_id",
            name="uq_saved_chunk_source_range",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    text_id: int = Field(foreign_key="texts.id", ondelete="CASCADE")
    sentence_id: int = Field(foreign_key="sentences.id", ondelete="CASCADE")
    start_token_id: int = Field(foreign_key="tokens.id", ondelete="CASCADE")
    end_token_id: int = Field(foreign_key="tokens.id", ondelete="CASCADE")
    phrase: str
    note: str | None = None
    state: str = Field(default="learning")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    mastery: float = Field(default=0.5)
    next_review: datetime | None = None
    interval_days: float = Field(default=0.0)
    ease_factor: float = Field(default=2.5)


class SavedChunkPracticeCard(SQLModel, table=True):
    __tablename__: ClassVar[str] = "saved_chunk_practice_cards"

    id: int | None = Field(default=None, primary_key=True)
    saved_chunk_id: int = Field(foreign_key="saved_chunks.id", ondelete="CASCADE")
    card_type: str = Field(default="cloze")
    sentence: str
    answer: str
    hint: str | None = None


class SavedChunkReviewLog(SQLModel, table=True):
    __tablename__: ClassVar[str] = "saved_chunk_review_logs"

    id: int | None = Field(default=None, primary_key=True)
    card_id: int = Field(
        foreign_key="saved_chunk_practice_cards.id",
        ondelete="CASCADE",
    )
    saved_chunk_id: int = Field(
        foreign_key="saved_chunks.id",
        ondelete="CASCADE",
    )
    correct: bool
    answer_given: str
    mastery_before: float
    mastery_after: float
    reviewed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
