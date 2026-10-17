import { useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { ColumnParagraph } from "../components/ReaderColumn";
import ReaderColumn from "../components/ReaderColumn";
import AppShell from "../components/AppShell";
import HoverTooltip from "../components/HoverTooltip";
import type {
  AnnotationCategory,
  ReaderToken,
} from "../components/TokenSpan";
import WordDetailPanel from "../components/WordDetailPanel";
import type { WordLookup } from "../components/WordDetailPanel";

type ReaderSentence = {
  id: number;
  position: number;
  paragraph_index: number;
  content: string;
  tokens: ReaderToken[];
};

type ReaderText = {
  text_id: number;
  title: string;
  language: string;
  created_at: string;
  sentence_count: number;
  token_count: number;
  sentences: ReaderSentence[];
};

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

type ReaderData = {
  text: ReaderText;
  annotations: ReaderAnnotation[];
};

type SelectedToken = ReaderToken & { column: 1 | 2 | 3 };

type HoveredToken = {
  token: ReaderToken;
  x: number;
  y: number;
};

function isCategory(value: unknown): value is AnnotationCategory {
  return (
    value === "lexical" ||
    value === "syntactic" ||
    value === "pragmatic" ||
    value === "metaphor" ||
    value === "discourse"
  );
}

function isToken(value: unknown): value is ReaderToken {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "surface" in value &&
    typeof value.surface === "string" &&
    "lemma" in value &&
    (typeof value.lemma === "string" || value.lemma === null) &&
    "pos" in value &&
    (typeof value.pos === "string" || value.pos === null) &&
    "translation" in value &&
    (typeof value.translation === "string" || value.translation === null) &&
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

function isReaderText(value: unknown): value is ReaderText {
  return (
    typeof value === "object" &&
    value !== null &&
    "text_id" in value &&
    typeof value.text_id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "language" in value &&
    typeof value.language === "string" &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "sentence_count" in value &&
    typeof value.sentence_count === "number" &&
    "token_count" in value &&
    typeof value.token_count === "number" &&
    "sentences" in value &&
    Array.isArray(value.sentences) &&
    value.sentences.every(
      (sentence) =>
        typeof sentence === "object" &&
        sentence !== null &&
        "id" in sentence &&
        typeof sentence.id === "number" &&
        "position" in sentence &&
        typeof sentence.position === "number" &&
        "paragraph_index" in sentence &&
        typeof sentence.paragraph_index === "number" &&
        "content" in sentence &&
        typeof sentence.content === "string" &&
        "tokens" in sentence &&
        Array.isArray(sentence.tokens) &&
        sentence.tokens.every(isToken),
    )
  );
}

function isAnnotation(value: unknown): value is ReaderAnnotation {
  return (
    typeof value === "object" &&
    value !== null &&
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
    isCategory(value.category) &&
    "note" in value &&
    (typeof value.note === "string" || value.note === null) &&
    "created_at" in value &&
    typeof value.created_at === "string"
  );
}

function errorDetail(value: unknown): string | null {
  return typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    typeof value.detail === "string"
    ? value.detail
    : null;
}

type ReaderLayout = {
  columnWidth: number;
  maxLines: number;
  font: string;
};

function buildPages(
  sentences: ReaderSentence[],
  layout: ReaderLayout,
): ColumnParagraph[][][] {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = layout.font;
  }
  const measure = (value: string) =>
    context
      ? context.measureText(value).width
      : value.length * layout.columnWidth * 0.015;
  const pages: ColumnParagraph[][][] = [];
  let sentenceIndex = 0;
  let tokenIndex = 0;

  const remainingLineEstimate = () => {
    let lines = 1;
    let lineWidth = 0;
    let previousParagraph: number | null = null;
    for (let index = sentenceIndex; index < sentences.length; index += 1) {
      const sentence = sentences[index];
      const firstToken = index === sentenceIndex ? tokenIndex : 0;
      for (const token of sentence.tokens.slice(firstToken)) {
        if (previousParagraph !== null && sentence.paragraph_index !== previousParagraph) {
          lines += 0.55;
          lineWidth = 0;
        }
        const tokenWidth = measure(token.surface);
        if (lineWidth > 0 && lineWidth + tokenWidth > layout.columnWidth) {
          lines += 1;
          lineWidth = 0;
        }
        const wrappedLines = Math.max(
          1,
          Math.ceil(tokenWidth / layout.columnWidth),
        );
        lines += wrappedLines - 1;
        if (tokenWidth >= layout.columnWidth) {
          lineWidth =
            tokenWidth % layout.columnWidth || layout.columnWidth;
        } else {
          lineWidth += tokenWidth;
        }
        const whitespaceWidth = measure(token.whitespace_after);
        if (lineWidth + whitespaceWidth <= layout.columnWidth) {
          lineWidth += whitespaceWidth;
        }
        previousParagraph = sentence.paragraph_index;
      }
    }
    return lines;
  };

  while (sentenceIndex < sentences.length) {
    const pageColumns: ColumnParagraph[][] = [[], [], []];
    let estimatedRemainingLines = remainingLineEstimate();

    for (let columnIndex = 0; columnIndex < pageColumns.length; columnIndex += 1) {
      const columnsLeft = pageColumns.length - columnIndex;
      const targetLines = Math.min(
        layout.maxLines,
        Math.max(1, Math.ceil(estimatedRemainingLines / columnsLeft)),
      );
      const paragraphs = pageColumns[columnIndex];
      let lines = 1;
      let lineWidth = 0;
      let previousParagraph: number | null = null;
      let tokenCount = 0;

      while (sentenceIndex < sentences.length) {
        const sentence = sentences[sentenceIndex];
        const token = sentence.tokens[tokenIndex];
        if (!token) {
          sentenceIndex += 1;
          tokenIndex = 0;
          continue;
        }

        const startsParagraph =
          tokenCount > 0 && previousParagraph !== sentence.paragraph_index;
        let candidateLines = lines + (startsParagraph ? 0.55 : 0);
        let candidateWidth = startsParagraph ? 0 : lineWidth;
        const tokenWidth = measure(token.surface);
        if (candidateWidth > 0 && candidateWidth + tokenWidth > layout.columnWidth) {
          candidateLines += 1;
          candidateWidth = 0;
        }
        const wrappedLines = Math.max(
          1,
          Math.ceil(tokenWidth / layout.columnWidth),
        );
        candidateLines += wrappedLines - 1;
        if (tokenWidth >= layout.columnWidth) {
          candidateWidth =
            tokenWidth % layout.columnWidth || layout.columnWidth;
        } else {
          candidateWidth += tokenWidth;
        }
        const whitespaceWidth = measure(token.whitespace_after);
        if (candidateWidth + whitespaceWidth <= layout.columnWidth) {
          candidateWidth += whitespaceWidth;
        }
        if (candidateLines > targetLines && tokenCount > 0) {
          break;
        }

        let paragraph = paragraphs.at(-1);
        if (paragraph?.id !== sentence.paragraph_index) {
          paragraph = { id: sentence.paragraph_index, sentences: [] };
          paragraphs.push(paragraph);
        }
        let columnSentence = paragraph.sentences.at(-1);
        if (columnSentence?.id !== sentence.id) {
          columnSentence = {
            id: sentence.id,
            position: sentence.position,
            paragraphIndex: sentence.paragraph_index,
            tokens: [],
          };
          paragraph.sentences.push(columnSentence);
        }
        columnSentence.tokens.push({ token });
        lines = candidateLines;
        lineWidth = candidateWidth;
        previousParagraph = sentence.paragraph_index;
        tokenCount += 1;
        tokenIndex += 1;
        if (tokenIndex >= sentence.tokens.length) {
          sentenceIndex += 1;
          tokenIndex = 0;
        }
      }
      estimatedRemainingLines = remainingLineEstimate();
    }
    pages.push(pageColumns);
  }
  return pages;
}

function tokenRangeText(start: ReaderToken, end: ReaderToken, text: ReaderText): string {
  const sentence = text.sentences.find((item) => item.id === start.sentence_id);
  if (!sentence) {
    return "";
  }
  const from = Math.min(start.order_index, end.order_index);
  const to = Math.max(start.order_index, end.order_index);
  return sentence.tokens
    .filter((token) => token.order_index >= from && token.order_index <= to)
    .map((token) => token.surface + token.whitespace_after)
    .join("")
    .trim();
}

function getAnnotationCategory(
  annotations: ReaderAnnotation[],
  sentence: ReaderSentence,
  token: ReaderToken,
): AnnotationCategory | undefined {
  const matching = annotations.find((annotation) => {
    if (annotation.sentence_id !== sentence.id) {
      return false;
    }
    const start = sentence.tokens.findIndex(
      (item) => item.id === annotation.start_token_id,
    );
    const end = sentence.tokens.findIndex(
      (item) => item.id === annotation.end_token_id,
    );
    return (
      start >= 0 &&
      end >= start &&
      token.order_index >= sentence.tokens[start].order_index &&
      token.order_index <= sentence.tokens[end].order_index
    );
  });
  return matching?.category;
}

function isLookup(value: unknown): value is WordLookup {
  return (
    typeof value === "object" &&
    value !== null &&
    "surface" in value &&
    typeof value.surface === "string" &&
    "lemma" in value &&
    (typeof value.lemma === "string" || value.lemma === null) &&
    "translation" in value &&
    (typeof value.translation === "string" || value.translation === null) &&
    "target_definition" in value &&
    (typeof value.target_definition === "string" ||
      value.target_definition === null) &&
    "example" in value &&
    (typeof value.example === "string" || value.example === null) &&
    "grammar_note" in value &&
    (typeof value.grammar_note === "string" || value.grammar_note === null) &&
    "pragmatics_note" in value &&
    (typeof value.pragmatics_note === "string" ||
      value.pragmatics_note === null) &&
    "confidence" in value &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low") &&
    "uncertain" in value &&
    typeof value.uncertain === "boolean"
  );
}

function isReaderData(value: unknown): value is ReaderData {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    isReaderText(value.text) &&
    "annotations" in value &&
    Array.isArray(value.annotations) &&
    value.annotations.every(isAnnotation)
  );
}

export default function Reader() {
  const params = useParams<{ textId: string }>();
  const navigate = useNavigate();
  let columnsElement: HTMLDivElement | undefined;
  let layoutObserver: ResizeObserver | undefined;
  const [selectedToken, setSelectedToken] = createSignal<SelectedToken | null>(null);
  const [pageIndex, setPageIndex] = createSignal(0);
  const [layout, setLayout] = createSignal<ReaderLayout>({
    columnWidth: 300,
    maxLines: 14,
    font: "16px system-ui",
  });
  const [hoveredToken, setHoveredToken] = createSignal<HoveredToken | null>(null);
  const [lookup, setLookup] = createSignal<WordLookup | null>(null);
  const [lookupLoading, setLookupLoading] = createSignal(false);
  const [lookupError, setLookupError] = createSignal<string | null>(null);
  const [savingWord, setSavingWord] = createSignal(false);
  const [saveWordError, setSaveWordError] = createSignal<string | null>(null);
  const [wordStates, setWordStates] = createSignal<Record<number, ReaderToken["state"]>>({});
  const [annotationStart, setAnnotationStart] = createSignal<ReaderToken | null>(null);
  const [annotationEnd, setAnnotationEnd] = createSignal<ReaderToken | null>(null);
  const [annotationCategory, setAnnotationCategory] =
    createSignal<AnnotationCategory>("lexical");
  const [annotationNote, setAnnotationNote] = createSignal("");
  const [annotationSaving, setAnnotationSaving] = createSignal(false);
  const [annotationError, setAnnotationError] = createSignal<string | null>(null);
  const [localAnnotations, setLocalAnnotations] = createSignal<ReaderAnnotation[] | null>(
    null,
  );
  const [readerData] = createResource(
    () => params.textId,
    async (textId): Promise<ReaderData> => {
      const [textResponse, annotationResponse] = await Promise.all([
        fetch(`/api/texts/${textId}/render`),
        fetch(`/api/texts/${textId}/annotations`),
      ]);
      const [textBody, annotationBody]: [unknown, unknown] = await Promise.all([
        textResponse.json(),
        annotationResponse.json(),
      ]);
      if (!textResponse.ok) {
        throw new Error(errorDetail(textBody) ?? "Unable to load this text.");
      }
      if (!annotationResponse.ok) {
        throw new Error(
          errorDetail(annotationBody) ?? "Unable to load text annotations.",
        );
      }
      if (
        !isReaderText(textBody) ||
        !Array.isArray(annotationBody) ||
        !annotationBody.every(isAnnotation)
      ) {
        throw new Error("The backend returned an unexpected reader response.");
      }
      return { text: textBody, annotations: annotationBody };
    },
  );
  const text = createMemo(() => readerData()?.text ?? null);
  const annotations = createMemo(
    () => localAnnotations() ?? readerData()?.annotations ?? [],
  );
  const measureReaderLayout = () => {
    const columns = columnsElement?.querySelectorAll<HTMLElement>(".reader-column");
    const content = columnsElement?.querySelector<HTMLElement>(
      ".reader-column__content",
    );
    const column = columns?.[0];
    if (!column || !content) {
      return;
    }
    const columnStyle = window.getComputedStyle(column);
    const contentStyle = window.getComputedStyle(content);
    const paddingX =
      Number.parseFloat(columnStyle.paddingLeft) +
      Number.parseFloat(columnStyle.paddingRight);
    const paddingY =
      Number.parseFloat(columnStyle.paddingTop) +
      Number.parseFloat(columnStyle.paddingBottom);
    const lineHeight = Number.parseFloat(contentStyle.lineHeight);
    setLayout({
      columnWidth: Math.max(100, column.clientWidth - paddingX),
      maxLines: Math.max(
        1,
        Math.floor((column.clientHeight - paddingY) / lineHeight) - 2,
      ),
      font: `${contentStyle.fontSize} ${contentStyle.fontFamily}`,
    });
  };
  const pages = createMemo(() =>
    buildPages(text()?.sentences ?? [], layout()),
  );
  const columns = createMemo(() => {
    const currentText = text();
    if (!currentText) {
      return [[], [], []] as ColumnParagraph[][];
    }
    const assignedColumns = (pages()[pageIndex()] ?? [[], [], []]).map(
      (column) =>
        column.map((paragraph) => ({
          ...paragraph,
          sentences: paragraph.sentences.map((group) => ({
            ...group,
            tokens: group.tokens.map((item) => ({
              ...item,
              token: {
                ...item.token,
                state:
                  wordStates()[item.token.id] ?? item.token.state,
              },
            })),
          })),
        })),
    );
    for (const column of assignedColumns) {
      for (const paragraph of column) {
        for (const group of paragraph.sentences) {
          const sentence = currentText.sentences.find((item) => item.id === group.id);
          if (!sentence) {
            continue;
          }
          for (const item of group.tokens) {
            item.annotationCategory = getAnnotationCategory(
              annotations(),
              sentence,
              item.token,
            );
          }
        }
      }
    }
    return assignedColumns;
  });
  const pageCount = createMemo(() => pages().length);
  createEffect(() => {
    if (params.textId) {
      setPageIndex(0);
    }
  });
  createEffect(() => {
    if (text()) {
      const frame = window.requestAnimationFrame(measureReaderLayout);
      onCleanup(() => window.cancelAnimationFrame(frame));
    }
  });
  createEffect(() => {
    if (pageIndex() >= pageCount()) {
      setPageIndex(Math.max(0, pageCount() - 1));
    }
  });
  const panelColumn = createMemo(() => {
    const column = selectedToken()?.column;
    if (column === 1 || column === 2) {
      return 3;
    }
    return column === 3 ? 1 : null;
  });
  const annotationRange = createMemo(() => {
    const start = annotationStart();
    const end = annotationEnd();
    return start && end ? { start, end } : null;
  });
  const annotationText = createMemo(() => {
    const range = annotationRange();
    const currentText = text();
    return range && currentText
      ? tokenRangeText(range.start, range.end, currentText)
      : "";
  });

  const closePanel = () => {
    setSelectedToken(null);
    setLookup(null);
    setLookupError(null);
    setLookupLoading(false);
    setAnnotationStart(null);
    setAnnotationEnd(null);
    setAnnotationNote("");
    setAnnotationError(null);
  };

  onMount(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    const handleResize = () => {
      window.requestAnimationFrame(measureReaderLayout);
    };
    window.addEventListener("resize", handleResize);
    onCleanup(() => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", handleResize);
      layoutObserver?.disconnect();
    });
  });

  const onHover = (
    token: ReaderToken,
    _column: 1 | 2 | 3,
    x: number,
    y: number,
  ) => setHoveredToken({ token, x, y });

  const onClickToken = async (
    token: ReaderToken,
    column: 1 | 2 | 3,
    shiftKey: boolean,
  ) => {
    if (shiftKey && annotationStart()) {
      const start = annotationStart();
      if (start?.sentence_id !== token.sentence_id) {
        setAnnotationError("Select the end of a highlight in the same sentence.");
        return;
      }
      setAnnotationEnd(token);
      setAnnotationError(null);
      return;
    }
    const selected: SelectedToken = { ...token, column };
    setSelectedToken(selected);
    setAnnotationStart(token);
    setAnnotationEnd(null);
    setAnnotationError(null);
    setLookup(null);
    setLookupError(null);
    setLookupLoading(true);
    try {
      const sentence = text()?.sentences.find(
        (item) => item.id === token.sentence_id,
      );
      if (!sentence || !text()) {
        throw new Error("The selected word is no longer available.");
      }
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: text()!.text_id,
          token_id: token.id,
          surface: token.surface,
          sentence: sentence.content,
          language: text()!.language,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorDetail(body) ?? "Unable to inspect this word.");
      }
      if (!isLookup(body)) {
        throw new Error("The backend returned an unexpected word detail.");
      }
      setLookup(body);
    } catch (requestError) {
      setLookupError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to inspect this word.",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const saveWord = async () => {
    const token = selectedToken();
    const currentText = text();
    if (!token || !currentText || savingWord()) {
      return;
    }
    setSavingWord(true);
    setSaveWordError(null);
    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: currentText.text_id,
          token_id: token.id,
          lemma: lookup()?.lemma ?? token.lemma,
          translation: lookup()?.translation ?? token.translation,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorDetail(body) ?? "Unable to save this word.");
      }
      const savedState =
        typeof body === "object" && body !== null && "state" in body
          ? body.state
          : null;
      if (
        savedState !== "new" &&
        savedState !== "learning" &&
        savedState !== "known"
      ) {
        throw new Error("The backend returned an unexpected saved word.");
      }
      const forms = new Set(
        [token.surface, lookup()?.lemma ?? token.lemma]
          .filter((value): value is string => value !== null)
          .map((value) => value.toLocaleLowerCase()),
      );
      const updates: Record<number, ReaderToken["state"]> = {};
      for (const sentence of currentText.sentences) {
        for (const word of sentence.tokens) {
          if (
            word.sentence_id === token.sentence_id &&
            forms.has((word.lemma ?? word.surface).toLocaleLowerCase())
          ) {
            updates[word.id] = savedState;
          }
        }
      }
      updates[token.id] = savedState;
      setWordStates((current) => ({ ...current, ...updates }));
      setSelectedToken((current) =>
        current?.id === token.id ? { ...current, state: savedState } : current,
      );
    } catch (requestError) {
      setSaveWordError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save this word.",
      );
    } finally {
      setSavingWord(false);
    }
  };

  const saveAnnotation = async () => {
    const currentText = text();
    const range = annotationRange();
    if (!currentText || !range || annotationSaving()) {
      return;
    }
    const first = range.start.order_index <= range.end.order_index
      ? range.start
      : range.end;
    const last = range.start.order_index <= range.end.order_index
      ? range.end
      : range.start;
    setAnnotationSaving(true);
    setAnnotationError(null);
    try {
      const response = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: currentText.text_id,
          sentence_id: first.sentence_id,
          start_token_id: first.id,
          end_token_id: last.id,
          category: annotationCategory(),
          note: annotationNote().trim() || null,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorDetail(body) ?? "Unable to save this annotation.");
      }
      if (!isAnnotation(body)) {
        throw new Error("The backend returned an unexpected annotation response.");
      }
      setLocalAnnotations((current) => [...annotations(), body]);
      setAnnotationStart(null);
      setAnnotationEnd(null);
      setAnnotationNote("");
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

  return (
    <AppShell fullScreen>
      <Show when={readerData.loading}>
        <p class="reader-status">Opening text…</p>
      </Show>
      <Show when={readerData.error}>
        <section class="reader-error" role="alert">
          <p>{readerData.error instanceof Error
            ? readerData.error.message
            : "Unable to open this text."}</p>
          <button class="secondary-button" type="button" onClick={() => void navigate("/library")}>
            Back to Library
          </button>
        </section>
      </Show>
      <Show when={text()}>
        {(currentText) => (
          <section class="reader-page">
            <div class="reader-page__heading">
              <div>
                <h2>{currentText().title}</h2>
                <p>
                  {currentText().language} · {currentText().sentence_count} sentences ·{" "}
                  {currentText().token_count} tokens
                </p>
              </div>
              <button
                class="secondary-button"
                type="button"
                onClick={() => void navigate("/library")}
              >
                Back to Library
              </button>
            </div>
            <div
              class="reader-columns"
              ref={(element) => {
                columnsElement = element;
                layoutObserver = new ResizeObserver(measureReaderLayout);
                layoutObserver.observe(element);
                window.requestAnimationFrame(measureReaderLayout);
              }}
            >
              <For each={[1, 2, 3] as const}>
                {(column) => (
                  <ReaderColumn
                    column={column}
                    paragraphs={columns()[column - 1]}
                    selectedTokenId={selectedToken()?.id ?? null}
                    selectedRange={(token) => {
                      const range = annotationRange();
                      if (!range || token.sentence_id !== range.start.sentence_id) {
                        return false;
                      }
                      const low = Math.min(
                        range.start.order_index,
                        range.end.order_index,
                      );
                      const high = Math.max(
                        range.start.order_index,
                        range.end.order_index,
                      );
                      return token.order_index >= low && token.order_index <= high;
                    }}
                    onHover={onHover}
                    onLeave={() => setHoveredToken(null)}
                    onClick={onClickToken}
                    showPanel={panelColumn() === column && selectedToken() !== null}
                    panel={
                      selectedToken() ? (
                        <WordDetailPanel
                          token={selectedToken()!}
                          lookup={lookup}
                          loading={lookupLoading}
                          error={lookupError}
                          saving={savingWord}
                          saveError={saveWordError}
                          onClose={closePanel}
                          onSaveWord={() => void saveWord()}
                          annotationRange={annotationRange}
                          annotationText={annotationText}
                          category={annotationCategory}
                          note={annotationNote}
                          annotationSaving={annotationSaving}
                          annotationError={annotationError}
                          onCategoryChange={setAnnotationCategory}
                          onNoteChange={setAnnotationNote}
                          onSaveAnnotation={() => void saveAnnotation()}
                          onCancelAnnotation={() => {
                            setAnnotationStart(null);
                            setAnnotationEnd(null);
                            setAnnotationNote("");
                            setAnnotationError(null);
                          }}
                        />
                      ) : null
                    }
                  />
                )}
              </For>
            </div>
            <nav class="reader-pagination" aria-label="Reader pages">
              <button
                class="secondary-button"
                type="button"
                onClick={() => setPageIndex((page) => Math.max(0, page - 1))}
                disabled={pageIndex() === 0}
              >
                Previous page
              </button>
              <span>
                Page {Math.min(pageIndex() + 1, pageCount())} of {pageCount()}
              </span>
              <button
                class="secondary-button"
                type="button"
                onClick={() =>
                  setPageIndex((page) => Math.min(pageCount() - 1, page + 1))
                }
                disabled={pageIndex() >= pageCount() - 1}
              >
                Next page
              </button>
            </nav>
            <Show when={selectedToken() === null ? hoveredToken() : null}>
              {(hover) => (
                <HoverTooltip
                  token={hover().token}
                  x={hover().x}
                  y={hover().y}
                />
              )}
            </Show>
          </section>
        )}
      </Show>
    </AppShell>
  );
}
