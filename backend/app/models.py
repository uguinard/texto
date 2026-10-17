from typing import ClassVar

from sqlmodel import Field, Relationship, SQLModel


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
