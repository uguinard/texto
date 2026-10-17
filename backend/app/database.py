from pathlib import Path
from collections.abc import Generator
from datetime import datetime, timezone
import re

from sqlalchemy import inspect
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, col, create_engine, select

from .config import settings


database_url = make_url(settings.database_url)
if database_url.get_backend_name() == "sqlite" and database_url.database not in (None, ":memory:"):
    Path(database_url.database).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if database_url.get_backend_name() == "sqlite" else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_practice_columns()
    _migrate_reader_metadata()
    _migrate_vocabulary_table()

    from .models import Sentence, Token
    from .services.tokenizer import tokenize_sentence

    with Session(engine) as session:
        tokenized_sentence_ids = set(
            session.exec(select(col(Token.sentence_id)).distinct()).all()
        )
        sentences = session.exec(select(Sentence)).all()

        for sentence in sentences:
            if sentence.id is None or sentence.id in tokenized_sentence_ids:
                continue

            session.add_all(
                Token(
                    sentence_id=sentence.id,
                    order_index=index,
                    surface=part.surface,
                    whitespace_after=part.whitespace_after,
                )
                for index, part in enumerate(tokenize_sentence(sentence.content))
            )

        session.commit()


def _migrate_vocabulary_table() -> None:
    from .models import Lexeme, VocabItem

    columns = {
        column["name"]
        for column in inspect(engine).get_columns("vocab_items")
    }
    with engine.begin() as connection:
        if "lexeme_id" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE vocab_items ADD COLUMN lexeme_id "
                "INTEGER REFERENCES lexemes(id)"
            )
        if "created_at" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE vocab_items ADD COLUMN created_at DATETIME"
            )

    with Session(engine) as session:
        lexemes = list(session.exec(select(Lexeme)).all())
        for item in session.exec(select(VocabItem)).all():
            if item.created_at is None:
                item.created_at = datetime.now(timezone.utc)
            if item.lexeme_id is not None:
                continue

            lemma = (item.lemma or item.surface).strip()
            lexeme = next(
                (
                    candidate
                    for candidate in lexemes
                    if candidate.language.casefold() == item.language.casefold()
                    and candidate.lemma.casefold() == lemma.casefold()
                ),
                None,
            )
            if lexeme is None:
                lexeme = Lexeme(
                    language=item.language,
                    lemma=lemma,
                )
                session.add(lexeme)
                session.flush()
                lexemes.append(lexeme)

            item.lexeme_id = lexeme.id

        session.commit()


def _migrate_practice_columns() -> None:
    columns = {
        column["name"]
        for column in inspect(engine).get_columns("vocab_items")
    }
    migrations = {
        "mastery": "FLOAT NOT NULL DEFAULT 0.5",
        "next_review": "DATETIME",
        "interval_days": "FLOAT NOT NULL DEFAULT 0",
        "ease_factor": "FLOAT NOT NULL DEFAULT 2.5",
    }
    with engine.begin() as connection:
        for column, definition in migrations.items():
            if column not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE vocab_items ADD COLUMN {column} {definition}"
                )


def _migrate_reader_metadata() -> None:
    from .models import Sentence, Text

    text_columns = {
        column["name"] for column in inspect(engine).get_columns("texts")
    }
    token_columns = {
        column["name"] for column in inspect(engine).get_columns("tokens")
    }
    sentence_columns = {
        column["name"] for column in inspect(engine).get_columns("sentences")
    }
    with engine.begin() as connection:
        if "created_at" not in text_columns:
            connection.exec_driver_sql("ALTER TABLE texts ADD COLUMN created_at DATETIME")
        connection.exec_driver_sql(
            "UPDATE texts SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
        )
        if "lemma" not in token_columns:
            connection.exec_driver_sql("ALTER TABLE tokens ADD COLUMN lemma VARCHAR")
        if "pos" not in token_columns:
            connection.exec_driver_sql("ALTER TABLE tokens ADD COLUMN pos VARCHAR")
        if "paragraph_index" not in sentence_columns:
            connection.exec_driver_sql(
                "ALTER TABLE sentences ADD COLUMN paragraph_index "
                "INTEGER NOT NULL DEFAULT 0"
            )

    with Session(engine) as session:
        for text in session.exec(select(Text)).all():
            normalized_text = text.raw_text.strip()
            paragraph_ends = [
                match.end()
                for match in re.finditer(
                    r"(?:\r?\n)[ \t]*(?:\r?\n)+",
                    normalized_text,
                )
            ]
            paragraph_index = 0
            search_from = 0
            for sentence in session.exec(
                select(Sentence)
                .where(col(Sentence.text_id) == text.id)
                .order_by(col(Sentence.position))
            ).all():
                start = normalized_text.find(sentence.content, search_from)
                if start < 0:
                    continue
                while (
                    paragraph_index < len(paragraph_ends)
                    and paragraph_ends[paragraph_index] <= start
                ):
                    paragraph_index += 1
                sentence.paragraph_index = paragraph_index
                search_from = start + len(sentence.content)
        session.commit()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
