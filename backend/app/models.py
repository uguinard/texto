from datetime import datetime, timezone
from typing import ClassVar

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

    sentences: list["Sentence"] = Relationship(
        back_populates="text",
        cascade_delete=True,
    )


class Sentence(SQLModel, table=True):
    __tablename__: ClassVar[str] = "sentences"

    id: int | None = Field(default=None, primary_key=True)
    text_id: int = Field(foreign_key="texts.id", ondelete="CASCADE")
    position: int
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

    sentence: Sentence = Relationship(back_populates="tokens")


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
