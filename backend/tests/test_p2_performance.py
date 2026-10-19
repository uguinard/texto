import pytest
from pydantic import ValidationError
from sqlalchemy import event
from sqlmodel import Session, select

from app.models import Sentence, Token
from app.schemas import (
    MAX_TEXT_LENGTH,
    LexiconStateUpdate,
    SavedChunkCreateRequest,
    TextImportRequest,
    VocabSaveRequest,
)
from app.services.practice import _find_occurrence, create_practice_session
from app.services.saved_chunks import create_saved_chunk, list_saved_chunks
from app.services.texts import create_text, get_text_render
from app.services.vocabulary import list_lexicon, save_token, update_lexicon_state
from tests.test_p1_fixes import import_text, memory_engine, token_id
from app.database import init_database


@pytest.fixture
def session():
    engine = memory_engine()
    init_database(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


class QueryCounter:
    def __init__(self, session: Session) -> None:
        self.engine = session.get_bind()
        self.count = 0

    def _count(self, *_args) -> None:
        self.count += 1

    def __enter__(self) -> "QueryCounter":
        event.listen(self.engine, "before_cursor_execute", self._count)
        return self

    def __exit__(self, *_exc) -> None:
        event.remove(self.engine, "before_cursor_execute", self._count)


def test_text_import_uses_constant_queries(session: Session) -> None:
    raw = " ".join(f"Sentence number {i} here." for i in range(60))
    flushes: list[int] = []
    event.listen(session, "after_flush", lambda *_: flushes.append(1))
    result = create_text(session, TextImportRequest(title="t", language="en", raw_text=raw))
    assert result.sentence_count == 60
    # text + sentences + tokens (commit flush), not one flush per sentence
    assert len(flushes) <= 3
    positions = [s.position for s in session.exec(select(Sentence).order_by(Sentence.id))]
    assert positions == list(range(60))
    assert len(session.exec(select(Token)).all()) == 60 * 5


def test_raw_text_is_capped() -> None:
    with pytest.raises(ValidationError):
        TextImportRequest(title="t", language="en", raw_text="a" * (MAX_TEXT_LENGTH + 1))


def test_lexicon_exposures_and_single_item_update(session: Session) -> None:
    text_id = import_text(session, "The cat sleeps. The Cat runs. A dog.")
    item = save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "cat")))
    items = list_lexicon(session)
    assert [i.exposure_count for i in items] == [2]
    updated = update_lexicon_state(session, item.id, LexiconStateUpdate(state="known"))
    assert updated is not None and updated.state == "known" and updated.exposure_count == 2
    assert update_lexicon_state(session, 999, LexiconStateUpdate(state="known")) is None


def test_find_occurrence_returns_first_sentence_match(session: Session) -> None:
    text_id = import_text(session, "A dog sleeps. The Cat runs. The cat naps.")
    save_token(session, VocabSaveRequest(text_id=text_id, token_id=token_id(session, "Cat")))
    cards = create_practice_session(session)
    assert [c.sentence for c in cards] == ["The ____ runs."]
    assert cards[0].answer == "Cat"


def test_find_occurrence_none_when_absent(session: Session) -> None:
    from app.models import VocabItem

    import_text(session, "A dog sleeps.")
    item = VocabItem(language="en", surface="zebra")
    session.add(item)
    session.commit()
    assert _find_occurrence(session, item) is None


def test_render_restricts_lexemes_and_keeps_translation(session: Session) -> None:
    text_id = import_text(session, "The cat sleeps.")
    save_token(
        session,
        VocabSaveRequest(
            text_id=text_id, token_id=token_id(session, "cat"), lemma="cat", translation="gato"
        ),
    )
    render = get_text_render(session, text_id)
    assert render is not None
    cat = next(t for s in render.sentences for t in s.tokens if t.surface == "cat")
    assert (cat.state, cat.translation, cat.lemma) == ("learning", "gato", "cat")


def test_saved_chunk_list_has_constant_queries(session: Session) -> None:
    text_id = import_text(session, "One two three four five six seven eight.")
    ids = [token_id(session, w) for w in ("One", "two", "three", "four", "five", "six")]
    sentence_id = session.exec(select(Sentence.id)).first()
    for start, end in zip(ids, ids):
        create_saved_chunk(
            session,
            SavedChunkCreateRequest(
                text_id=text_id, sentence_id=sentence_id, start_token_id=start, end_token_id=end
            ),
        )
    with QueryCounter(session) as counter:
        chunks = list_saved_chunks(session)
    assert len(chunks) == 6
    assert counter.count <= 4
    assert {c.text_title for c in chunks} == {"T"}
