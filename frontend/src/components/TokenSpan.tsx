export type ReaderToken = {
  id: number;
  surface: string;
  lemma: string | null;
  pos: string | null;
  translation: string | null;
  sentence_id: number;
  order_index: number;
  whitespace_after: string;
  state: "new" | "learning" | "known";
};

export type AnnotationCategory =
  | "lexical"
  | "syntactic"
  | "pragmatic"
  | "metaphor"
  | "discourse";

type TokenSpanProps = {
  token: ReaderToken;
  column: 1 | 2 | 3;
  annotationCategory?: AnnotationCategory;
  selectedRange?: boolean;
  selected?: boolean;
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
  ) => void;
};

export default function TokenSpan(props: TokenSpanProps) {
  return (
    <span
      class={`reader-token reader-token--${props.token.state}${props.annotationCategory ? ` reader-token--annotation-${props.annotationCategory}` : ""}${props.selectedRange ? " reader-token--range-selected" : ""}${props.selected ? " reader-token--selected" : ""}`}
      data-column={props.column}
      title={props.annotationCategory ? `${props.annotationCategory} annotation` : undefined}
      role="button"
      tabIndex={0}
      onMouseEnter={(event) =>
        props.onHover(props.token, props.column, event.clientX, event.clientY)
      }
      onMouseMove={(event) =>
        props.onHover(props.token, props.column, event.clientX, event.clientY)
      }
      onMouseLeave={props.onLeave}
      onClick={(event) =>
        props.onClick(props.token, props.column, event.shiftKey)
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onClick(props.token, props.column, false);
        }
      }}
      aria-label={`${props.token.surface}${props.token.state !== "new" ? `, ${props.token.state}` : ""}`}
    >
      {props.token.surface}
    </span>
  );
}
