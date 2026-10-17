from pathlib import Path
from collections.abc import Generator

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


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
