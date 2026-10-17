import re
from dataclasses import dataclass


TOKEN_PATTERN = re.compile(r"\w+(?:['’]\w+)*|[^\w\s]", re.UNICODE)


@dataclass(frozen=True)
class TokenPart:
    surface: str
    whitespace_after: str


def tokenize_sentence(sentence: str) -> list[TokenPart]:
    matches = list(TOKEN_PATTERN.finditer(sentence))
    tokens: list[TokenPart] = []

    for index, match in enumerate(matches):
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(sentence)
        tokens.append(
            TokenPart(
                surface=match.group(),
                whitespace_after=sentence[match.end():next_start],
            )
        )

    return tokens
