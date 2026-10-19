import unittest

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.database import enable_sqlite_pragmas
from app.models import (
    SavedChunkPracticeCard,
    SavedChunkReviewLog,
    Sentence,
    Text,
    Token,
    VocabItem,
)
from app.schemas import (
    PracticeReviewRequest,
    SavedChunkCreateRequest,
    SavedChunkUpdateRequest,
)
from app.services.practice import create_practice_session, record_practice_review
from app.services.saved_chunks import (
    create_saved_chunk,
    delete_saved_chunk,
    list_saved_chunks,
    update_saved_chunk,
)


class SavedChunkServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        enable_sqlite_pragmas(self.engine)
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

        text = Text(
            title="Context",
            language="en",
            raw_text="We look forward to it.",
        )
        self.session.add(text)
        self.session.commit()
        self.session.refresh(text)
        self.text = text
        if text.id is None:
            self.fail("The database did not assign a text ID.")
        self.text_id = text.id

        sentence = Sentence(
            text_id=text.id,
            position=0,
            content="We look forward to it.",
        )
        self.session.add(sentence)
        self.session.commit()
        self.session.refresh(sentence)
        self.sentence = sentence
        if sentence.id is None:
            self.fail("The database did not assign a sentence ID.")
        self.sentence_id = sentence.id

        self.tokens = [
            Token(
                sentence_id=sentence.id,
                order_index=index,
                surface=surface,
                whitespace_after=whitespace,
            )
            for index, (surface, whitespace) in enumerate(
                [
                    ("We", " "),
                    ("look", " "),
                    ("forward", " "),
                    ("to", " "),
                    ("it", ""),
                    (".", ""),
                ]
            )
        ]
        self.session.add_all(self.tokens)
        self.session.add(
            VocabItem(language="en", surface="it", state="learning")
        )
        self.session.commit()
        self.token_ids: list[int] = []
        for token in self.tokens:
            self.session.refresh(token)
            if token.id is None:
                self.fail("The database did not assign a token ID.")
            self.token_ids.append(token.id)

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()

    def _chunk_request(self) -> SavedChunkCreateRequest:
        return SavedChunkCreateRequest(
            text_id=self.text_id,
            sentence_id=self.sentence_id,
            start_token_id=self.token_ids[1],
            end_token_id=self.token_ids[3],
        )

    def test_save_preserves_context_and_deduplicates_source_range(self) -> None:
        request = self._chunk_request()

        saved = create_saved_chunk(self.session, request)
        duplicate = create_saved_chunk(self.session, request)

        if saved is None or duplicate is None:
            self.fail("Saving a valid chunk should return its persisted record.")
        self.assertEqual(saved.id, duplicate.id)
        self.assertEqual(saved.phrase, "look forward to")
        self.assertEqual(saved.source_sentence, "We look forward to it.")
        self.assertEqual(len(list_saved_chunks(self.session)), 1)

    def test_rejects_ranges_outside_sentence_and_reversed_ranges(self) -> None:
        other_sentence = Sentence(
            text_id=self.text_id,
            position=1,
            content="A second sentence.",
        )
        self.session.add(other_sentence)
        self.session.commit()
        self.session.refresh(other_sentence)
        if other_sentence.id is None:
            self.fail("The database did not assign the second sentence ID.")
        other_token = Token(
            sentence_id=other_sentence.id,
            order_index=0,
            surface="A",
        )
        self.session.add(other_token)
        self.session.commit()
        self.session.refresh(other_token)
        if other_token.id is None:
            self.fail("The database did not assign the second sentence token ID.")

        with self.assertRaises(ValueError):
            create_saved_chunk(
                self.session,
                SavedChunkCreateRequest(
                    text_id=self.text_id,
                    sentence_id=self.sentence_id,
                    start_token_id=self.token_ids[1],
                    end_token_id=other_token.id,
                ),
            )
        with self.assertRaises(ValueError):
            create_saved_chunk(
                self.session,
                SavedChunkCreateRequest(
                    text_id=self.text_id,
                    sentence_id=self.sentence_id,
                    start_token_id=self.token_ids[3],
                    end_token_id=self.token_ids[1],
                ),
            )

    def test_chunk_cloze_and_review_preserve_word_practice(self) -> None:
        chunk = create_saved_chunk(self.session, self._chunk_request())
        if chunk is None:
            self.fail("Saving a valid chunk should return its persisted record.")
        cards = create_practice_session(self.session)
        cards_by_type = {card.item_type: card for card in cards}

        self.assertEqual(cards_by_type["chunk"].sentence, "We ____ it.")
        self.assertEqual(cards_by_type["chunk"].answer, "look forward to")
        self.assertEqual(cards_by_type["word"].answer, "it")

        chunk_review = record_practice_review(
            self.session,
            PracticeReviewRequest(
                card_id=cards_by_type["chunk"].id,
                saved_chunk_id=chunk.id,
                correct=True,
                answer_given="look forward to",
            ),
        )
        word = self.session.exec(select(VocabItem)).first()
        if word is None or word.id is None:
            self.fail("The word practice fixture is missing.")
        word_review = record_practice_review(
            self.session,
            PracticeReviewRequest(
                card_id=cards_by_type["word"].id,
                vocab_item_id=word.id,
                correct=True,
                answer_given="it",
            ),
        )

        if chunk_review is None or word_review is None:
            self.fail("Both learning-item reviews should be recorded.")
        self.assertEqual(chunk_review.saved_chunk_id, chunk.id)
        self.assertEqual(word_review.vocab_item_id, word.id)

    def test_note_updates_and_review_requires_exactly_one_item(self) -> None:
        chunk = create_saved_chunk(self.session, self._chunk_request())
        if chunk is None:
            self.fail("Saving a valid chunk should return its persisted record.")
        updated = update_saved_chunk(
            self.session,
            chunk.id,
            SavedChunkUpdateRequest(note="  useful collocation  "),
        )
        if updated is None:
            self.fail("Updating a saved chunk should return its record.")
        self.assertEqual(updated.note, "useful collocation")
        with self.assertRaises(ValueError):
            PracticeReviewRequest(
                card_id=1,
                correct=True,
                answer_given="x",
            )
        with self.assertRaises(ValueError):
            PracticeReviewRequest(
                card_id=1,
                vocab_item_id=1,
                saved_chunk_id=1,
                correct=True,
                answer_given="x",
            )

    def test_deleting_chunk_removes_its_practice_history(self) -> None:
        chunk = create_saved_chunk(self.session, self._chunk_request())
        if chunk is None:
            self.fail("Saving a valid chunk should return its persisted record.")
        chunk_card = next(
            card
            for card in create_practice_session(self.session)
            if card.item_type == "chunk"
        )
        record_practice_review(
            self.session,
            PracticeReviewRequest(
                card_id=chunk_card.id,
                saved_chunk_id=chunk.id,
                correct=False,
                answer_given="",
            ),
        )

        self.assertTrue(delete_saved_chunk(self.session, chunk.id))
        self.session.expire_all()
        self.assertIsNone(
            self.session.get(SavedChunkPracticeCard, chunk_card.id)
        )
        self.assertEqual(
            len(
                self.session.exec(
                    select(SavedChunkReviewLog).where(
                        SavedChunkReviewLog.saved_chunk_id == chunk.id
                    )
                ).all()
            ),
            0,
        )


if __name__ == "__main__":
    unittest.main()
