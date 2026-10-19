import sqlite3
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, select

from app.database import enable_sqlite_pragmas, init_database
from app.models import (
    Annotation,
    PracticeCard,
    ReviewLog,
    Sentence,
    Text,
    Token,
    VocabItem,
)
from app.schemas import PracticeReviewRequest, TextImportRequest, VocabSaveRequest
from app.services.practice import create_practice_session, record_practice_review
from app.services.texts import create_text, delete_text
from app.services.vocabulary import delete_lexicon_item, save_token


def memory_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    enable_sqlite_pragmas(engine)
    return engine


@pytest.fixture
def session():
    engine = memory_engine()
    init_database(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def import_text(db: Session, raw: str = "The cat sleeps. The cat runs.") -> int:
    return create_text(
        db, TextImportRequest(title="T", language="en", raw_text=raw)
    ).id


def token_id(db: Session, surface: str) -> int:
    token = db.exec(select(Token).where(Token.surface == surface)).first()
    assert token is not None and token.id is not None
    return token.id


# (1) practice session does not create rows on every call
def test_practice_session_is_idempotent(session: Session) -> None:
    text_id = import_text(session)
    save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))

    first = create_practice_session(session)
    second = create_practice_session(session)

    assert [c.id for c in first] == [c.id for c in second]
    assert len(session.exec(select(PracticeCard)).all()) == 1


# (2) foreign keys are enforced and cascades work
def test_foreign_keys_enabled(session: Session) -> None:
    assert session.connection().exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def test_delete_text_cascades(session: Session) -> None:
    text_id = import_text(session)
    tid = token_id(session, "cat")
    sentence_id = session.exec(select(Sentence.id)).first()
    session.add(
        Annotation(
            text_id=text_id,
            sentence_id=sentence_id,
            start_token_id=tid,
            end_token_id=tid,
            category="lexical",
        )
    )
    session.commit()

    assert delete_text(session, text_id) is True
    assert delete_text(session, text_id) is False
    for model in (Text, Sentence, Token, Annotation):
        assert session.exec(select(model)).all() == []


def test_deleting_vocab_removes_cards_and_logs(session: Session) -> None:
    text_id = import_text(session)
    item = save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))
    card = create_practice_session(session)[0]
    record_practice_review(
        session,
        PracticeReviewRequest(
            card_id=card.id, vocab_item_id=item.id, correct=True, answer_given="cat"
        ),
    )
    assert delete_lexicon_item(session, item.id)
    session.expire_all()
    assert session.exec(select(PracticeCard)).all() == []
    assert session.exec(select(ReviewLog)).all() == []


# (3)/(4) skip, reveal, scheduling
def _review(session: Session, correct: bool, revealed: bool = False, given: str = "cat"):
    text_id = session.exec(select(Text.id)).first()
    item = session.exec(select(VocabItem)).first()
    card = create_practice_session(session)
    assert item is not None and item.id is not None
    return record_practice_review(
        session,
        PracticeReviewRequest(
            card_id=card[0].id if card else 1,
            vocab_item_id=item.id,
            correct=correct,
            answer_given=given,
            answer_revealed=revealed,
        ),
    ), text_id


def _setup_item(session: Session) -> VocabItem:
    text_id = import_text(session)
    save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))
    item = session.exec(select(VocabItem)).one()
    return item


def _next_review(item: VocabItem) -> datetime:
    value = item.next_review
    assert value is not None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def test_failed_review_is_not_due_immediately_and_logs_failure(session: Session) -> None:
    item = _setup_item(session)
    _review(session, correct=False, given="")
    session.refresh(item)
    assert _next_review(item) > datetime.now(UTC) + timedelta(minutes=5)
    assert create_practice_session(session) == []
    assert session.exec(select(ReviewLog)).one().correct is False


def test_revealed_answer_counts_as_failed(session: Session) -> None:
    item = _setup_item(session)
    _review(session, correct=True, revealed=True)
    session.refresh(item)
    assert item.interval_days == 0.0
    assert item.mastery < 0.5
    assert session.exec(select(ReviewLog)).one().correct is False


def test_ease_recovers_on_correct_answers(session: Session) -> None:
    item = _setup_item(session)
    _review(session, correct=False)
    session.refresh(item)
    lowered = item.ease_factor
    item.next_review = None
    session.add(item)
    session.commit()
    _review(session, correct=True)
    session.refresh(item)
    assert item.ease_factor > lowered
    assert item.interval_days == 1.0


def test_answer_revealed_defaults_false() -> None:
    request = PracticeReviewRequest(card_id=1, vocab_item_id=1, correct=True, answer_given="")
    assert request.answer_revealed is False


# (6) uniqueness and upsert
def test_save_token_upserts_case_insensitively(session: Session) -> None:
    text_id = import_text(session, "Cat sat. The cat ran.")
    first = save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "Cat")))
    second = save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))
    assert first.id == second.id
    assert len(session.exec(select(VocabItem)).all()) == 1


def test_unique_index_blocks_duplicates(session: Session) -> None:
    from sqlalchemy.exc import IntegrityError

    session.add(VocabItem(language="en", surface="Run"))
    session.commit()
    session.add(VocabItem(language="en", surface="run"))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


# (5) versioned migrations with backup, run once
def _legacy_database(path) -> None:
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE texts (id INTEGER PRIMARY KEY, title TEXT, language TEXT, raw_text TEXT);
        CREATE TABLE sentences (id INTEGER PRIMARY KEY, text_id INTEGER, position INTEGER, content TEXT);
        CREATE TABLE tokens (id INTEGER PRIMARY KEY, sentence_id INTEGER, order_index INTEGER,
                             surface TEXT, whitespace_after TEXT DEFAULT '');
        CREATE TABLE vocab_items (id INTEGER PRIMARY KEY, language TEXT, surface TEXT,
                                  lemma TEXT, state TEXT DEFAULT 'learning');
        INSERT INTO texts VALUES (1, 'Old', 'en', 'Hello world.');
        INSERT INTO sentences VALUES (1, 1, 0, 'Hello world.');
        INSERT INTO vocab_items VALUES (1, 'en', 'Run', NULL, 'learning');
        INSERT INTO vocab_items VALUES (2, 'en', 'run', NULL, 'learning');
        """
    )
    connection.commit()
    connection.close()


def test_migrations_run_once_with_backup(tmp_path) -> None:
    db_path = tmp_path / "legacy.db"
    _legacy_database(db_path)
    engine = create_engine(f"sqlite:///{db_path}")
    enable_sqlite_pragmas(engine)

    init_database(engine)

    backups = list(tmp_path.glob("legacy.db.bak-before-v1-*"))
    assert len(backups) == 1
    with Session(engine) as db:
        assert len(db.exec(select(VocabItem)).all()) == 1
        assert len(db.exec(select(Token)).all()) == 3
    versions = [
        row[0]
        for row in engine.connect().exec_driver_sql("SELECT version FROM schema_migrations")
    ]
    assert versions == [1, 2, 3, 4, 5]

    init_database(engine)
    assert len(list(tmp_path.glob("legacy.db.bak-*"))) == 1
    engine.dispose()


def test_fresh_database_marks_migrations_applied_without_backup(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    init_database(engine)
    assert list(tmp_path.glob("*.bak-*")) == []
    count = engine.connect().exec_driver_sql("SELECT COUNT(*) FROM schema_migrations").scalar()
    assert count == 5
    engine.dispose()
