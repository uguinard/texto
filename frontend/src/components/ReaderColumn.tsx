import { For, Show } from "solid-js";
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
  selectedTokenId: number | null;
  selectedRange: (token: ReaderToken) => boolean;
  onHover: (
    token: ReaderToken,
    column: 1 | 2 | 3,
    x: number,
    y: number,
  ) => void;
  onLeave: () => void;
  onClick: (token: ReaderToken, column: 1 | 2 | 3, shiftKey: boolean) => void;
  showPanel: boolean;
  panel: JSX.Element;
};

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
              <For each={paragraph.sentences}>
                {(sentence, index) => (
                  <>
                    {index() > 0 && " "}
                    <span class="reader-sentence" data-sentence-id={sentence.id}>
                      <For each={sentence.tokens}>
                        {({ token, annotationCategory }) => (
                          <>
                            <TokenSpan
                              token={token}
                              column={props.column}
                              annotationCategory={annotationCategory}
                              selected={props.selectedTokenId === token.id}
                              selectedRange={props.selectedRange(token)}
                              onHover={props.onHover}
                              onLeave={props.onLeave}
                              onClick={props.onClick}
                            />
                            {token.whitespace_after}
                          </>
                        )}
                      </For>
                    </span>
                  </>
                )}
              </For>
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
