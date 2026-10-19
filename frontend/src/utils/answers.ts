const EDGE_PUNCTUATION = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;

// Tolerant of case, extra whitespace, and surrounding punctuation; accents still matter.
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFC")
    .replace(EDGE_PUNCTUATION, "")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase();
}

export function answersMatch(given: string, expected: string): boolean {
  const normalizedGiven = normalizeAnswer(given);
  return normalizedGiven !== "" && normalizedGiven === normalizeAnswer(expected);
}
