import re
import sqlite3
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import event, inspect
from sqlalchemy import text as sql_text
from sqlalchemy.engine import Engine, make_url
from sqlmodel import Session, SQLModel, col, create_engine, select

from .config import settings

database_url = make_url(settings.database_url)
if database_url.get_backend_name() == "sqlite" and database_url.database not in (None, ":memory:"):
    Path(database_url.database).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if database_url.get_backend_name() == "sqlite" else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def enable_sqlite_pragmas(target: Engine) -> None:
    """Enforce foreign keys (so ON DELETE CASCADE works) and use WAL for file databases."""
    if target.url.get_backend_name() != "sqlite":
        return
    in_memory = target.url.database in (None, "", ":memory:")

    @event.listens_for(target, "connect")
    def _set_pragmas(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        if not in_memory:
            cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


enable_sqlite_pragmas(engine)


def create_db_and_tables() -> None:
    init_database(engine)


def init_database(target: Engine) -> None:
    """Create tables, then run each pending schema migration exactly once."""
    existing_database = inspect(target).has_table("texts")
    pending = _pending_migrations(target) if existing_database else []
    if pending:
        _backup_sqlite_database(target, pending[0][0])

    SQLModel.metadata.create_all(target)
    with target.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        )

    if not existing_database:
        # A fresh database already has the current schema.
        pending = list(MIGRATIONS)
        applied_now = [version for version, _ in pending]
    else:
        applied_now = []
        for version, migration in pending:
            migration(target)
            applied_now.append(version)

    with target.begin() as connection:
        for version in applied_now:
            connection.execute(
                sql_text("INSERT OR IGNORE INTO schema_migrations (version) VALUES (:v)"),
                {"v": version},
            )


def _pending_migrations(target: Engine):  # type: ignore[no-untyped-def]
    inspector = inspect(target)
    applied: set[int] = set()
    if inspector.has_table("schema_migrations"):
        with target.connect() as connection:
            applied = {
                row[0]
                for row in connection.exec_driver_sql(
                    "SELECT version FROM schema_migrations"
                )
            }
    return [(v, fn) for v, fn in MIGRATIONS if v not in applied]


def _backup_sqlite_database(target: Engine, next_version: int) -> None:
    if target.url.get_backend_name() != "sqlite":
        return
    database = target.url.database
    if database in (None, "", ":memory:"):
        return
    source_path = Path(database)
    if not source_path.exists():
        return
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    backup_path = source_path.with_name(
        f"{source_path.name}.bak-before-v{next_version}-{stamp}"
    )
    source = sqlite3.connect(str(source_path))
    try:
        destination = sqlite3.connect(str(backup_path))
        try:
            source.backup(destination)
        finally:
            destination.close()
    finally:
        source.close()


def _backfill_tokens(engine: Engine) -> None:
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


def _migrate_vocabulary_table(engine: Engine) -> None:
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
                item.created_at = datetime.now(UTC)
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


def _migrate_practice_columns(engine: Engine) -> None:
    columns = {
        column["name"]
        for column in inspect(engine).get_columns("vocab_items")
    }
    migrations = {
        "mastery": "FLOAT NOT NULL DEFAULT 0.5",
        "next_review": "DATETIME",
        "interval_days": "FLOAT NOT NULL DEFAULT 0",
        "ease_factor": "FLOAT NOT NULL DEFAULT 2.5",
        "surface_key": "VARCHAR NOT NULL DEFAULT ''",
    }
    with engine.begin() as connection:
        for column, definition in migrations.items():
            if column not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE vocab_items ADD COLUMN {column} {definition}"
                )


def _migrate_reader_metadata(engine: Engine) -> None:
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


def _dedupe_vocabulary(engine: Engine) -> None:
    """Fill surface_key, merge duplicate vocabulary rows, then enforce uniqueness."""
    with engine.begin() as connection:
        rows = connection.exec_driver_sql(
            "SELECT id, surface FROM vocab_items"
        ).fetchall()
        for item_id, surface in rows:
            connection.execute(
                sql_text("UPDATE vocab_items SET surface_key = :key WHERE id = :id"),
                {"key": surface.casefold(), "id": item_id},
            )
        duplicates = connection.exec_driver_sql(
            "SELECT language, surface_key, MIN(id) FROM vocab_items "
            "GROUP BY language, surface_key HAVING COUNT(*) > 1"
        ).fetchall()
        for language, surface_key, keeper in duplicates:
            params = {"language": language, "key": surface_key, "keeper": keeper}
            for table in ("practice_cards", "review_logs"):
                connection.execute(
                    sql_text(
                        f"UPDATE {table} SET vocab_item_id = :keeper WHERE vocab_item_id IN "
                        "(SELECT id FROM vocab_items WHERE language = :language "
                        "AND surface_key = :key AND id != :keeper)"
                    ),
                    params,
                )
            connection.execute(
                sql_text(
                    "DELETE FROM vocab_items WHERE language = :language "
                    "AND surface_key = :key AND id != :keeper"
                ),
                params,
            )
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_vocab_language_surface_key "
            "ON vocab_items (language, surface_key)"
        )


def _migrate_utc_timestamps(engine: Engine) -> None:
    timestamp_columns = {
        "texts": ("created_at",),
        "annotations": ("created_at",),
        "vocab_items": ("created_at", "next_review"),
        "review_logs": ("reviewed_at",),
        "saved_chunks": ("created_at", "next_review"),
        "saved_chunk_review_logs": ("reviewed_at",),
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, columns in timestamp_columns.items():
            if not inspector.has_table(table):
                continue
            available = {column["name"] for column in inspector.get_columns(table)}
            for column in columns:
                if column not in available:
                    continue
                rows = connection.exec_driver_sql(
                    f"SELECT id, {column} FROM {table} WHERE {column} IS NOT NULL"
                ).fetchall()
                for row_id, raw_value in rows:
                    value = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
                    normalized = value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
                    connection.execute(
                        sql_text(f"UPDATE {table} SET {column} = :value WHERE id = :id"),
                        {
                            "id": row_id,
                            "value": normalized.replace(tzinfo=None).strftime(
                                "%Y-%m-%d %H:%M:%S.%f"
                            ),
                        },
                    )


MIGRATIONS = [
    (1, _migrate_practice_columns),
    (2, _migrate_reader_metadata),
    (3, _migrate_vocabulary_table),
    (4, _backfill_tokens),
    (5, _dedupe_vocabulary),
    (6, _migrate_utc_timestamps),
]


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
