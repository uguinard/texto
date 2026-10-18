import { A, useLocation, useNavigate } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import type { JSX } from "solid-js";
import "./App.css";

type TextListItem = {
  id: number;
  title: string;
  language: string;
};

type TextImportResult = {
  id: number;
  sentence_count: number;
  approximate_token_count: number;
};

type RenderedToken = {
  id: number;
  surface: string;
  sentence_id: number;
  order_index: number;
  whitespace_after: string;
  state: "new" | "learning" | "known";
};

type AnnotationCategory =
  | "lexical"
  | "syntactic"
  | "pragmatic"
  | "metaphor"
  | "discourse";

type ReaderAnnotation = {
  id: number;
  text_id: number;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  category: AnnotationCategory;
  note: string | null;
  created_at: string;
};

type SavedVocabItem = {
  id: number;
  surface: string;
  lemma: string | null;
  language: string;
  translation: string | null;
  state: "new" | "learning" | "known";
};

type LexiconState = "new" | "learning" | "known";

type LexiconItem = {
  vocab_item_id: number;
  language: string;
  lemma: string;
  surface_example: string;
  translation: string | null;
  state: LexiconState;
  exposure_count: number;
  created_at: string;
  next_review: string | null;
};

type SavedChunk = {
  id: number;
  text_id: number;
  text_title: string;
  language: string;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  phrase: string;
  source_sentence: string;
  note: string | null;
  state: LexiconState;
  created_at: string;
  next_review: string | null;
};

type PracticeCard = {
  id: number;
  item_type: "word" | "chunk";
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  card_type: "cloze";
  sentence: string;
  answer: string;
  hint: string | null;
};

type PracticeReview = {
  card_id: number;
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  mastery: number;
};

type RenderedSentence = {
  id: number;
  position: number;
  content: string;
  tokens: RenderedToken[];
};

type RenderedText = {
  text_id: number;
  title: string;
  language: string;
  sentences: RenderedSentence[];
};

type LookupResponse = {
  surface: string;
  lemma: string | null;
  translation: string | null;
  target_definition: string | null;
  example: string | null;
  grammar_note: string | null;
  pragmatics_note: string | null;
  confidence: "high" | "medium" | "low";
  uncertain: boolean;
};

function isTextListItem(value: unknown): value is TextListItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "language" in value &&
    typeof value.language === "string"
  );
}

function isTextList(value: unknown): value is TextListItem[] {
  return Array.isArray(value) && value.every(isTextListItem);
}

function isTextImportResult(value: unknown): value is TextImportResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "sentence_count" in value &&
    typeof value.sentence_count === "number" &&
    "approximate_token_count" in value &&
    typeof value.approximate_token_count === "number"
  );
}

function isRenderedToken(value: unknown): value is RenderedToken {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "surface" in value &&
    typeof value.surface === "string" &&
    "sentence_id" in value &&
    typeof value.sentence_id === "number" &&
    "order_index" in value &&
    typeof value.order_index === "number" &&
    "whitespace_after" in value &&
    typeof value.whitespace_after === "string" &&
    "state" in value &&
    (value.state === "new" ||
      value.state === "learning" ||
      value.state === "known")
  );
}

function isAnnotationCategory(value: string): value is AnnotationCategory {
  return (
    value === "lexical" ||
    value === "syntactic" ||
    value === "pragmatic" ||
    value === "metaphor" ||
    value === "discourse"
  );
}

function isReaderAnnotation(value: unknown): value is ReaderAnnotation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "text_id" in value &&
    typeof value.text_id === "number" &&
    "sentence_id" in value &&
    typeof value.sentence_id === "number" &&
    "start_token_id" in value &&
    typeof value.start_token_id === "number" &&
    "end_token_id" in value &&
    typeof value.end_token_id === "number" &&
    "category" in value &&
    typeof value.category === "string" &&
    isAnnotationCategory(value.category) &&
    "note" in value &&
    (typeof value.note === "string" || value.note === null) &&
    "created_at" in value &&
    typeof value.created_at === "string"
  );
}

function isReaderAnnotationList(value: unknown): value is ReaderAnnotation[] {
  return Array.isArray(value) && value.every(isReaderAnnotation);
}

function getAnnotationForToken(
  annotations: ReaderAnnotation[],
  sentence: RenderedSentence,
  token: RenderedToken,
): ReaderAnnotation | undefined {
  const tokenOrder = token.order_index;
  return annotations.find((annotation) => {
    if (annotation.sentence_id !== sentence.id) {
      return false;
    }
    const start = sentence.tokens.find(
      (sentenceToken) => sentenceToken.id === annotation.start_token_id,
    );
    const end = sentence.tokens.find(
      (sentenceToken) => sentenceToken.id === annotation.end_token_id,
    );
    return (
      start !== undefined &&
      end !== undefined &&
      tokenOrder >= start.order_index &&
      tokenOrder <= end.order_index
    );
  });
}

function getAnnotationText(
  annotation: ReaderAnnotation,
  text: RenderedText,
): string {
  const sentence = text.sentences.find(
    (candidate) => candidate.id === annotation.sentence_id,
  );
  if (!sentence) {
    return "";
  }
  const start = sentence.tokens.findIndex(
    (token) => token.id === annotation.start_token_id,
  );
  const end = sentence.tokens.findIndex(
    (token) => token.id === annotation.end_token_id,
  );
  if (start < 0 || end < start) {
    return "";
  }
  return sentence.tokens
    .slice(start, end + 1)
    .map((token) => `${token.surface}${token.whitespace_after}`)
    .join("")
    .trim();
}

function isSavedVocabItem(value: unknown): value is SavedVocabItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "surface" in value &&
    typeof value.surface === "string" &&
    "lemma" in value &&
    (typeof value.lemma === "string" || value.lemma === null) &&
    "language" in value &&
    typeof value.language === "string" &&
    "translation" in value &&
    (typeof value.translation === "string" || value.translation === null) &&
    "state" in value &&
    (value.state === "new" ||
      value.state === "learning" ||
      value.state === "known")
  );
}

function isLexiconItem(value: unknown): value is LexiconItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "vocab_item_id" in value &&
    typeof value.vocab_item_id === "number" &&
    "language" in value &&
    typeof value.language === "string" &&
    "lemma" in value &&
    typeof value.lemma === "string" &&
    "surface_example" in value &&
    typeof value.surface_example === "string" &&
    "translation" in value &&
    (typeof value.translation === "string" || value.translation === null) &&
    "state" in value &&
    (value.state === "new" ||
      value.state === "learning" ||
      value.state === "known") &&
    "exposure_count" in value &&
    typeof value.exposure_count === "number" &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "next_review" in value &&
    (typeof value.next_review === "string" || value.next_review === null)
  );
}

function isLexiconList(value: unknown): value is LexiconItem[] {
  return Array.isArray(value) && value.every(isLexiconItem);
}

function isLexiconState(value: unknown): value is LexiconState {
  return value === "new" || value === "learning" || value === "known";
}

function isSavedChunk(value: unknown): value is SavedChunk {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "text_id" in value &&
    typeof value.text_id === "number" &&
    "text_title" in value &&
    typeof value.text_title === "string" &&
    "language" in value &&
    typeof value.language === "string" &&
    "sentence_id" in value &&
    typeof value.sentence_id === "number" &&
    "start_token_id" in value &&
    typeof value.start_token_id === "number" &&
    "end_token_id" in value &&
    typeof value.end_token_id === "number" &&
    "phrase" in value &&
    typeof value.phrase === "string" &&
    "source_sentence" in value &&
    typeof value.source_sentence === "string" &&
    "note" in value &&
    (typeof value.note === "string" || value.note === null) &&
    "state" in value &&
    isLexiconState(value.state) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "next_review" in value &&
    (typeof value.next_review === "string" || value.next_review === null)
  );
}

function isSavedChunkList(value: unknown): value is SavedChunk[] {
  return Array.isArray(value) && value.every(isSavedChunk);
}

function formatNextReview(nextReview: string | null): string {
  if (nextReview === null || new Date(nextReview).getTime() <= Date.now()) {
    return "Due now";
  }
  return new Date(nextReview).toLocaleString();
}

function isPracticeCard(value: unknown): value is PracticeCard {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "vocab_item_id" in value &&
    (typeof value.vocab_item_id === "number" || value.vocab_item_id === null) &&
    "saved_chunk_id" in value &&
    (typeof value.saved_chunk_id === "number" || value.saved_chunk_id === null) &&
    "item_type" in value &&
    (value.item_type === "word" || value.item_type === "chunk") &&
    ((value.item_type === "word" && typeof value.vocab_item_id === "number") ||
      (value.item_type === "chunk" && typeof value.saved_chunk_id === "number")) &&
    "card_type" in value &&
    value.card_type === "cloze" &&
    "sentence" in value &&
    typeof value.sentence === "string" &&
    "answer" in value &&
    typeof value.answer === "string" &&
    "hint" in value &&
    (typeof value.hint === "string" || value.hint === null)
  );
}

function isPracticeCardList(value: unknown): value is PracticeCard[] {
  return Array.isArray(value) && value.every(isPracticeCard);
}

function isPracticeReview(value: unknown): value is PracticeReview {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "card_id" in value &&
    typeof value.card_id === "number" &&
    "vocab_item_id" in value &&
    (typeof value.vocab_item_id === "number" || value.vocab_item_id === null) &&
    "saved_chunk_id" in value &&
    (typeof value.saved_chunk_id === "number" || value.saved_chunk_id === null) &&
    ((typeof value.vocab_item_id === "number" && value.saved_chunk_id === null) ||
      (typeof value.saved_chunk_id === "number" && value.vocab_item_id === null)) &&
    "mastery" in value &&
    typeof value.mastery === "number"
  );
}

function isRenderedSentence(value: unknown): value is RenderedSentence {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "position" in value &&
    typeof value.position === "number" &&
    "content" in value &&
    typeof value.content === "string" &&
    "tokens" in value &&
    Array.isArray(value.tokens) &&
    value.tokens.every(isRenderedToken)
  );
}

function isRenderedText(value: unknown): value is RenderedText {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "text_id" in value &&
    typeof value.text_id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "language" in value &&
    typeof value.language === "string" &&
    "sentences" in value &&
    Array.isArray(value.sentences) &&
    value.sentences.every(isRenderedSentence)
  );
}

function isLookupResponse(value: unknown): value is LookupResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const isNullableString = (field: unknown) =>
    typeof field === "string" || field === null;

  return (
    "surface" in value &&
    typeof value.surface === "string" &&
    "lemma" in value &&
    isNullableString(value.lemma) &&
    "translation" in value &&
    isNullableString(value.translation) &&
    "target_definition" in value &&
    isNullableString(value.target_definition) &&
    "example" in value &&
    isNullableString(value.example) &&
    "grammar_note" in value &&
    isNullableString(value.grammar_note) &&
    "pragmatics_note" in value &&
    isNullableString(value.pragmatics_note) &&
    "confidence" in value &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low") &&
    "uncertain" in value &&
    typeof value.uncertain === "boolean"
  );
}

function getErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("detail" in value)) {
    return null;
  }

  return typeof value.detail === "string" ? value.detail : null;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = createSignal<"reader" | "lexicon" | "practice">(
    location.pathname === "/practice" ? "practice" : "lexicon",
  );
  const [lexiconFilter, setLexiconFilter] = createSignal<"all" | LexiconState>("all");
  const [lexiconSearch, setLexiconSearch] = createSignal("");
  const [savedTexts, { refetch: refreshSavedTexts }] = createResource(
    async (): Promise<TextListItem[]> => {
      const response = await fetch("/api/texts");
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to load saved texts.");
      }
      if (!isTextList(body)) {
        throw new Error("The backend returned an unexpected saved-text list.");
      }
      return body;
    },
  );
  const [lexiconItems, { refetch: refreshLexicon }] = createResource(
    () =>
      currentView() === "lexicon"
        ? [lexiconFilter(), lexiconSearch()] as const
        : null,
    async ([state, search]): Promise<LexiconItem[]> => {
      const params = new URLSearchParams();
      if (state !== "all") {
        params.set("state", state);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const query = params.toString();
      const response = await fetch(`/api/lexicon${query ? `?${query}` : ""}`);
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to load the lexicon.");
      }
      if (!isLexiconList(body)) {
        throw new Error("The backend returned an unexpected lexicon response.");
      }
      return body;
    },
  );
  const [savedChunks, { refetch: refreshSavedChunks }] = createResource(
    () => currentView() === "lexicon" ? true : undefined,
    async (_enabled): Promise<SavedChunk[]> => {
      const response = await fetch("/api/lexicon/chunks");
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to load saved chunks.");
      }
      if (!isSavedChunkList(body)) {
        throw new Error("The backend returned an unexpected saved-chunk response.");
      }
      return body;
    },
  );
  const [title, setTitle] = createSignal("");
  const [language, setLanguage] = createSignal("");
  const [rawText, setRawText] = createSignal("");
  const [result, setResult] = createSignal<TextImportResult | null>(null);
  const [renderedText, setRenderedText] = createSignal<RenderedText | null>(null);
  const [readerAnnotations, setReaderAnnotations] = createSignal<ReaderAnnotation[]>([]);
  const [selectedToken, setSelectedToken] = createSignal<RenderedToken | null>(null);
  const [annotationStart, setAnnotationStart] = createSignal<RenderedToken | null>(null);
  const [annotationEnd, setAnnotationEnd] = createSignal<RenderedToken | null>(null);
  const [annotationCategory, setAnnotationCategory] = createSignal<AnnotationCategory>("lexical");
  const [annotationNote, setAnnotationNote] = createSignal("");
  const [annotationSaving, setAnnotationSaving] = createSignal(false);
  const [annotationError, setAnnotationError] = createSignal<string | null>(null);
  const [lookupResult, setLookupResult] = createSignal<LookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = createSignal(false);
  const [lookupError, setLookupError] = createSignal<string | null>(null);
  const [lookupRequestId, setLookupRequestId] = createSignal(0);
  const [savingVocab, setSavingVocab] = createSignal(false);
  const [saveVocabError, setSaveVocabError] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [importing, setImporting] = createSignal(false);
  const [openingTextId, setOpeningTextId] = createSignal<number | null>(null);
  const [readerError, setReaderError] = createSignal<string | null>(null);
  const [readerRequestId, setReaderRequestId] = createSignal(0);
  const [lexiconActionError, setLexiconActionError] = createSignal<string | null>(null);
  const [savedChunkNotes, setSavedChunkNotes] = createSignal<Record<number, string>>({});
  const visibleSavedChunks = createMemo(() => {
    const search = lexiconSearch().trim().toLocaleLowerCase();
    return (savedChunks() ?? []).filter((chunk) => {
      const matchesState =
        lexiconFilter() === "all" || chunk.state === lexiconFilter();
      const matchesSearch =
        !search ||
        `${chunk.phrase} ${chunk.source_sentence} ${chunk.text_title}`
          .toLocaleLowerCase()
          .includes(search);
      return matchesState && matchesSearch;
    });
  });
  const [practiceCards, setPracticeCards] = createSignal<PracticeCard[]>([]);
  const [practiceLoading, setPracticeLoading] = createSignal(false);
  const [practiceError, setPracticeError] = createSignal<string | null>(null);
  const [practiceIndex, setPracticeIndex] = createSignal(0);
  const [practiceAnswer, setPracticeAnswer] = createSignal("");
  const [practiceChecked, setPracticeChecked] = createSignal(false);
  const [practiceSubmitting, setPracticeSubmitting] = createSignal(false);
  const [practiceCorrect, setPracticeCorrect] = createSignal(0);
  const [practiceReviewed, setPracticeReviewed] = createSignal(0);
  const [practiceAnswerCorrect, setPracticeAnswerCorrect] = createSignal(false);
  const [practiceReviewError, setPracticeReviewError] = createSignal<string | null>(null);

  const setReaderWordState = (
    item: LexiconItem,
    state: LexiconState,
  ) => {
    const text = renderedText();
    if (
      !text ||
      text.language.toLocaleLowerCase() !== item.language.toLocaleLowerCase()
    ) {
      return;
    }

    const forms = new Set(
      [item.surface_example, item.lemma].map((form) =>
        form.toLocaleLowerCase(),
      ),
    );
    setRenderedText((current) => {
      if (!current || current.text_id !== text.text_id) {
        return current;
      }
      return {
        ...current,
        sentences: current.sentences.map((sentence) => ({
          ...sentence,
          tokens: sentence.tokens.map((token) =>
            forms.has(token.surface.toLocaleLowerCase())
              ? { ...token, state }
              : token,
          ),
        })),
      };
    });
    setSelectedToken((token) =>
      token && forms.has(token.surface.toLocaleLowerCase())
        ? { ...token, state }
        : token,
    );
  };

  const changeLexiconState = async (
    item: LexiconItem,
    state: LexiconState,
  ) => {
    try {
      const response = await fetch(`/api/lexicon/${item.vocab_item_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to update this word.");
      }
      if (!isLexiconItem(body)) {
        throw new Error("The backend returned an unexpected lexicon item.");
      }
      setReaderWordState(body, body.state);
      await refreshLexicon();
    } catch (requestError) {
      setLexiconActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update this word.",
      );
    }
  };

  const deleteLexiconItem = async (item: LexiconItem) => {
    try {
      const response = await fetch(`/api/lexicon/${item.vocab_item_id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        throw new Error(getErrorMessage(body) ?? "Unable to delete this word.");
      }
      setReaderWordState(item, "new");
      await refreshLexicon();
    } catch (requestError) {
      setLexiconActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this word.",
      );
    }
  };

  const updateSavedChunk = async (
    chunk: SavedChunk,
    update: { state?: LexiconState; note?: string },
  ) => {
    try {
      const response = await fetch(`/api/lexicon/chunks/${chunk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...update,
          ...(update.note !== undefined ? { note: update.note.trim() || null } : {}),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to update this chunk.");
      }
      if (!isSavedChunk(body)) {
        throw new Error("The backend returned an unexpected saved chunk.");
      }
      setSavedChunkNotes((current) => {
        const { [chunk.id]: _removed, ...remaining } = current;
        return remaining;
      });
      await refreshSavedChunks();
    } catch (requestError) {
      setLexiconActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update this chunk.",
      );
    }
  };

  const deleteSavedChunk = async (chunk: SavedChunk) => {
    try {
      const response = await fetch(`/api/lexicon/chunks/${chunk.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        throw new Error(getErrorMessage(body) ?? "Unable to delete this chunk.");
      }
      await refreshSavedChunks();
    } catch (requestError) {
      setLexiconActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this chunk.",
      );
    }
  };

  const fetchRenderedText = async (textId: number): Promise<RenderedText> => {
    const response = await fetch(`/api/texts/${textId}/render`);
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(body) ?? "Unable to open this text.");
    }
    if (!isRenderedText(body)) {
      throw new Error("The backend returned an unexpected reader response.");
    }
    return body;
  };

  const fetchTextAnnotations = async (
    textId: number,
  ): Promise<ReaderAnnotation[]> => {
    const response = await fetch(`/api/texts/${textId}/annotations`);
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(body) ?? "Unable to load annotations.");
    }
    if (!isReaderAnnotationList(body)) {
      throw new Error("The backend returned an unexpected annotations response.");
    }
    return body;
  };

  const hasAnnotationSelection = () => {
    const start = annotationStart();
    const end = annotationEnd();
    return Boolean(start && end);
  };

  const isInAnnotationSelection = (token: RenderedToken) => {
    const start = annotationStart();
    const end = annotationEnd();
    if (!start || !end || token.sentence_id !== start.sentence_id) {
      return false;
    }
    const lowerBound = Math.min(start.order_index, end.order_index);
    const upperBound = Math.max(start.order_index, end.order_index);
    return token.order_index >= lowerBound && token.order_index <= upperBound;
  };

  const cancelAnnotation = () => {
    setAnnotationStart(null);
    setAnnotationEnd(null);
    setAnnotationNote("");
    setAnnotationError(null);
  };

  const saveAnnotation = async () => {
    const text = renderedText();
    const start = annotationStart();
    const end = annotationEnd();
    if (
      !text ||
      !start ||
      !end ||
      start.sentence_id !== end.sentence_id ||
      annotationSaving()
    ) {
      return;
    }
    const firstToken = start.order_index <= end.order_index ? start : end;
    const lastToken = start.order_index <= end.order_index ? end : start;

    setAnnotationSaving(true);
    setAnnotationError(null);
    try {
      const response = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: text.text_id,
          sentence_id: firstToken.sentence_id,
          start_token_id: firstToken.id,
          end_token_id: lastToken.id,
          category: annotationCategory(),
          note: annotationNote().trim() || null,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to save this annotation.");
      }
      if (!isReaderAnnotation(body)) {
        throw new Error("The backend returned an unexpected annotation response.");
      }
      setReaderAnnotations((current) => [...current, body]);
      cancelAnnotation();
    } catch (requestError) {
      setAnnotationError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save this annotation.",
      );
    } finally {
      setAnnotationSaving(false);
    }
  };

  const loadPracticeSession = async () => {
    setPracticeLoading(true);
    setPracticeError(null);
    setPracticeReviewError(null);
    setPracticeCards([]);
    setPracticeIndex(0);
    setPracticeAnswer("");
    setPracticeChecked(false);
    setPracticeCorrect(0);
    setPracticeReviewed(0);
    try {
      const response = await fetch("/api/practice/session");
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to load practice cards.");
      }
      if (!isPracticeCardList(body)) {
        throw new Error("The backend returned an unexpected practice session.");
      }
      setPracticeCards(body);
    } catch (requestError) {
      setPracticeError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load practice cards.",
      );
    } finally {
      setPracticeLoading(false);
    }
  };

  const checkPracticeAnswer = async () => {
    const card = practiceCards()[practiceIndex()];
    const answerGiven = practiceAnswer().trim();
    if (!card || !answerGiven || practiceSubmitting() || practiceChecked()) {
      return;
    }

    const correct =
      answerGiven.toLocaleLowerCase() === card.answer.trim().toLocaleLowerCase();
    setPracticeSubmitting(true);
    setPracticeReviewError(null);
    try {
      const response = await fetch("/api/practice/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          ...(card.item_type === "word"
            ? { vocab_item_id: card.vocab_item_id }
            : { saved_chunk_id: card.saved_chunk_id }),
          correct,
          answer_given: answerGiven,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to record this review.");
      }
      if (!isPracticeReview(body)) {
        throw new Error("The backend returned an unexpected review response.");
      }
      setPracticeAnswerCorrect(correct);
      setPracticeChecked(true);
      setPracticeReviewed((count) => count + 1);
      if (correct) {
        setPracticeCorrect((count) => count + 1);
      }
    } catch (requestError) {
      setPracticeReviewError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record this review.",
      );
    } finally {
      setPracticeSubmitting(false);
    }
  };

  const nextPracticeCard = () => {
    setPracticeIndex((index) => index + 1);
    setPracticeAnswer("");
    setPracticeChecked(false);
    setPracticeReviewError(null);
  };

  const openSavedText = async (textId: number) => {
    const requestId = readerRequestId() + 1;
    setReaderRequestId(requestId);
    setOpeningTextId(textId);
    setReaderError(null);
    setResult(null);
    closeLookup();

    try {
      setReaderAnnotations([]);
      cancelAnnotation();
      const [text, annotations] = await Promise.all([
        fetchRenderedText(textId),
        fetchTextAnnotations(textId),
      ]);
      if (requestId === readerRequestId()) {
        setRenderedText(text);
        setReaderAnnotations(annotations);
      }
    } catch (requestError) {
      if (requestId === readerRequestId()) {
        setReaderError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to open this text.",
        );
      }
    } finally {
      if (requestId === readerRequestId()) {
        setOpeningTextId(null);
      }
    }
  };

  const handleTokenClick = async (
    token: RenderedToken,
    sentence: RenderedSentence,
    text: RenderedText,
    shiftKey = false,
  ) => {
    const start = annotationStart();
    if (shiftKey && start) {
      if (start.sentence_id !== token.sentence_id) {
        setAnnotationError("Select the end of a highlight in the same sentence.");
        return;
      }
      setAnnotationEnd(token);
      setAnnotationError(null);
      closeLookup();
      return;
    }
    setAnnotationStart(token);
    setAnnotationEnd(null);
    setAnnotationError(null);

    const requestId = lookupRequestId() + 1;
    setLookupRequestId(requestId);
    setSelectedToken(token);
    setLookupResult(null);
    setLookupError(null);
    setLookupLoading(true);
    setSaveVocabError(null);

    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: text.text_id,
          token_id: token.id,
          surface: token.surface,
          sentence: sentence.content,
          language: text.language,
        }),
      });
      const body: unknown = await response.json();
      if (requestId !== lookupRequestId()) {
        return;
      }

      if (!response.ok) {
        setLookupError(getErrorMessage(body) ?? "Lookup failed.");
        return;
      }

      if (!isLookupResponse(body)) {
        setLookupError("The backend returned an unexpected lookup response.");
        return;
      }

      setLookupResult(body);
    } catch (requestError) {
      if (requestId === lookupRequestId()) {
        setLookupError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reach the lookup service.",
        );
      }
    } finally {
      if (requestId === lookupRequestId()) {
        setLookupLoading(false);
      }
    }
  };

  const closeLookup = () => {
    setLookupRequestId(lookupRequestId() + 1);
    setSelectedToken(null);
    setLookupResult(null);
    setLookupError(null);
    setLookupLoading(false);
    setSaveVocabError(null);
  };

  const saveSelectedToken = async () => {
    const token = selectedToken();
    const text = renderedText();
    if (!token || !text || token.state !== "new" || savingVocab()) {
      return;
    }

    setSavingVocab(true);
    setSaveVocabError(null);

    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: text.text_id,
          token_id: token.id,
          lemma: lookupResult()?.lemma ?? null,
          translation: lookupResult()?.translation ?? null,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setSaveVocabError(getErrorMessage(body) ?? "Unable to save this word.");
        return;
      }
      if (!isSavedVocabItem(body)) {
        setSaveVocabError("The backend returned an unexpected saved-word response.");
        return;
      }

      const savedForms = new Set(
        [body.surface, body.lemma].filter((form): form is string => form !== null)
          .map((form) => form.toLocaleLowerCase()),
      );
      setRenderedText((current) => {
        if (!current || current.text_id !== text.text_id) {
          return current;
        }

        return {
          ...current,
          sentences: current.sentences.map((sentence) => ({
            ...sentence,
            tokens: sentence.tokens.map((sentenceToken) =>
              savedForms.has(sentenceToken.surface.toLocaleLowerCase())
                ? { ...sentenceToken, state: body.state }
                : sentenceToken,
            ),
          })),
        };
      });
      setSelectedToken((current) =>
        current?.id === token.id ? { ...current, state: body.state } : current,
      );
      if (currentView() === "lexicon") {
        void refreshLexicon();
      }
    } catch (requestError) {
      setSaveVocabError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the vocabulary service.",
      );
    } finally {
      setSavingVocab(false);
    }
  };

  const handleImport = async () => {
    setReaderRequestId(readerRequestId() + 1);
    setLookupRequestId(lookupRequestId() + 1);
    setImporting(true);
    setError(null);
    setResult(null);
    setRenderedText(null);
    setReaderError(null);
    closeLookup();

    try {
      const response = await fetch("/api/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title(),
          language: language(),
          raw_text: rawText(),
        }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(body) ?? "Text import failed.");
        return;
      }

      if (!isTextImportResult(body)) {
        setError("The backend returned an unexpected import response.");
        return;
      }

      setResult(body);
      setTitle("");
      setRawText("");
      void refreshSavedTexts();
      await openSavedText(body.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the backend.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Lector</h1>
        <p style={styles.subtitle}>Personal Language-Learning Reader</p>
      </header>

      <nav style={styles.navigation} aria-label="Main navigation">
        <A
          style={styles.navButton}
          href="/library"
          aria-current={location.pathname === "/library" ? "page" : undefined}
        >
          Library
        </A>
        <button
          style={styles.navButton}
          type="button"
          onClick={() => navigate("/library")}
        >
          Reader
        </button>
        <button
          style={currentView() === "lexicon" ? styles.navButtonActive : styles.navButton}
          type="button"
          aria-current={currentView() === "lexicon" ? "page" : undefined}
          onClick={() => {
            closeLookup();
            setLexiconActionError(null);
            setCurrentView("lexicon");
            navigate("/lexicon");
          }}
        >
          Lexicon
        </button>
        <button
          style={currentView() === "practice" ? styles.navButtonActive : styles.navButton}
          type="button"
          aria-current={currentView() === "practice" ? "page" : undefined}
          onClick={() => {
            closeLookup();
            setCurrentView("practice");
            navigate("/practice");
            void loadPracticeSession();
          }}
        >
          Practice
        </button>
      </nav>

      <main style={styles.main}>
        <Show when={currentView() === "reader"}>
          <>
        <section style={styles.section} aria-label="Saved texts">
          <h2 style={styles.sectionTitle}>Saved texts</h2>
          <Show when={savedTexts.loading}>
            <p style={styles.description}>Loading saved texts…</p>
          </Show>
          <Show when={savedTexts.error}>
            <p style={styles.error} role="alert">
              {savedTexts.error instanceof Error
                ? savedTexts.error.message
                : "Unable to load saved texts."}
            </p>
          </Show>
          <Show when={!savedTexts.loading && !savedTexts.error}>
            <Show
              when={(savedTexts()?.length ?? 0) > 0}
              fallback={<p style={styles.description}>No saved texts yet.</p>}
            >
              <ul style={styles.textList}>
                <For each={savedTexts() ?? []}>
                  {(savedText) => (
                    <li style={styles.textListItem}>
                      <button
                        style={
                          openingTextId() === savedText.id
                            ? styles.savedTextButtonActive
                            : styles.savedTextButton
                        }
                        type="button"
                        disabled={openingTextId() !== null}
                        onClick={() => void openSavedText(savedText.id)}
                      >
                        <strong>{savedText.title}</strong>
                        <span style={styles.savedTextLanguage}>
                          {savedText.language}
                        </span>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Import a text</h2>
          <p style={styles.description}>
            Add a text to read and learn from. Your text is saved locally.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleImport();
            }}
          >
            <label style={styles.label} for="title">
              Title
            </label>
            <input
              id="title"
              style={styles.input}
              type="text"
              value={title()}
              onInput={(event) => setTitle(event.currentTarget.value)}
              required
            />

            <label style={styles.label} for="language">
              Language
            </label>
            <input
              id="language"
              style={styles.input}
              type="text"
              value={language()}
              onInput={(event) => setLanguage(event.currentTarget.value)}
              placeholder="For example, Spanish"
              required
            />

            <label style={styles.label} for="raw-text">
              Text
            </label>
            <textarea
              id="raw-text"
              style={styles.textarea}
              value={rawText()}
              onInput={(event) => setRawText(event.currentTarget.value)}
              placeholder="Paste your text here..."
              rows={12}
              required
            />

            <button style={styles.button} type="submit" disabled={importing()}>
              {importing() ? "Importing..." : "Import text"}
            </button>
          </form>

          <Show when={error()}>
            <div style={styles.error} role="alert">
              {error()}
            </div>
          </Show>

          <Show when={readerError()}>
            <div style={styles.error} role="alert">
              {readerError()}
            </div>
          </Show>

          <Show when={openingTextId() !== null}>
            <p style={styles.description}>Opening saved text…</p>
          </Show>

          <Show when={result()}>
            <div style={styles.success} role="status">
              <h3 style={styles.resultTitle}>Text saved</h3>
              <p>Text ID: {result()?.id}</p>
              <p>Sentences: {result()?.sentence_count}</p>
              <p>Approximate tokens: {result()?.approximate_token_count}</p>
            </div>
          </Show>

          <Show when={renderedText()}>
            {(text) => (
              <section style={styles.reader} aria-label="Imported text">
                <h2 style={styles.sectionTitle}>{text().title}</h2>
                <p style={styles.readerLanguage}>{text().language}</p>
                <For each={text().sentences}>
                  {(sentence) => (
                    <p style={styles.sentence}>
                      <For each={sentence.tokens}>
                        {(token) => {
                          const annotation = () =>
                            getAnnotationForToken(
                              readerAnnotations(),
                              sentence,
                              token,
                            );
                          return (
                            <>
                              <span
                                class={`reader-token reader-token--${token.state}${selectedToken()?.id === token.id ? " reader-token--selected" : ""}${isInAnnotationSelection(token) ? " reader-token--range-selected" : ""}${annotation() ? ` reader-token--annotation-${annotation()?.category}` : ""}`}
                                title={annotation()?.note ?? annotation()?.category}
                                role="button"
                                tabIndex={0}
                                onClick={(event) =>
                                  void handleTokenClick(
                                    token,
                                    sentence,
                                    text(),
                                    event.shiftKey,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    void handleTokenClick(token, sentence, text());
                                  }
                                }}
                              >
                                {token.surface}
                              </span>
                              {token.whitespace_after}
                            </>
                          );
                        }}
                      </For>
                    </p>
                  )}
                </For>
                <Show when={hasAnnotationSelection()}>
                  <section
                    style={styles.annotationPanel}
                    aria-label="Save text annotation"
                  >
                    <h3 style={styles.annotationTitle}>Annotate selected text</h3>
                    <label style={styles.label} for="annotation-category">
                      Category
                    </label>
                    <select
                      id="annotation-category"
                      style={styles.input}
                      value={annotationCategory()}
                      onChange={(event) => {
                        const category = event.currentTarget.value;
                        if (isAnnotationCategory(category)) {
                          setAnnotationCategory(category);
                        }
                      }}
                    >
                      <option value="lexical">Lexical</option>
                      <option value="syntactic">Syntactic</option>
                      <option value="pragmatic">Pragmatic</option>
                      <option value="metaphor">Metaphor</option>
                      <option value="discourse">Discourse</option>
                    </select>
                    <label style={styles.label} for="annotation-note">
                      Note (optional)
                    </label>
                    <textarea
                      id="annotation-note"
                      style={styles.textarea}
                      value={annotationNote()}
                      onInput={(event) => setAnnotationNote(event.currentTarget.value)}
                      rows={3}
                    />
                    <div style={styles.annotationActions}>
                      <button
                        style={styles.button}
                        type="button"
                        disabled={annotationSaving()}
                        onClick={() => void saveAnnotation()}
                      >
                        {annotationSaving() ? "Saving…" : "Save annotation"}
                      </button>
                      <button
                        style={styles.filterButton}
                        type="button"
                        disabled={annotationSaving()}
                        onClick={cancelAnnotation}
                      >
                        Cancel
                      </button>
                    </div>
                    <Show when={annotationError()}>
                      <p style={styles.error} role="alert">
                        {annotationError()}
                      </p>
                    </Show>
                  </section>
                </Show>
                <Show when={readerAnnotations().length > 0}>
                  <section aria-label="Saved annotations">
                    <h3 style={styles.annotationTitle}>Saved annotations</h3>
                    <ul style={styles.annotationList}>
                      <For each={readerAnnotations()}>
                        {(annotation) => (
                          <li>
                            <strong>{getAnnotationText(annotation, text())}</strong>
                            {" · "}
                            {annotation.category}
                            {annotation.note ? ` — ${annotation.note}` : ""}
                          </li>
                        )}
                      </For>
                    </ul>
                  </section>
                </Show>
              </section>
            )}
          </Show>
        </section>
          </>
        </Show>

        <Show when={currentView() === "lexicon"}>
          <section style={styles.section} aria-label="Lexicon">
            <h2 style={styles.sectionTitle}>Lexicon</h2>
            <p style={styles.description}>
              Saved words and multi-word chunks from your imported texts.
            </p>

            <div style={styles.lexiconFilters} aria-label="Filter lexicon by state">
              <button
                style={lexiconFilter() === "all" ? styles.filterButtonActive : styles.filterButton}
                type="button"
                aria-pressed={lexiconFilter() === "all"}
                onClick={() => setLexiconFilter("all")}
              >
                All
              </button>
              <button
                style={lexiconFilter() === "new" ? styles.filterButtonActive : styles.filterButton}
                type="button"
                aria-pressed={lexiconFilter() === "new"}
                onClick={() => setLexiconFilter("new")}
              >
                New
              </button>
              <button
                style={lexiconFilter() === "learning" ? styles.filterButtonActive : styles.filterButton}
                type="button"
                aria-pressed={lexiconFilter() === "learning"}
                onClick={() => setLexiconFilter("learning")}
              >
                Learning
              </button>
              <button
                style={lexiconFilter() === "known" ? styles.filterButtonActive : styles.filterButton}
                type="button"
                aria-pressed={lexiconFilter() === "known"}
                onClick={() => setLexiconFilter("known")}
              >
                Known
              </button>
            </div>

            <label style={styles.label} for="lexicon-search">
              Search Lexicon
            </label>
            <input
              id="lexicon-search"
              style={styles.input}
              type="search"
              value={lexiconSearch()}
              onInput={(event) => setLexiconSearch(event.currentTarget.value)}
              placeholder="Search words and chunks..."
            />

            <Show when={lexiconItems.loading}>
              <p style={styles.description}>Loading lexicon…</p>
            </Show>
            <Show when={lexiconItems.error}>
              <p style={styles.error} role="alert">
                {lexiconItems.error instanceof Error
                  ? lexiconItems.error.message
                  : "Unable to load the lexicon."}
              </p>
            </Show>
            <Show when={lexiconActionError()}>
              <p style={styles.error} role="alert">{lexiconActionError()}</p>
            </Show>
            <Show when={!lexiconItems.loading && !lexiconItems.error}>
              <Show
                when={(lexiconItems()?.length ?? 0) > 0}
                fallback={<p style={styles.description}>No matching saved words.</p>}
              >
                <div style={styles.tableWrapper}>
                  <table style={styles.lexiconTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableCell}>Word</th>
                        <th style={styles.tableCell}>Translation</th>
                        <th style={styles.tableCell}>State</th>
                        <th style={styles.tableCell}>Exposure count</th>
                        <th style={styles.tableCell}>Next Review</th>
                        <th style={styles.tableCell}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={lexiconItems() ?? []}>
                        {(item) => (
                          <tr>
                            <td style={styles.tableCell}>
                              <strong>{item.lemma}</strong>
                              <div style={styles.surfaceExample}>
                                Example form: {item.surface_example}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              {item.translation ?? "—"}
                            </td>
                            <td style={styles.tableCell}>
                              <span class={`lexicon-state lexicon-state--${item.state}`}>
                                {item.state}
                              </span>
                            </td>
                            <td style={styles.tableCell}>{item.exposure_count}</td>
                            <td style={styles.tableCell}>
                              {item.state === "known" ? (
                                <span
                                  aria-label="Known; no review due"
                                  title="Known; no review due"
                                >
                                  ✓
                                </span>
                              ) : (
                                formatNextReview(item.next_review)
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              <label style={styles.visuallyHidden} for={`state-${item.vocab_item_id}`}>
                                State for {item.lemma}
                              </label>
                              <select
                                id={`state-${item.vocab_item_id}`}
                                style={styles.stateSelect}
                                value={item.state}
                                onChange={(event) => {
                                  const state = event.currentTarget.value;
                                  if (isLexiconState(state)) {
                                    setLexiconActionError(null);
                                    void changeLexiconState(item, state);
                                  }
                                }}
                              >
                                <option value="new">New</option>
                                <option value="learning">Learning</option>
                                <option value="known">Known</option>
                              </select>
                              <button
                                style={styles.deleteButton}
                                type="button"
                                onClick={() => {
                                  setLexiconActionError(null);
                                  void deleteLexiconItem(item);
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </Show>
            <section style={styles.savedChunksSection} aria-label="Saved chunks">
              <h3 style={styles.sectionTitle}>Saved chunks</h3>
              <p style={styles.description}>
                Multi-word expressions keep their original sentence and can be reviewed in cloze practice.
              </p>
              <Show when={savedChunks.loading}>
                <p style={styles.description}>Loading saved chunks…</p>
              </Show>
              <Show when={savedChunks.error}>
                <p style={styles.error} role="alert">
                  {savedChunks.error instanceof Error
                    ? savedChunks.error.message
                    : "Unable to load saved chunks."}
                </p>
              </Show>
              <Show when={!savedChunks.loading && !savedChunks.error}>
                <Show
                  when={visibleSavedChunks().length > 0}
                  fallback={<p style={styles.description}>No matching saved chunks.</p>}
                >
                  <ul style={styles.savedChunkList}>
                    <For each={visibleSavedChunks()}>
                      {(chunk) => (
                        <li style={styles.savedChunkItem}>
                          <div>
                            <strong>{chunk.phrase}</strong>
                            <p style={styles.surfaceExample}>
                              {chunk.source_sentence}
                            </p>
                            <p style={styles.surfaceExample}>
                              {chunk.text_title} · {chunk.language} ·{" "}
                              {chunk.state === "known"
                                ? "Known"
                                : formatNextReview(chunk.next_review)}
                            </p>
                          </div>
                          <label style={styles.label} for={`chunk-note-${chunk.id}`}>
                            Note (optional)
                          </label>
                          <textarea
                            id={`chunk-note-${chunk.id}`}
                            style={styles.textarea}
                            rows="2"
                            maxLength={2000}
                            value={savedChunkNotes()[chunk.id] ?? chunk.note ?? ""}
                            onInput={(event) =>
                              setSavedChunkNotes((current) => ({
                                ...current,
                                [chunk.id]: event.currentTarget.value,
                              }))
                            }
                          />
                          <div style={styles.annotationActions}>
                            <button
                              style={styles.deleteButton}
                              type="button"
                              onClick={() => {
                                setLexiconActionError(null);
                                void updateSavedChunk(chunk, {
                                  note: savedChunkNotes()[chunk.id] ?? chunk.note ?? "",
                                });
                              }}
                            >
                              Save note
                            </button>
                            <label
                              style={styles.visuallyHidden}
                              for={`chunk-state-${chunk.id}`}
                            >
                              State for {chunk.phrase}
                            </label>
                            <select
                              id={`chunk-state-${chunk.id}`}
                              style={styles.stateSelect}
                              value={chunk.state}
                              onChange={(event) => {
                                const state = event.currentTarget.value;
                                if (isLexiconState(state)) {
                                  setLexiconActionError(null);
                                  void updateSavedChunk(chunk, { state });
                                }
                              }}
                            >
                              <option value="new">New</option>
                              <option value="learning">Learning</option>
                              <option value="known">Known</option>
                            </select>
                            <button
                              style={styles.deleteButton}
                              type="button"
                              onClick={() => {
                                setLexiconActionError(null);
                                void deleteSavedChunk(chunk);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Show>
            </section>
          </section>
        </Show>

        <Show when={currentView() === "practice"}>
          <section style={styles.section} aria-label="Practice">
            <h2 style={styles.sectionTitle}>Cloze practice</h2>
            <p style={styles.description}>
            Recall a saved word or chunk in the sentence where you encountered it.
            </p>

            <Show when={practiceLoading()}>
              <p style={styles.description}>Preparing a short practice session…</p>
            </Show>
            <Show when={practiceError()}>
              <p style={styles.error} role="alert">{practiceError()}</p>
            </Show>
            <Show when={!practiceLoading() && !practiceError()}>
              <Show
                when={practiceCards().length > 0}
                fallback={
                  <p style={styles.description}>
                    No learning words or chunks with sentence context yet. Save one from the Reader to practice it here.
                  </p>
                }
              >
                <Show
                  when={practiceIndex() < practiceCards().length}
                  fallback={
                    <div style={styles.practiceSummary} role="status">
                      <h3 style={styles.practiceTitle}>Session complete</h3>
                      <p>
                        You answered {practiceCorrect()} of {practiceReviewed()} correctly.
                      </p>
                      <p>
                        {practiceCorrect() === practiceReviewed()
                          ? "Nice work recalling each word in context."
                          : "Good practice. These words will be ready to revisit."}
                      </p>
                      <button
                        style={styles.button}
                        type="button"
                        onClick={() => void loadPracticeSession()}
                      >
                        Practice again
                      </button>
                    </div>
                  }
                >
                  <div style={styles.practiceCard}>
                    <p style={styles.practiceProgress}>
                      {practiceCards()[practiceIndex()]?.item_type === "chunk"
                        ? "Chunk"
                        : "Word"}{" "}
                      · Card {practiceIndex() + 1} of {practiceCards().length}
                    </p>
                    <p style={styles.clozeSentence}>
                      {practiceCards()[practiceIndex()]?.sentence}
                    </p>
                    <Show when={practiceCards()[practiceIndex()]?.hint}>
                      <p style={styles.practiceHint}>
                        Hint: {practiceCards()[practiceIndex()]?.hint}
                      </p>
                    </Show>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void checkPracticeAnswer();
                      }}
                    >
                      <label style={styles.label} for="practice-answer">
                        Your answer
                      </label>
                      <input
                        id="practice-answer"
                        style={styles.input}
                        type="text"
                        value={practiceAnswer()}
                        onInput={(event) =>
                          setPracticeAnswer(event.currentTarget.value)
                        }
                        disabled={practiceChecked() || practiceSubmitting()}
                        autocomplete="off"
                        required
                      />
                      <Show
                        when={!practiceChecked()}
                        fallback={
                          <div style={styles.practiceFeedback} role="status">
                            <p>
                              {practiceAnswerCorrect()
                                ? "Correct — you recalled the word in context."
                                : "Not quite, but this is useful practice."}
                            </p>
                            <p>
                              Answer: <strong>{practiceCards()[practiceIndex()]?.answer}</strong>
                            </p>
                            <button
                              style={styles.button}
                              type="button"
                              onClick={nextPracticeCard}
                            >
                              Next
                            </button>
                          </div>
                        }
                      >
                        <button
                          style={styles.button}
                          type="submit"
                          disabled={!practiceAnswer().trim() || practiceSubmitting()}
                        >
                          {practiceSubmitting() ? "Checking…" : "Check"}
                        </button>
                      </Show>
                    </form>
                    <Show when={practiceReviewError()}>
                      <p style={styles.practiceFeedback} role="alert">
                        {practiceReviewError()}
                      </p>
                    </Show>
                  </div>
                </Show>
              </Show>
            </Show>
          </section>
        </Show>
      </main>

      <Show when={currentView() === "reader" && selectedToken()}>
        {(token) => (
          <aside style={styles.tokenPopup} role="status" aria-live="polite">
            <div style={styles.lookupContent}>
              <strong>{token().surface}</strong>
              <Show when={lookupLoading()}>
                <p>Looking up…</p>
              </Show>
              <Show when={lookupError()}>
                <p style={styles.lookupError} role="alert">
                  {lookupError()}
                </p>
              </Show>
              <Show when={lookupResult()}>
                {(lookup) => (
                  <div style={styles.lookupDetails}>
                    <p><strong>Lemma:</strong> {lookup().lemma ?? "—"}</p>
                    <p><strong>Translation:</strong> {lookup().translation ?? "—"}</p>
                    <p><strong>Definition:</strong> {lookup().target_definition ?? "—"}</p>
                    <p><strong>Example:</strong> {lookup().example ?? "—"}</p>
                    <p><strong>Grammar:</strong> {lookup().grammar_note ?? "—"}</p>
                    <p><strong>Pragmatics:</strong> {lookup().pragmatics_note ?? "—"}</p>
                    <p>
                      <strong>Confidence:</strong> {lookup().confidence}
                      {lookup().uncertain ? " (uncertain)" : ""}
                    </p>
                  </div>
                )}
              </Show>
              <Show when={token().state !== "new"}>
                <p style={styles.savedWordState}>
                  Saved · {token().state}
                </p>
              </Show>
              <Show when={token().state === "new"}>
                <button
                  style={styles.saveWordButton}
                  type="button"
                  disabled={savingVocab()}
                  onClick={() => void saveSelectedToken()}
                >
                  {savingVocab() ? "Saving..." : "Save word"}
                </button>
              </Show>
              <Show when={saveVocabError()}>
                <p style={styles.lookupError} role="alert">
                  {saveVocabError()}
                </p>
              </Show>
            </div>
            <button
              style={styles.closePopup}
              type="button"
              aria-label="Close selected word"
              onClick={closeLookup}
            >
              ×
            </button>
          </aside>
        )}
      </Show>

      <footer style={styles.footer}>
        <p>Lector — Local-first language learning</p>
      </footer>
    </div>
  );
}

const styles: Record<string, JSX.CSSProperties> = {
  container: {
    "font-family": "system-ui, -apple-system, sans-serif",
    "max-width": "800px",
    margin: "0 auto",
    padding: "2rem 1rem",
    "min-height": "100vh",
    display: "flex",
    "flex-direction": "column",
  },
  header: {
    "text-align": "center",
    "margin-bottom": "2rem",
    "padding-bottom": "1rem",
    "border-bottom": "1px solid #e0e0e0",
  },
  navigation: {
    display: "flex",
    "justify-content": "center",
    gap: "0.5rem",
    "margin-bottom": "1.5rem",
  },
  navButton: {
    padding: "0.6rem 1rem",
    color: "#334155",
    "background-color": "#f8fafc",
    border: "1px solid #cbd5e1",
    "border-radius": "4px",
    cursor: "pointer",
  },
  navButtonActive: {
    padding: "0.6rem 1rem",
    color: "white",
    "background-color": "#2563eb",
    border: "1px solid #2563eb",
    "border-radius": "4px",
    cursor: "pointer",
  },
  title: {
    margin: 0,
    "font-size": "2.5rem",
    "font-weight": 600,
    color: "#1a1a2e",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    color: "#666",
    "font-size": "1.1rem",
  },
  main: {
    flex: 1,
  },
  section: {
    "margin-bottom": "2rem",
  },
  textList: {
    margin: 0,
    padding: 0,
    "list-style": "none",
    display: "grid",
    gap: "0.5rem",
  },
  textListItem: {
    margin: 0,
  },
  savedTextButton: {
    width: "100%",
    display: "flex",
    "justify-content": "space-between",
    "align-items": "center",
    gap: "1rem",
    padding: "0.75rem",
    color: "#1f2937",
    "text-align": "left",
    "background-color": "#f8fafc",
    border: "1px solid #e2e8f0",
    "border-radius": "4px",
    cursor: "pointer",
  },
  savedTextButtonActive: {
    width: "100%",
    display: "flex",
    "justify-content": "space-between",
    "align-items": "center",
    gap: "1rem",
    padding: "0.75rem",
    color: "#1d4ed8",
    "text-align": "left",
    "background-color": "#dbeafe",
    border: "1px solid #93c5fd",
    "border-radius": "4px",
    cursor: "pointer",
  },
  savedTextLanguage: {
    color: "#64748b",
    "font-size": "0.9rem",
  },
  sectionTitle: {
    "margin-top": 0,
    "margin-bottom": "0.5rem",
    "font-size": "1.3rem",
    color: "#333",
  },
  lexiconFilters: {
    display: "flex",
    gap: "0.5rem",
    "flex-wrap": "wrap",
    "margin-bottom": "1rem",
  },
  filterButton: {
    padding: "0.5rem 0.75rem",
    color: "#334155",
    "background-color": "#f8fafc",
    border: "1px solid #cbd5e1",
    "border-radius": "4px",
    cursor: "pointer",
  },
  filterButtonActive: {
    padding: "0.5rem 0.75rem",
    color: "white",
    "background-color": "#475569",
    border: "1px solid #475569",
    "border-radius": "4px",
    cursor: "pointer",
  },
  tableWrapper: {
    "overflow-x": "auto",
  },
  lexiconTable: {
    width: "100%",
    "border-collapse": "collapse",
    "text-align": "left",
  },
  savedChunksSection: {
    "margin-top": "2rem",
    "padding-top": "1rem",
    "border-top": "1px solid #e2e8f0",
  },
  savedChunkList: {
    margin: 0,
    padding: 0,
    "list-style": "none",
    display: "grid",
    gap: "1rem",
  },
  savedChunkItem: {
    display: "grid",
    gap: "0.5rem",
    padding: "1rem",
    border: "1px solid #e2e8f0",
    "border-radius": "6px",
    "background-color": "#fbfdff",
  },
  tableCell: {
    padding: "0.75rem",
    "border-bottom": "1px solid #e2e8f0",
    "vertical-align": "top",
  },
  surfaceExample: {
    color: "#64748b",
    "font-size": "0.85rem",
    "margin-top": "0.25rem",
  },
  stateSelect: {
    padding: "0.45rem",
    "margin-right": "0.5rem",
    "margin-bottom": "0.25rem",
    "border-radius": "4px",
    border: "1px solid #cbd5e1",
  },
  deleteButton: {
    padding: "0.45rem 0.6rem",
    color: "#334155",
    "background-color": "white",
    border: "1px solid #cbd5e1",
    "border-radius": "4px",
    cursor: "pointer",
  },
  visuallyHidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    "white-space": "nowrap",
    border: 0,
  },
  description: {
    "margin-bottom": "1rem",
    color: "#666",
    "line-height": 1.5,
  },
  label: {
    display: "block",
    "margin-bottom": "0.4rem",
    "font-weight": 600,
    color: "#333",
  },
  input: {
    width: "100%",
    "box-sizing": "border-box",
    padding: "0.65rem",
    "margin-bottom": "1rem",
    "font-size": "1rem",
    border: "1px solid #ddd",
    "border-radius": "4px",
  },
  textarea: {
    width: "100%",
    "box-sizing": "border-box",
    padding: "0.75rem",
    "margin-bottom": "1rem",
    "font-size": "1rem",
    "font-family": "inherit",
    border: "1px solid #ddd",
    "border-radius": "4px",
    resize: "vertical",
  },
  button: {
    padding: "0.75rem 1.5rem",
    "font-size": "1rem",
    "font-weight": 500,
    color: "white",
    "background-color": "#2563eb",
    border: "none",
    "border-radius": "4px",
    cursor: "pointer",
  },
  error: {
    "margin-top": "1rem",
    padding: "0.75rem 1rem",
    color: "#721c24",
    "background-color": "#f8d7da",
    border: "1px solid #f5c6cb",
    "border-radius": "4px",
  },
  success: {
    "margin-top": "1rem",
    padding: "0.75rem 1rem",
    color: "#155724",
    "background-color": "#d4edda",
    border: "1px solid #c3e6cb",
    "border-radius": "4px",
  },
  resultTitle: {
    "margin-top": 0,
  },
  practiceCard: {
    "margin-top": "1.5rem",
    padding: "1.25rem",
    border: "1px solid #dbe3ec",
    "border-radius": "6px",
    "background-color": "#fbfdff",
  },
  practiceProgress: {
    color: "#64748b",
    "font-size": "0.9rem",
    "margin-top": 0,
  },
  clozeSentence: {
    "font-size": "1.25rem",
    "line-height": 1.8,
  },
  practiceHint: {
    color: "#475569",
    "font-size": "0.95rem",
  },
  practiceFeedback: {
    "margin-top": "1rem",
    padding: "0.75rem",
    color: "#334155",
    "background-color": "#f1f5f9",
    border: "1px solid #cbd5e1",
    "border-radius": "4px",
  },
  practiceSummary: {
    "margin-top": "1.5rem",
    padding: "1.25rem",
    color: "#334155",
    "background-color": "#f1f5f9",
    border: "1px solid #cbd5e1",
    "border-radius": "6px",
  },
  practiceTitle: {
    "margin-top": 0,
  },
  annotationPanel: {
    "margin-top": "1rem",
    padding: "1rem",
    border: "1px solid #cbd5e1",
    "border-radius": "6px",
    "background-color": "#f8fafc",
  },
  annotationTitle: {
    "margin-top": 0,
    "font-size": "1.05rem",
  },
  annotationActions: {
    display: "flex",
    gap: "0.5rem",
    "align-items": "center",
    "flex-wrap": "wrap",
  },
  annotationList: {
    "padding-left": "1.25rem",
    color: "#334155",
    "line-height": 1.6,
  },
  reader: {
    "margin-top": "2rem",
    padding: "1rem",
    border: "1px solid #e0e0e0",
    "border-radius": "4px",
    "line-height": 1.8,
  },
  readerLanguage: {
    "margin-top": "-0.5rem",
    color: "#666",
    "font-size": "0.9rem",
  },
  sentence: {
    "margin-bottom": "1rem",
  },
  saveWordButton: {
    padding: "0.4rem 0.65rem",
    color: "#1f2937",
    "background-color": "white",
    border: "none",
    "border-radius": "4px",
    cursor: "pointer",
  },
  savedWordState: {
    color: "#bfdbfe",
    "font-size": "0.875rem",
  },
  tokenPopup: {
    position: "fixed",
    right: "1rem",
    bottom: "1rem",
    display: "flex",
    "align-items": "flex-start",
    gap: "1rem",
    padding: "0.75rem 1rem",
    color: "white",
    "background-color": "#1f2937",
    "border-radius": "6px",
    "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.2)",
    "z-index": 10,
    "max-width": "min(28rem, calc(100vw - 2rem))",
  },
  lookupContent: {
    "min-width": 0,
  },
  lookupDetails: {
    "font-size": "0.875rem",
    "line-height": 1.4,
  },
  lookupError: {
    color: "#fecaca",
  },
  closePopup: {
    padding: 0,
    color: "white",
    "background-color": "transparent",
    border: "none",
    "font-size": "1.25rem",
    cursor: "pointer",
  },
  footer: {
    "text-align": "center",
    "padding-top": "2rem",
    "border-top": "1px solid #e0e0e0",
    color: "#999",
    "font-size": "0.875rem",
  },
};

export default App;
