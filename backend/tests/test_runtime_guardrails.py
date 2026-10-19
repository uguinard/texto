from collections.abc import Iterator
from datetime import UTC, datetime, timedelta, timezone

import pytest
from sqlmodel import Session, create_engine, select

from app.database import enable_sqlite_pragmas, init_database
from app.models import Text, VocabItem
from app.schemas import VocabSaveRequest
from app.services.practice import create_practice_session
from app.services.vocabulary import save_token
from tests.test_p1_fixes import import_text, memory_engine, token_id


@pytest.fixture
def session() -> Iterator[Session]:
    engine = memory_engine()
    init_database(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def test_due_dates_normalize_offsets_and_naive_values(session: Session) -> None:
    text_id = import_text(session, "The cat sleeps.")
    save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))
    item = session.exec(select(VocabItem)).one()
    offset = timezone(timedelta(hours=9))
    now = datetime.now(UTC)

    item.next_review = (now + timedelta(days=1)).astimezone(offset)
    item.created_at = datetime(2025, 1, 1, 9)
    session.add(item)
    session.commit()
    session.expire_all()

    item = session.get(VocabItem, item.id)
    assert item is not None
    assert item.next_review is not None and item.next_review.tzinfo == UTC
    assert item.next_review > datetime.now(UTC)
    assert item.created_at.tzinfo == UTC
    assert create_practice_session(session) == []

    item.next_review = (now - timedelta(days=1)).astimezone(offset)
    session.add(item)
    session.commit()
    assert len(create_practice_session(session)) == 1


def test_migration_normalizes_existing_offset_timestamps(tmp_path) -> None:
    database_path = tmp_path / "timestamps.db"
    engine = create_engine(f"sqlite:///{database_path}")
    enable_sqlite_pragmas(engine)
    init_database(engine)

    with Session(engine) as session:
        text = Text(title="T", language="en", raw_text="Text.")
        session.add(text)
        session.commit()
        text_id = text.id

    with engine.begin() as connection:
        connection.exec_driver_sql(
            "UPDATE texts SET created_at = ? WHERE id = ?",
            ("2026-05-01 09:00:00+09:00", text_id),
        )
        connection.exec_driver_sql("DELETE FROM schema_migrations WHERE version = 6")

    init_database(engine)
    with Session(engine) as session:
        migrated = session.get(Text, text_id)
        assert migrated is not None
        assert migrated.created_at == datetime(2026, 5, 1, tzinfo=UTC)
    with engine.connect() as connection:
        stored = connection.exec_driver_sql(
            "SELECT created_at FROM texts WHERE id = ?", (text_id,)
        ).scalar_one()
    assert stored == "2026-05-01 00:00:00.000000"
    assert len(list(tmp_path.glob("timestamps.db.bak-before-v6-*"))) == 1
    engine.dispose()
