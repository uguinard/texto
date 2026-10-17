from pathlib import Path
from collections.abc import Generator
from datetime import datetime, timezone

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
    if "mastery" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE vocab_items ADD COLUMN mastery FLOAT NOT NULL DEFAULT 0.5"
            )


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
