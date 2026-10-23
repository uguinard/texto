import { useNavigate, useParams } from "@solidjs/router";
import {
  batch,
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

type SelectionKind = "word" | "range" | "sentence";

type SelectionState = {
  kind: SelectionKind;
  anchorTokenId: number;
  focusTokenId: number;
};

type NormalizedSelection = SelectionState & {
  startTokenId: number;
  endTokenId: number;
  startIndex: number;
  endIndex: number;
  sentenceId: number | null;
  crossesSentence: boolean;
  isSingleToken: boolean;
};

type TokenPosition = {
  pageIndex: number;
  column: 1 | 2 | 3;
  paragraphId: number;
  sentenceId: number;
};

type PointerSelection = {
  pointerId: number;
  anchorTokenId: number;
  hasDragged: boolean;
};

function isWordToken(token: ReaderToken): boolean {
  return /[\p{L}\p{N}]/u.test(token.surface);
}

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
    (!("lexeme_id" in value) ||
      value.lexeme_id === null ||
      typeof value.lexeme_id === "number") &&
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
  let suppressTokenClickUntil = 0;
  let shiftClickAnchorTokenId: number | null = null;
  let lookupRequestId = 0;
  const [selectedToken, setSelectedToken] = createSignal<SelectedToken | null>(null);
  const [lastPanelColumn, setLastPanelColumn] = createSignal<2 | 3>(2);
  const [focusedTokenId, setFocusedTokenId] = createSignal<number | null>(null);
  const [pendingFocusTokenId, setPendingFocusTokenId] = createSignal<number | null>(null);
  const [selection, setSelection] = createSignal<SelectionState | null>(null);
  const [pointerSelection, setPointerSelection] =
    createSignal<PointerSelection | null>(null);
  const [activeSentenceId, setActiveSentenceId] = createSignal<number | null>(null);
  const [selectedSentenceId, setSelectedSentenceId] = createSignal<number | null>(null);
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
  const [savingSelection, setSavingSelection] = createSignal(false);
  const [saveSelectionMessage, setSaveSelectionMessage] =
    createSignal<string | null>(null);
  const [saveSelectionError, setSaveSelectionError] =
    createSignal<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = createSignal(false);
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
  const orderedTokens = createMemo(
    () => text()?.sentences.flatMap((sentence) => sentence.tokens) ?? [],
  );
  const orderedWords = createMemo(() =>
    orderedTokens().filter(isWordToken),
  );
  const tokenById = createMemo(
    () => new Map(orderedTokens().map((token) => [token.id, token])),
  );
  const tokenPositionMap = createMemo(() => {
    const positions = new Map<number, TokenPosition>();
    pages().forEach((page, pageIndex) => {
      page.forEach((column, columnIndex) => {
        const columnNumber = (columnIndex + 1) as 1 | 2 | 3;
        column.forEach((paragraph) => {
          paragraph.sentences.forEach((sentence) => {
            sentence.tokens.forEach(({ token }) => {
              positions.set(token.id, {
                pageIndex,
                column: columnNumber,
                paragraphId: paragraph.id,
                sentenceId: sentence.id,
              });
            });
          });
        });
      });
    });
    return positions;
  });
  const normalizedSelection = createMemo<NormalizedSelection | null>(() => {
    const currentSelection = selection();
    if (!currentSelection) {
      return null;
    }
    const tokens = orderedTokens();
    const anchorIndex = tokens.findIndex(
      (token) => token.id === currentSelection.anchorTokenId,
    );
    const focusIndex = tokens.findIndex(
      (token) => token.id === currentSelection.focusTokenId,
    );
    if (anchorIndex < 0 || focusIndex < 0) {
      return null;
    }
    const startIndex = Math.min(anchorIndex, focusIndex);
    const endIndex = Math.max(anchorIndex, focusIndex);
    const startToken = tokens[startIndex];
    const endToken = tokens[endIndex];
    return {
      ...currentSelection,
      startTokenId: startToken.id,
      endTokenId: endToken.id,
      startIndex,
      endIndex,
      sentenceId:
        startToken.sentence_id === endToken.sentence_id
          ? startToken.sentence_id
          : null,
      crossesSentence: startToken.sentence_id !== endToken.sentence_id,
      isSingleToken: startToken.id === endToken.id,
    };
  });
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
  createEffect(() => {
    const tokenId = pendingFocusTokenId();
    if (tokenId === null) {
      return;
    }
    columns();
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const element = columnsElement?.querySelector<HTMLSpanElement>(
          `.reader-token[data-token-id="${tokenId}"]`,
        );
        if (element) {
          element.focus();
          setFocusedTokenId(tokenId);
          setPendingFocusTokenId(null);
        }
      });
    });
    onCleanup(() => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    });
  });
  createEffect(() => {
    columns();
    pageIndex();
    layout();
    const frame = window.requestAnimationFrame(() => {
      const columnElements =
        columnsElement?.querySelectorAll<HTMLElement>("[data-reader-column]") ??
        [];
      columnElements.forEach((columnElement) => {
        const tokenElements = Array.from(
          columnElement.querySelectorAll<HTMLSpanElement>(
            ".reader-token[data-token-id]",
          ),
        );
        let line = 0;
        let lastTop: number | null = null;
        for (const tokenElement of tokenElements) {
          const top = tokenElement.getBoundingClientRect().top;
          if (lastTop !== null && Math.abs(top - lastTop) > 2) {
            line += 1;
          }
          tokenElement.dataset.line = String(line);
          lastTop = top;
        }
      });
    });
    onCleanup(() => window.cancelAnimationFrame(frame));
  });
  const panelColumn = createMemo(() => {
    const column = selectedToken()?.column;
    if (column === 1 || column === 3) {
      return 2;
    }
    return column === 2 ? 3 : lastPanelColumn();
  });
  const annotationRange = createMemo(() => {
    const start = annotationStart();
    const end = annotationEnd();
    return start && end ? { start, end } : null;
  });
  const selectionEndpoints = createMemo(() => {
    const normalized = normalizedSelection();
    if (normalized) {
      return {
        start: normalized.startTokenId,
        end: normalized.endTokenId,
      };
    }
    const annotation = annotationRange();
    return annotation
      ? { start: annotation.start.id, end: annotation.end.id }
      : { start: null, end: null };
  });
  const annotationText = createMemo(() => {
    const range = annotationRange();
    const currentText = text();
    return range && currentText
      ? tokenRangeText(range.start, range.end, currentText)
      : "";
  });

  const dismissWordPanel = () => {
    lookupRequestId += 1;
    batch(() => {
      setSelectedToken(null);
      setLookup(null);
      setLookupError(null);
      setLookupLoading(false);
      setAnnotationStart(null);
      setAnnotationEnd(null);
      setAnnotationNote("");
      setAnnotationError(null);
      setSaveSelectionMessage(null);
      setSaveSelectionError(null);
      setSaveWordError(null);
    });
  };

  const closePanel = () => {
    batch(() => {
      dismissWordPanel();
      setSelection(null);
      setActiveSentenceId(null);
      setSelectedSentenceId(null);
    });
  };

  const startAnnotationFromSelection = () => {
    const currentText = text();
    if (!currentText) {
      return;
    }

    const normalized = normalizedSelection();
    const sentenceId = selectedSentenceId();
    let startToken: ReaderToken | undefined;
    let endToken: ReaderToken | undefined;

    if (sentenceId !== null) {
      const sentence = currentText.sentences.find(
        (item) => item.id === sentenceId,
      );
      const words = sentence?.tokens.filter(isWordToken) ?? [];
      startToken = words[0];
      endToken = words.at(-1);
      if (!startToken || !endToken) {
        batch(() => {
          setAnnotationError("The selected sentence is no longer available.");
          setSelectedToken(null);
          setLookup(null);
          setLookupError(null);
          setLookupLoading(false);
        });
        return;
      }
    } else if (normalized) {
      startToken = tokenById().get(normalized.startTokenId);
      endToken = tokenById().get(normalized.endTokenId);
    }

    if (!startToken || !endToken) {
      batch(() => {
        setAnnotationError("Select a word, phrase, or sentence before annotating.");
        setSelectedToken(null);
        setLookup(null);
        setLookupError(null);
        setLookupLoading(false);
      });
      return;
    }
    if (startToken.sentence_id !== endToken.sentence_id) {
      batch(() => {
        setAnnotationError("An annotation must be contained in one sentence.");
        setSelectedToken(null);
        setLookup(null);
        setLookupError(null);
        setLookupLoading(false);
      });
      return;
    }

    const column = tokenPositionMap().get(startToken.id)?.column ?? 2;
    batch(() => {
      setAnnotationStart(startToken);
      setAnnotationEnd(endToken);
      setAnnotationError(null);
      setSelectedToken({ ...startToken, column });
      setLastPanelColumn(column === 2 ? 3 : 2);
      setShortcutsOpen(false);
      setLookup(null);
      setLookupError(null);
      setLookupLoading(false);
    });
  };

  const toggleKeyboardHelp = () => {
    setShortcutsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setSaveSelectionMessage(null);
        setSaveSelectionError(null);
      }
      return nextOpen;
    });
  };

  const saveChunk = async (
    firstToken: ReaderToken,
    lastToken: ReaderToken,
  ) => {
    const currentText = text();
    if (!currentText || savingSelection()) {
      return;
    }
    if (firstToken.sentence_id !== lastToken.sentence_id) {
      setSaveSelectionError("A saved chunk must be contained in one sentence.");
      return;
    }

    setSavingSelection(true);
    setSaveSelectionError(null);
    try {
      const response = await fetch("/api/lexicon/chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: currentText.text_id,
          sentence_id: firstToken.sentence_id,
          start_token_id: firstToken.id,
          end_token_id: lastToken.id,
          note: null,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorDetail(body) ?? "Unable to save this chunk.");
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("phrase" in body) ||
        typeof body.phrase !== "string"
      ) {
        throw new Error("The backend returned an unexpected saved-chunk response.");
      }
      setSaveSelectionMessage(`Saved “${body.phrase}” to your Lexicon.`);
    } catch (requestError) {
      setSaveSelectionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save this chunk.",
      );
    } finally {
      setSavingSelection(false);
    }
  };

  const saveLearningSelection = async () => {
    const currentText = text();
    if (!currentText || savingSelection()) {
      return;
    }
    setSaveSelectionMessage(null);
    setSaveSelectionError(null);

    const sentenceId = selectedSentenceId();
    if (sentenceId !== null) {
      const sentence = currentText.sentences.find(
        (item) => item.id === sentenceId,
      );
      const words = sentence?.tokens.filter(isWordToken) ?? [];
      const firstWord = words[0];
      const lastWord = words.at(-1);
      if (!sentence || !firstWord || !lastWord) {
        setSaveSelectionError("The selected sentence is no longer available.");
        return;
      }
      await saveChunk(firstWord, lastWord);
      return;
    }

    const normalized = normalizedSelection();
    if (normalized && !normalized.isSingleToken) {
      const firstToken = tokenById().get(normalized.startTokenId);
      const lastToken = tokenById().get(normalized.endTokenId);
      if (!firstToken || !lastToken) {
        setSaveSelectionError("Select a word or a word range before saving.");
        return;
      }
      if (normalized.crossesSentence) {
        setSaveSelectionError("A saved chunk must be contained in one sentence.");
        return;
      }
      await saveChunk(firstToken, lastToken);
      return;
    }

    const selectedTokenId = normalized?.startTokenId;
    const activeTokenElement =
      document.activeElement instanceof Element
        ? document.activeElement.closest<HTMLElement>(
            ".reader-token[data-token-id]",
          )
        : null;
    const activeTokenId = activeTokenElement?.dataset.tokenId;
    const signalFocusedTokenId = focusedTokenId();
    const focusedToken =
      (selectedTokenId !== undefined
        ? tokenById().get(selectedTokenId)
        : undefined) ??
      (activeTokenId ? tokenById().get(Number(activeTokenId)) : undefined) ??
      (signalFocusedTokenId !== null
        ? tokenById().get(signalFocusedTokenId)
        : undefined) ??
      selectedToken();
    if (!focusedToken || !isWordToken(focusedToken)) {
      setSaveSelectionError("Focus a word or select a word range before saving.");
      return;
    }
    await saveWord(focusedToken);
  };

  const clearSelection = () => {
    batch(() => {
      setSelection(null);
      setSelectedSentenceId(null);
      setActiveSentenceId(null);
      setAnnotationStart(null);
      setAnnotationEnd(null);
      setAnnotationNote("");
      setAnnotationError(null);
      setSaveSelectionMessage(null);
      setSaveSelectionError(null);
    });
  };

  const selectSingleToken = (token: ReaderToken) => {
    batch(() => {
      setSelectedSentenceId(null);
      setActiveSentenceId(null);
      setSelection({
        kind: "word",
        anchorTokenId: token.id,
        focusTokenId: token.id,
      });
      setFocusedTokenId(token.id);
    });
  };

  const extendSelectionToToken = (token: ReaderToken) => {
    const currentSelection = selection();
    const anchorTokenId =
      currentSelection?.anchorTokenId ??
      shiftClickAnchorTokenId ??
      focusedTokenId() ??
      token.id;
    shiftClickAnchorTokenId = null;
    dismissWordPanel();
    batch(() => {
      setSelectedSentenceId(null);
      setActiveSentenceId(null);
      setSelection({
        kind: "range",
        anchorTokenId,
        focusTokenId: token.id,
      });
      setAnnotationStart(null);
      setAnnotationEnd(null);
      setAnnotationNote("");
      setAnnotationError(null);
      setFocusedTokenId(token.id);
    });
  };

  const selectSentenceByToken = (token: ReaderToken) => {
    const sentence = text()?.sentences.find(
      (item) => item.id === token.sentence_id,
    );
    const words = sentence?.tokens.filter(isWordToken) ?? [];
    const firstWord = words[0];
    const lastWord = words.at(-1);
    if (!sentence || !firstWord || !lastWord) {
      return;
    }
    dismissWordPanel();
    batch(() => {
      setActiveSentenceId(null);
      setSelectedSentenceId(sentence.id);
      setSelection({
        kind: "sentence",
        anchorTokenId: firstWord.id,
        focusTokenId: lastWord.id,
      });
      setFocusedTokenId(token.id);
      setShortcutsOpen(false);
      setSaveSelectionMessage(null);
      setSaveSelectionError(null);
      setSaveWordError(null);
    });
    focusTokenById(token.id);
  };

  const onPointerDownToken = (
    token: ReaderToken,
    pointerId: number,
    shiftKey: boolean,
  ) => {
    if (shiftKey) {
      const activeTokenElement =
        document.activeElement instanceof Element
          ? document.activeElement.closest<HTMLElement>(
              ".reader-token[data-token-id]",
            )
          : null;
      shiftClickAnchorTokenId =
        Number(activeTokenElement?.dataset.tokenId) ||
        focusedTokenId() ||
        token.id;
      dismissWordPanel();
      focusTokenById(token.id);
      return;
    }
    shiftClickAnchorTokenId = null;
    dismissWordPanel();
    suppressTokenClickUntil = 0;
    setPointerSelection({
      pointerId,
      anchorTokenId: token.id,
      hasDragged: false,
    });
    setFocusedTokenId(token.id);
    focusTokenById(token.id);
  };

  onMount(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select"));
      if (
        !isEditable &&
        (event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight") &&
        document.querySelector(".app-shell--reader")
      ) {
        event.preventDefault();
        const activeElement =
          document.activeElement instanceof Element
            ? document.activeElement.closest<HTMLSpanElement>(
                ".reader-token[data-token-id]",
              )
            : null;
        const eventElement =
          target instanceof Element
            ? target.closest<HTMLSpanElement>(".reader-token[data-token-id]")
            : null;
        const firstVisibleWord =
          columnsElement?.querySelector<HTMLSpanElement>(
            ".reader-token[tabindex='0'][data-token-id]",
          );
        const storedFocusId = focusedTokenId();
        const selectedRange = selection();
        const activeTokenId =
          eventElement?.dataset.tokenId ??
          activeElement?.dataset.tokenId ??
          (storedFocusId !== null
            ? String(storedFocusId)
            : undefined) ??
          (selectedRange
            ? String(selectedRange.focusTokenId)
            : undefined) ??
          firstVisibleWord?.dataset.tokenId ??
          String(orderedWords()[0]?.id ?? "");
        const activeId = Number(activeTokenId);
        const activeToken = tokenById().get(activeId);
        const currentElement =
          eventElement ??
          activeElement ??
          firstVisibleWord ??
          columnsElement?.querySelector<HTMLSpanElement>(
            `.reader-token[data-token-id="${activeId}"]`,
          );
        if (activeToken && currentElement) {
          onArrowNavigate(
            activeToken,
            event.key,
            currentElement,
            event.shiftKey,
            event.altKey,
          );
        }
        return;
      }
      if (event.key === "Escape") {
        if (shortcutsOpen()) {
          setShortcutsOpen(false);
        } else if (selectedToken() !== null) {
          closePanel();
        } else {
          clearSelection();
        }
        return;
      }
      if (
        isEditable ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        toggleKeyboardHelp();
      } else if (event.key.toLocaleLowerCase() === "s") {
        event.preventDefault();
        void saveLearningSelection();
      } else if (event.key.toLocaleLowerCase() === "a") {
        event.preventDefault();
        startAnnotationFromSelection();
      }
    };
    window.addEventListener("keydown", handleKeyboardShortcuts);
    const handleResize = () => {
      window.requestAnimationFrame(measureReaderLayout);
    };
    const handlePointerMove = (event: PointerEvent) => {
      const selection = pointerSelection();
      if (!selection || event.pointerId !== selection.pointerId) {
        return;
      }
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLSpanElement>(".reader-token[tabindex='0'][data-token-id]");
      if (!target || !columnsElement?.contains(target)) {
        return;
      }
      const targetTokenId = Number(target.dataset.tokenId);
      if (!orderedWords().some((word) => word.id === targetTokenId)) {
        return;
      }
      if (targetTokenId !== selection.anchorTokenId) {
        setPointerSelection({ ...selection, hasDragged: true });
        batch(() => {
          setActiveSentenceId(null);
          setSelectedSentenceId(null);
          setSelection({
            kind: "range",
            anchorTokenId: selection.anchorTokenId,
            focusTokenId: targetTokenId,
          });
          setAnnotationStart(null);
          setAnnotationEnd(null);
          setAnnotationNote("");
          setAnnotationError(null);
          setFocusedTokenId(targetTokenId);
        });
      } else if (selection.hasDragged) {
        batch(() => {
          setSelection({
            kind: "word",
            anchorTokenId: selection.anchorTokenId,
            focusTokenId: selection.anchorTokenId,
          });
          setFocusedTokenId(selection.anchorTokenId);
        });
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      const selection = pointerSelection();
      if (!selection || event.pointerId !== selection.pointerId) {
        return;
      }
      if (selection.hasDragged) {
        suppressTokenClickUntil = Date.now() + 500;
      }
      setPointerSelection(null);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      layoutObserver?.disconnect();
    });
  });

  const onHover = (
    token: ReaderToken,
    _column: 1 | 2 | 3,
    x: number,
    y: number,
  ) => setHoveredToken({ token, x, y });

  const focusTokenById = (tokenId: number) => {
    const position = tokenPositionMap().get(tokenId);
    if (!position) {
      return;
    }
    if (position.pageIndex !== pageIndex()) {
      setPageIndex(position.pageIndex);
    }
    setPendingFocusTokenId(tokenId);
  };

  const onArrowNavigate = (
    token: ReaderToken,
    key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
    current: HTMLSpanElement,
    shiftKey: boolean,
    altKey: boolean,
  ) => {
    dismissWordPanel();
    const tokens = Array.from(
      columnsElement?.querySelectorAll<HTMLSpanElement>(
        ".reader-token[data-token-id]",
      ) ?? [],
    );
    let nextTokenId: number | undefined;

    if (altKey) {
      const sentenceList = text()?.sentences ?? [];
      const currentSentenceIndex = sentenceList.findIndex(
        (sentence) => sentence.id === token.sentence_id,
      );
      const direction =
        key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
      const targetSentence = sentenceList[currentSentenceIndex + direction];
      const targetWords = targetSentence?.tokens.filter(isWordToken) ?? [];
      nextTokenId =
        (direction < 0 ? targetWords.at(-1) : targetWords[0])?.id;
      if (shiftKey && targetSentence) {
        const words = targetSentence.tokens.filter(isWordToken);
        const firstWord = words[0];
        const lastWord = words.at(-1);
        if (firstWord && lastWord) {
          const existingSelection = selection();
          const currentWords =
            sentenceList[currentSentenceIndex]?.tokens.filter(isWordToken) ?? [];
          const currentBoundary =
            direction < 0 ? currentWords.at(-1) : currentWords[0];
          const anchorTokenId =
            existingSelection?.kind === "sentence"
              ? existingSelection.anchorTokenId
              : currentBoundary?.id;
          const focusBoundary = direction < 0 ? firstWord : lastWord;
          batch(() => {
            setActiveSentenceId(null);
            setSelectedSentenceId(null);
            setSelection({
              kind: "sentence",
              anchorTokenId: anchorTokenId ?? focusBoundary.id,
              focusTokenId: focusBoundary.id,
            });
            setAnnotationStart(null);
            setAnnotationEnd(null);
            setAnnotationNote("");
            setAnnotationError(null);
          });
        }
      } else {
        batch(() => {
          setActiveSentenceId(targetSentence?.id ?? null);
          setSelectedSentenceId(null);
          setSelection(null);
        });
      }
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      batch(() => {
        setActiveSentenceId(null);
        setSelectedSentenceId(null);
      });
      const line = current.dataset.line;
      const columnElement = current.closest<HTMLElement>(
        "[data-reader-column]",
      );
      if (line && columnElement) {
        const lineWords = Array.from(
          columnElement.querySelectorAll<HTMLSpanElement>(
            `.reader-token[data-line="${line}"]`,
          ),
        ).filter((element) => /[\p{L}\p{N}]/u.test(element.textContent ?? ""));
        const currentIndex = lineWords.findIndex(
          (element) => element.dataset.tokenId === String(token.id),
        );
        const nextElement =
          lineWords[currentIndex + (key === "ArrowRight" ? 1 : -1)];
        if (nextElement?.dataset.tokenId) {
          nextTokenId = Number(nextElement.dataset.tokenId);
        }
      }
      if (nextTokenId === undefined) {
        const allWords = orderedWords();
        const currentIndex = allWords.findIndex((item) => item.id === token.id);
        nextTokenId =
          allWords[currentIndex + (key === "ArrowRight" ? 1 : -1)]?.id;
      }
    } else {
      batch(() => {
        setActiveSentenceId(null);
        setSelectedSentenceId(null);
      });
      const currentRect = current.getBoundingClientRect();
      const currentX = currentRect.left + currentRect.width / 2;
      const currentY = currentRect.top + currentRect.height / 2;
      const currentColumn = current.closest<HTMLElement>(
        "[data-reader-column]",
      );
      const findVerticalNeighbor = (sameColumnOnly: boolean) =>
        tokens
          .filter(
            (element) =>
              element !== current &&
              /[\p{L}\p{N}]/u.test(element.textContent ?? "") &&
              (!sameColumnOnly ||
                !currentColumn ||
                element.closest("[data-reader-column]") === currentColumn),
          )
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const deltaX = rect.left + rect.width / 2 - currentX;
            const deltaY = rect.top + rect.height / 2 - currentY;
            const isForward =
              key === "ArrowDown" ? deltaY > 1 : deltaY < -1;
            return isForward
              ? {
                  element,
                  score: Math.abs(deltaY) + Math.abs(deltaX) * 2,
                }
              : null;
          })
          .filter(
            (item): item is { element: HTMLSpanElement; score: number } =>
              item !== null,
          )
          .sort((left, right) => left.score - right.score)[0]?.element;
      const neighbor =
        findVerticalNeighbor(true) ?? findVerticalNeighbor(false);
      const neighborId = neighbor?.dataset.tokenId;
      nextTokenId = neighborId === undefined ? undefined : Number(neighborId);
      if (nextTokenId === undefined) {
        const words = orderedWords();
        const currentIndex = words.findIndex((item) => item.id === token.id);
        nextTokenId =
          words[currentIndex + (key === "ArrowDown" ? 1 : -1)]?.id;
      }
    }

    if (nextTokenId === undefined) {
      return;
    }
    const targetTokenId = nextTokenId;
    if (shiftKey && !altKey) {
      const currentSelection = selection();
      batch(() => {
        setSelection({
          kind: "range",
          anchorTokenId:
            currentSelection?.anchorTokenId ?? focusedTokenId() ?? token.id,
          focusTokenId: targetTokenId,
        });
        setAnnotationStart(null);
        setAnnotationEnd(null);
        setAnnotationNote("");
        setAnnotationError(null);
        setSelectedSentenceId(null);
      });
    } else {
      setSelection(null);
    }
    setFocusedTokenId(targetTokenId);
    focusTokenById(targetTokenId);
  };

  const onClickToken = async (
    token: ReaderToken,
    column: 1 | 2 | 3,
    shiftKey: boolean,
    altKey: boolean,
  ) => {
    if (Date.now() < suppressTokenClickUntil) {
      suppressTokenClickUntil = 0;
      return;
    }
    if (shiftKey) {
      extendSelectionToToken(token);
      focusTokenById(token.id);
      return;
    }
    if (altKey) {
      selectSentenceByToken(token);
      return;
    }
    const selected: SelectedToken = { ...token, column };
    const requestId = ++lookupRequestId;
    batch(() => {
      setActiveSentenceId(null);
      setSelectedSentenceId(null);
      selectSingleToken(token);
      setSelectedToken(selected);
      setLastPanelColumn(column === 2 ? 3 : 2);
      setShortcutsOpen(false);
      setSaveSelectionMessage(null);
      setSaveSelectionError(null);
      setSaveWordError(null);
      setAnnotationStart(null);
      setAnnotationEnd(null);
      setAnnotationError(null);
      setLookup(null);
      setLookupError(null);
      setLookupLoading(true);
    });
    focusTokenById(token.id);
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
      if (requestId === lookupRequestId) {
        setLookup(body);
      }
    } catch (requestError) {
      if (requestId === lookupRequestId) {
        setLookupError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to inspect this word.",
        );
      }
    } finally {
      if (requestId === lookupRequestId) {
        setLookupLoading(false);
      }
    }
  };

  const onActivateToken = (token: ReaderToken, column: 1 | 2 | 3) => {
    if (selectedSentenceId() === token.sentence_id) {
      batch(() => {
        setSelection(null);
        setSelectedSentenceId(null);
        setActiveSentenceId(null);
      });
      return;
    }
    if (activeSentenceId() === token.sentence_id) {
      selectSentenceByToken(token);
      return;
    }
    setSelectedSentenceId(null);
    void onClickToken(token, column, false, false);
  };

  const saveWord = async (
    token: ReaderToken | null = selectedToken(),
  ): Promise<boolean> => {
    const currentText = text();
    if (!token || !currentText || savingWord()) {
      return false;
    }
    const tokenLookup = selectedToken()?.id === token.id ? lookup() : null;
    setSavingWord(true);
    setSaveWordError(null);
    setSaveSelectionMessage(null);
    setSaveSelectionError(null);
    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_id: currentText.text_id,
          token_id: token.id,
          lemma: tokenLookup?.lemma ?? token.lemma,
          translation: tokenLookup?.translation ?? token.translation,
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
      const savedLexemeId =
        typeof body === "object" &&
        body !== null &&
        "lexeme_id" in body &&
        typeof body.lexeme_id === "number"
          ? body.lexeme_id
          : null;
      const forms = new Set(
        [token.surface, tokenLookup?.lemma ?? token.lemma]
          .filter((value): value is string => value !== null)
          .map((value) => value.toLocaleLowerCase()),
      );
      const updates: Record<number, ReaderToken["state"]> = {};
      const hasRenderedLexeme = currentText.sentences.some((sentence) =>
        sentence.tokens.some((word) => word.lexeme_id === savedLexemeId),
      );
      if (savedLexemeId !== null && hasRenderedLexeme) {
        for (const sentence of currentText.sentences) {
          for (const word of sentence.tokens) {
            if (word.lexeme_id === savedLexemeId) {
              updates[word.id] = savedState;
            }
          }
        }
      } else {
        const normalizedForms = new Set(
          [...forms].map((form) => form.toLocaleLowerCase()),
        );
        for (const sentence of currentText.sentences) {
          for (const word of sentence.tokens) {
            const wordForms = [word.surface, word.lemma]
              .filter((form): form is string => form !== null)
              .map((form) => form.toLocaleLowerCase());
            if (wordForms.some((form) => normalizedForms.has(form))) {
              updates[word.id] = savedState;
            }
          }
        }
      }
      updates[token.id] = savedState;
      setWordStates((current) => ({ ...current, ...updates }));
      setSelectedToken((current) =>
        current?.id === token.id
          ? {
              ...current,
              state: savedState,
              lexeme_id: savedLexemeId ?? current.lexeme_id,
            }
          : current,
      );
      setSaveSelectionMessage(`Saved “${token.surface}” to your Lexicon.`);
      setSelectedToken(null);
      setLookup(null);
      setLookupError(null);
      return true;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to save this word.";
      setSaveWordError(message);
      setSaveSelectionError(message);
      return false;
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
                aria-expanded={shortcutsOpen()}
                aria-controls="reader-panel"
                onClick={toggleKeyboardHelp}
              >
                Keyboard help
              </button>
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
              onClick={(event) => {
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest(
                    ".reader-token, .reader-column__overlay, button, input, textarea, select, a",
                  )
                ) {
                  return;
                }
                closePanel();
              }}
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
                    activeSentenceId={activeSentenceId()}
                    selectedSentenceId={selectedSentenceId()}
                    selectedTokenId={selectedToken()?.id ?? null}
                    rangeStartTokenId={selectionEndpoints().start}
                    rangeEndTokenId={selectionEndpoints().end}
                    selectedRange={(token) => {
                      const normalized = normalizedSelection();
                      if (!normalized) {
                        return false;
                      }
                      const tokenIndex = orderedTokens().findIndex(
                        (item) => item.id === token.id,
                      );
                      return (
                        tokenIndex >= normalized.startIndex &&
                        tokenIndex <= normalized.endIndex
                      );
                    }}
                    onHover={onHover}
                    onLeave={() => setHoveredToken(null)}
                    onClick={onClickToken}
                    onFocus={(token) => setFocusedTokenId(token.id)}
                    onActivate={onActivateToken}
                    onPointerDown={onPointerDownToken}
                    showPanel={
                      panelColumn() === column &&
                      (selectedToken() !== null ||
                        shortcutsOpen() ||
                        savingSelection() ||
                        savingWord() ||
                        saveSelectionMessage() !== null ||
                        saveSelectionError() !== null ||
                        (selectedToken() === null && annotationError() !== null))
                    }
                    panel={
                      <div id="reader-panel">
                        <Show
                          when={
                            savingSelection() ||
                            savingWord() ||
                            saveSelectionMessage() !== null ||
                            saveSelectionError() !== null ||
                            (selectedToken() === null && annotationError() !== null)
                          }
                        >
                          <aside
                            class={`reader-panel-notice${saveSelectionError() || annotationError() ? " reader-panel-notice--error" : ""}`}
                            role={saveSelectionError() || annotationError() ? "alert" : "status"}
                            aria-live={saveSelectionError() || annotationError() ? "assertive" : "polite"}
                          >
                            {savingSelection() || savingWord()
                              ? "Saving to your Lexicon…"
                              : saveSelectionError() ??
                                (selectedToken() === null ? annotationError() : null) ??
                                saveSelectionMessage()}
                          </aside>
                        </Show>
                        <Show
                          when={
                            !savingSelection() &&
                            !savingWord() &&
                            !saveSelectionMessage() &&
                            !saveSelectionError() &&
                            !annotationError() &&
                            shortcutsOpen()
                          }
                        >
                          <aside
                            class="reader-shortcuts"
                            aria-label="Reader keyboard shortcuts"
                          >
                            <div class="reader-shortcuts__heading">
                              <h3>Keyboard shortcuts</h3>
                              <button
                                class="secondary-button"
                                type="button"
                                onClick={() => setShortcutsOpen(false)}
                              >
                                Close
                              </button>
                            </div>
                            <ul>
                              <li>Left/Right arrows: move between words.</li>
                              <li>Up/Down arrows: move to a nearby word.</li>
                              <li>Option/Alt + arrows: move between sentences.</li>
                              <li>Shift + arrows: select a word range.</li>
                              <li>Shift + Option/Alt + arrows: select a sentence.</li>
                              <li>Shift + Click: extend a word-range selection.</li>
                              <li>Alt + Click: select a sentence.</li>
                              <li>Space or Enter: inspect a word or select a sentence.</li>
                              <li>S: save the focused word, selected range, or selected sentence to Lexicon.</li>
                              <li>A: annotate the selected word, phrase, or sentence.</li>
                              <li>?: show or hide this help.</li>
                              <li>Escape: close help or the word panel.</li>
                            </ul>
                          </aside>
                        </Show>
                        <Show
                          when={
                            !savingSelection() &&
                            !savingWord() &&
                            !saveSelectionMessage() &&
                            !saveSelectionError() &&
                            !annotationError() &&
                            !shortcutsOpen() &&
                            selectedToken()
                          }
                        >
                          {(token) => (
                            <WordDetailPanel
                              token={token()}
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
                          )}
                        </Show>
                      </div>
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
