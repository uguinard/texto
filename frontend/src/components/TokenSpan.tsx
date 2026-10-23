export type ReaderToken = {
  id: number;
  surface: string;
  lemma: string | null;
  lexeme_id?: number | null;
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

function isWordToken(token: ReaderToken): boolean {
  return /[\p{L}\p{N}]/u.test(token.surface);
}

type TokenSpanProps = {
  token: ReaderToken;
  column: 1 | 2 | 3;
  annotationCategory?: AnnotationCategory;
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
    altKey: boolean,
  ) => void;
  onFocus: (token: ReaderToken) => void;
  onActivate: (token: ReaderToken, column: 1 | 2 | 3) => void;
  onPointerDown: (
    token: ReaderToken,
    pointerId: number,
    shiftKey: boolean,
  ) => void;
};

export default function TokenSpan(props: TokenSpanProps) {
  const isWord = isWordToken(props.token);

  return (
    <span
      class={`reader-token reader-token--${props.token.state}${props.annotationCategory ? ` reader-token--annotation-${props.annotationCategory}` : ""}${props.selected ? " reader-token--selected" : ""}`}
      data-column={props.column}
      data-token-id={props.token.id}
      data-sentence-id={props.token.sentence_id}
      aria-keyshortcuts={
        isWord
          ? "ArrowUp ArrowDown ArrowLeft ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Enter Space"
          : undefined
      }
      title={props.annotationCategory ? `${props.annotationCategory} annotation` : undefined}
      role={isWord ? "button" : undefined}
      tabIndex={isWord ? 0 : -1}
      onMouseEnter={(event) =>
        props.onHover(props.token, props.column, event.clientX, event.clientY)
      }
      onMouseMove={(event) =>
        props.onHover(props.token, props.column, event.clientX, event.clientY)
      }
      onMouseLeave={props.onLeave}
      onPointerDown={(event) => {
        if (isWord && event.button === 0) {
          props.onPointerDown(props.token, event.pointerId, event.shiftKey);
        }
      }}
      onClick={(event) => {
        if (isWord) {
          props.onClick(
            props.token,
            props.column,
            event.shiftKey,
            event.altKey,
          );
        }
      }}
      onFocus={() => {
        if (isWord) {
          props.onFocus(props.token);
        }
      }}
      onKeyDown={(event) => {
        if (isWord && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          props.onActivate(props.token, props.column);
        }
      }}
      aria-label={`${props.token.surface}${props.token.state !== "new" ? `, ${props.token.state}` : ""}`}
    >
      {props.token.surface}
    </span>
  );
}
