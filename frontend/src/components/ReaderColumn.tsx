import { createMemo, For, Show } from "solid-js";
import type { JSX } from "solid-js";
import type {
  AnnotationCategory,
  ReaderToken,
} from "./TokenSpan";
import TokenSpan from "./TokenSpan";

export type ColumnSentence = {
  id: number;
  position: number;
  paragraphIndex: number;
  tokens: Array<{
    token: ReaderToken;
    annotationCategory?: AnnotationCategory;
  }>;
};

export type ColumnParagraph = {
  id: number;
  sentences: ColumnSentence[];
};

type ReaderColumnProps = {
  column: 1 | 2 | 3;
  paragraphs: ColumnParagraph[];
  activeSentenceId: number | null;
  selectedSentenceId: number | null;
  selectedTokenId: number | null;
  rangeStartTokenId: number | null;
  rangeEndTokenId: number | null;
  selectedRange: (token: ReaderToken) => boolean;
  onHover: (
    token: ReaderToken,
    column: 1 | 2 | 3,
    x: number,
    y: number,
  ) => void;
  onLeave: () => void;
  onClick: (
    token: ReaderToken,
    column: 1 | 2 | 3,
    shiftKey: boolean,
    altKey: boolean,
  ) => void;
  onFocus: (token: ReaderToken) => void;
  onActivate: (token: ReaderToken, column: 1 | 2 | 3) => void;
  onPointerDown: (
    token: ReaderToken,
    pointerId: number,
    shiftKey: boolean,
  ) => void;
  showPanel: boolean;
  panel: JSX.Element;
};

type ParagraphItem =
  | {
      type: "token";
      sentence: ColumnSentence;
      token: ReaderToken;
      annotationCategory?: AnnotationCategory;
    }
  | { type: "space" };

function ParagraphTokens(props: {
  paragraph: ColumnParagraph;
  column: 1 | 2 | 3;
  activeSentenceId: number | null;
  selectedSentenceId: number | null;
  selectedTokenId: number | null;
  rangeStartTokenId: number | null;
  rangeEndTokenId: number | null;
  selectedRange: (token: ReaderToken) => boolean;
  onHover: ReaderColumnProps["onHover"];
  onLeave: ReaderColumnProps["onLeave"];
  onClick: ReaderColumnProps["onClick"];
  onFocus: ReaderColumnProps["onFocus"];
  onActivate: ReaderColumnProps["onActivate"];
  onPointerDown: ReaderColumnProps["onPointerDown"];
}) {
  const groups = createMemo(() => {
    const items: ParagraphItem[] = [];
    props.paragraph.sentences.forEach((sentence, sentenceIndex) => {
      if (sentenceIndex > 0) {
        items.push({ type: "space" });
      }
      sentence.tokens.forEach(({ token, annotationCategory }) => {
        items.push({ type: "token", sentence, token, annotationCategory });
      });
    });
    const selectedByIndex = items.map((item, index) => {
      if (item.type === "space") {
        const previous = items[index - 1];
        const next = items[index + 1];
        return (
          index > 0 &&
          index + 1 < items.length &&
          previous?.type === "token" &&
          next?.type === "token" &&
          props.selectedRange(previous.token) &&
          props.selectedRange(next.token)
        );
      }
      return props.selectedRange(item.token);
    });
    const result: Array<{
      selected: boolean;
      items: ParagraphItem[];
      rangeStart: boolean;
      rangeEnd: boolean;
    }> = [];

    for (let index = 0; index < items.length; ) {
      const selected = selectedByIndex[index];
      const start = index;
      while (index < items.length && selectedByIndex[index] === selected) {
        index += 1;
      }
      const groupItems = items.slice(start, index);
      const tokenIds = groupItems.flatMap((item) =>
        item.type === "token" ? [item.token.id] : [],
      );
      result.push({
        selected,
        items: groupItems,
        rangeStart:
          selected &&
          props.rangeStartTokenId !== null &&
          tokenIds.includes(props.rangeStartTokenId),
        rangeEnd:
          selected &&
          props.rangeEndTokenId !== null &&
          tokenIds.includes(props.rangeEndTokenId),
      });
    }
    return result;
  });

  const renderItems = (items: ParagraphItem[]): JSX.Element[] => {
    const rendered: JSX.Element[] = [];
    let sentence: ColumnSentence | null = null;
    let sentenceTokens: Extract<ParagraphItem, { type: "token" }>[] = [];
    const flushSentence = () => {
      if (!sentence || sentenceTokens.length === 0) {
        return;
      }
      const currentSentence = sentence;
      const tokens = sentenceTokens;
      rendered.push(
        <span
          class={`reader-sentence${props.activeSentenceId === currentSentence.id ? " reader-sentence--active" : ""}${props.selectedSentenceId === currentSentence.id ? " reader-sentence--selected" : ""}`}
          data-sentence-id={currentSentence.id}
        >
          <For each={tokens}>
            {({ token, annotationCategory }) => (
              <>
                <TokenSpan
                  token={token}
                  column={props.column}
                  annotationCategory={annotationCategory}
                  selected={props.selectedTokenId === token.id}
                  onHover={props.onHover}
                  onLeave={props.onLeave}
                  onClick={props.onClick}
                  onFocus={props.onFocus}
                  onActivate={props.onActivate}
                  onPointerDown={props.onPointerDown}
                />
                <span class="reader-whitespace" aria-hidden="true">
                  {token.whitespace_after}
                </span>
              </>
            )}
          </For>
        </span>,
      );
      sentence = null;
      sentenceTokens = [];
    };

    for (const item of items) {
      if (item.type === "space") {
        flushSentence();
        rendered.push(
          <span class="reader-whitespace" aria-hidden="true">
            {" "}
          </span>,
        );
      } else {
        if (sentence?.id !== item.sentence.id) {
          flushSentence();
          sentence = item.sentence;
        }
        sentenceTokens.push(item);
      }
    }
    flushSentence();
    return rendered;
  };

  return (
    <For each={groups()}>
      {(group) => (
        <span
          class={
            group.selected
              ? `reader-selection-range${group.rangeStart && group.rangeEnd ? " reader-selection-range--single" : group.rangeStart ? " reader-selection-range--start" : group.rangeEnd ? " reader-selection-range--end" : " reader-selection-range--middle"}`
              : undefined
          }
        >
          {renderItems(group.items)}
        </span>
      )}
    </For>
  );
}

export default function ReaderColumn(props: ReaderColumnProps) {
  return (
    <section
      class="reader-column"
      aria-label={`Reader column ${props.column}`}
      data-reader-column={props.column}
    >
      <div class="reader-column__content">
        <For each={props.paragraphs}>
          {(paragraph) => (
            <p class="reader-paragraph" data-paragraph-id={paragraph.id}>
              <ParagraphTokens
                paragraph={paragraph}
                column={props.column}
                activeSentenceId={props.activeSentenceId}
                selectedSentenceId={props.selectedSentenceId}
                selectedTokenId={props.selectedTokenId}
                rangeStartTokenId={props.rangeStartTokenId}
                rangeEndTokenId={props.rangeEndTokenId}
                selectedRange={props.selectedRange}
                onHover={props.onHover}
                onLeave={props.onLeave}
                onClick={props.onClick}
                onFocus={props.onFocus}
                onActivate={props.onActivate}
                onPointerDown={props.onPointerDown}
              />
            </p>
          )}
        </For>
      </div>
      <Show when={props.showPanel}>
        <div class="reader-column__overlay">{props.panel}</div>
      </Show>
    </section>
  );
}
