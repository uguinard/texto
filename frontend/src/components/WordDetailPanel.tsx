import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import type { AnnotationCategory, ReaderToken } from "./TokenSpan";

export type WordLookup = {
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

type WordDetailPanelProps = {
  token: ReaderToken;
  lookup: Accessor<WordLookup | null>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  saving: Accessor<boolean>;
  saveError: Accessor<string | null>;
  onClose: () => void;
  onSaveWord: () => void;
  annotationRange: Accessor<{ start: ReaderToken; end: ReaderToken } | null>;
  annotationText: Accessor<string>;
  category: Accessor<AnnotationCategory>;
  note: Accessor<string>;
  annotationSaving: Accessor<boolean>;
  annotationError: Accessor<string | null>;
  onCategoryChange: (category: AnnotationCategory) => void;
  onNoteChange: (note: string) => void;
  onSaveAnnotation: () => void;
  onCancelAnnotation: () => void;
};

const categories: AnnotationCategory[] = [
  "lexical",
  "syntactic",
  "pragmatic",
  "metaphor",
  "discourse",
];

export default function WordDetailPanel(props: WordDetailPanelProps) {
  return (
    <aside class="word-detail" aria-label={`Details for ${props.token.surface}`}>
      <div class="word-detail__header">
        <div>
          <h2>{props.token.surface}</h2>
          <Show when={props.lookup()?.lemma ?? props.token.lemma}>
            <p class="word-detail__lemma">
              Lemma: {props.lookup()?.lemma ?? props.token.lemma}
            </p>
          </Show>
        </div>
        <button
          class="icon-button"
          type="button"
          onClick={props.onClose}
          aria-label="Close word details"
        >
          ×
        </button>
      </div>
      <Show when={props.loading()}>
        <p>Looking up this word…</p>
      </Show>
      <Show when={props.error()}>
        <p class="inline-error" role="alert">{props.error()}</p>
      </Show>
      <Show when={props.lookup() || props.token.translation}>
        <p>
          <strong>Translation:</strong>{" "}
          {props.lookup()?.translation ?? props.token.translation}
        </p>
      </Show>
      <Show when={props.lookup()?.target_definition}>
        <p><strong>Meaning:</strong> {props.lookup()?.target_definition}</p>
      </Show>
      <Show when={props.lookup()?.grammar_note}>
        <p><strong>Grammar:</strong> {props.lookup()?.grammar_note}</p>
      </Show>
      <Show when={props.lookup()?.pragmatics_note}>
        <p><strong>Pragmatics:</strong> {props.lookup()?.pragmatics_note}</p>
      </Show>
      <Show when={props.lookup()?.example}>
        <p><strong>Example:</strong> {props.lookup()?.example}</p>
      </Show>
      <Show when={props.token.pos}>
        <p><strong>Part of speech:</strong> {props.token.pos}</p>
      </Show>
      <p class="word-detail__state">State: {props.token.state}</p>
      <Show when={props.token.state === "new"}>
        <button
          class="primary-button"
          type="button"
          disabled={props.saving()}
          onClick={props.onSaveWord}
        >
          {props.saving() ? "Saving…" : "Save word"}
        </button>
        <Show when={props.saveError()}>
          <p class="inline-error" role="alert">{props.saveError()}</p>
        </Show>
      </Show>
      <Show when={props.annotationRange()}>
        <section class="annotation-editor" aria-label="Add annotation">
          <h3>Annotate “{props.annotationText()}”</h3>
          <label>
            Category
            <select
              value={props.category()}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (categories.includes(value as AnnotationCategory)) {
                  props.onCategoryChange(value as AnnotationCategory);
                }
              }}
            >
              <For each={categories}>
                {(category) => (
                  <option value={category}>
                    {category[0].toUpperCase() + category.slice(1)}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label>
            Note (optional)
            <textarea
              rows={3}
              value={props.note()}
              onInput={(event) => props.onNoteChange(event.currentTarget.value)}
            />
          </label>
          <div class="word-detail__actions">
            <button
              class="primary-button"
              type="button"
              disabled={props.annotationSaving()}
              onClick={props.onSaveAnnotation}
            >
              {props.annotationSaving() ? "Saving…" : "Save annotation"}
            </button>
            <button
              class="secondary-button"
              type="button"
              disabled={props.annotationSaving()}
              onClick={props.onCancelAnnotation}
            >
              Cancel
            </button>
          </div>
          <Show when={props.annotationError()}>
            <p class="inline-error" role="alert">{props.annotationError()}</p>
          </Show>
        </section>
      </Show>
    </aside>
  );
}
