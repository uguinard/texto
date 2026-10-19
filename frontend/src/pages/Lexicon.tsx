import { A, useLocation } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onMount,
  Show,
} from "solid-js";
import "../App.css";
import AppShell from "../components/AppShell";

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

function isLexiconItem(value: unknown): value is LexiconItem {
  if (typeof value !== "object" || value === null) return false;
  return (
    "vocab_item_id" in value && typeof value.vocab_item_id === "number" &&
    "language" in value && typeof value.language === "string" &&
    "lemma" in value && typeof value.lemma === "string" &&
    "surface_example" in value && typeof value.surface_example === "string" &&
    "translation" in value && (typeof value.translation === "string" || value.translation === null) &&
    "state" in value && (value.state === "new" || value.state === "learning" || value.state === "known") &&
    "exposure_count" in value && typeof value.exposure_count === "number" &&
    "created_at" in value && typeof value.created_at === "string" &&
    "next_review" in value && (typeof value.next_review === "string" || value.next_review === null)
  );
}

function isLexiconList(value: unknown): value is LexiconItem[] {
  return Array.isArray(value) && value.every(isLexiconItem);
}

function isLexiconState(value: unknown): value is LexiconState {
  return value === "new" || value === "learning" || value === "known";
}

function isSavedChunk(value: unknown): value is SavedChunk {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value && typeof value.id === "number" &&
    "text_id" in value && typeof value.text_id === "number" &&
    "text_title" in value && typeof value.text_title === "string" &&
    "language" in value && typeof value.language === "string" &&
    "sentence_id" in value && typeof value.sentence_id === "number" &&
    "start_token_id" in value && typeof value.start_token_id === "number" &&
    "end_token_id" in value && typeof value.end_token_id === "number" &&
    "phrase" in value && typeof value.phrase === "string" &&
    "source_sentence" in value && typeof value.source_sentence === "string" &&
    "note" in value && (typeof value.note === "string" || value.note === null) &&
    "state" in value && isLexiconState(value.state) &&
    "created_at" in value && typeof value.created_at === "string" &&
    "next_review" in value && (typeof value.next_review === "string" || value.next_review === null)
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

function getErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("detail" in value)) return null;
  return typeof value.detail === "string" ? value.detail : null;
}

export default function Lexicon() {
  const location = useLocation();

  const [lexiconFilter, setLexiconFilter] = createSignal<"all" | LexiconState>("all");
  const [lexiconSearch, setLexiconSearch] = createSignal("");
  const [debouncedSearch, setDebouncedSearch] = createSignal("");
  const [savedChunkNotes, setSavedChunkNotes] = createSignal<Record<number, string>>({});
  const [lexiconActionError, setLexiconActionError] = createSignal<string | null>(null);

  // Debounce search input by ~300ms
  createEffect(() => {
    const value = lexiconSearch();
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  });

  // Sync filter from URL query params (browser back/forward)
  createEffect(() => {
    const params = new URLSearchParams(location.search);
    const state = params.get("state");
    if (state === "new" || state === "learning" || state === "known") {
      setLexiconFilter(state);
    } else if (state === "all" || state === null) {
      // keep current if no param
    }
  });

  const [lexiconItems, { refetch: refreshLexicon }] = createResource(
    () => debouncedSearch() + "|" + lexiconFilter(),
    async (): Promise<LexiconItem[]> => {
      const params = new URLSearchParams();
      if (lexiconFilter() !== "all") {
        params.set("state", lexiconFilter());
      }
      if (debouncedSearch().trim()) {
        params.set("search", debouncedSearch().trim());
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
    () => true,
    async (): Promise<SavedChunk[]> => {
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

  const visibleSavedChunks = createMemo(() => {
    const search = debouncedSearch().trim().toLocaleLowerCase();
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

  const setReaderWordState = (
    item: LexiconItem,
    state: LexiconState,
  ) => {
    // No reader context in standalone Lexicon page; no-op.
    void item; void state;
  };

  const changeLexiconState = async (item: LexiconItem, state: LexiconState) => {
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
      await refreshLexicon();
    } catch (requestError) {
      setLexiconActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this word.",
      );
    }
  };

  const updateSavedChunk = async (chunk: SavedChunk, update: { state?: LexiconState; note?: string }) => {
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

  onMount(() => {
    void refreshLexicon();
    void refreshSavedChunks();
  });

  return (
    <AppShell>
      <main style={{ flex: 1 }}>
        <section>
          <h2>Lexicon</h2>
          <p>Saved words and multi-word chunks from your imported texts.</p>

          <div aria-label="Filter lexicon by state">
            <button
              type="button"
              aria-pressed={lexiconFilter() === "all"}
              onClick={() => setLexiconFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              aria-pressed={lexiconFilter() === "new"}
              onClick={() => setLexiconFilter("new")}
            >
              New
            </button>
            <button
              type="button"
              aria-pressed={lexiconFilter() === "learning"}
              onClick={() => setLexiconFilter("learning")}
            >
              Learning
            </button>
            <button
              type="button"
              aria-pressed={lexiconFilter() === "known"}
              onClick={() => setLexiconFilter("known")}
            >
              Known
            </button>
          </div>

          <label for="lexicon-search">Search Lexicon</label>
          <input
            id="lexicon-search"
            type="search"
            value={lexiconSearch()}
            onInput={(event) => setLexiconSearch(event.currentTarget.value)}
            placeholder="Search words and chunks..."
          />

          <Show when={lexiconItems.loading}>
            <p>Loading lexicon…</p>
          </Show>
          <Show when={lexiconItems.error}>
            <p role="alert">
              {lexiconItems.error instanceof Error ? lexiconItems.error.message : "Unable to load the lexicon."}
            </p>
          </Show>
          <Show when={lexiconActionError()}>
            <p role="alert">{lexiconActionError()}</p>
          </Show>
          <Show when={!lexiconItems.loading && !lexiconItems.error}>
            <Show
              when={(lexiconItems()?.length ?? 0) > 0}
              fallback={<p>No matching saved words.</p>}
            >
              <div style={{ "overflow-x": "auto" }}>
                <table style={{ width: "100%", "border-collapse": "collapse", "text-align": "left" }}>
                  <thead>
                    <tr>
                      <th>Word</th>
                      <th>Translation</th>
                      <th>State</th>
                      <th>Exposure count</th>
                      <th>Next Review</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={lexiconItems() ?? []}>
                      {(item) => (
                        <tr>
                          <td>
                            <strong>{item.lemma}</strong>
                            <div>Example form: {item.surface_example}</div>
                          </td>
                          <td>{item.translation ?? "—"}</td>
                          <td>
                            <span class={`lexicon-state lexicon-state--${item.state}`}>{item.state}</span>
                          </td>
                          <td>{item.exposure_count}</td>
                          <td>
                            {item.state === "known" ? (
                              <span aria-label="Known; no review due" title="Known; no review due">✓</span>
                            ) : (
                              formatNextReview(item.next_review)
                            )}
                          </td>
                          <td>
                            <select
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
                            <button type="button" onClick={() => { setLexiconActionError(null); void deleteLexiconItem(item); }}>
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

          <section aria-label="Saved chunks">
            <h3>Saved chunks</h3>
            <p>Multi-word expressions keep their original sentence and can be reviewed in cloze practice.</p>
            <Show when={savedChunks.loading}>
              <p>Loading saved chunks…</p>
            </Show>
            <Show when={savedChunks.error}>
              <p role="alert">
                {savedChunks.error instanceof Error ? savedChunks.error.message : "Unable to load saved chunks."}
              </p>
            </Show>
            <Show when={!savedChunks.loading && !savedChunks.error}>
              <Show
                when={visibleSavedChunks().length > 0}
                fallback={<p>No matching saved chunks.</p>}
              >
                <ul>
                  <For each={visibleSavedChunks()}>
                    {(chunk) => (
                      <li>
                        <div>
                          <strong>{chunk.phrase}</strong>
                          <p>{chunk.source_sentence}</p>
                          <p>
                            {chunk.text_title} · {chunk.language} ·{" "}
                            {chunk.state === "known" ? "Known" : formatNextReview(chunk.next_review)}
                          </p>
                        </div>
                        <label for={`chunk-note-${chunk.id}`}>Note (optional)</label>
                        <textarea
                          id={`chunk-note-${chunk.id}`}
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
                        <div>
                          <button
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
                          <select
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
      </main>
      <footer>
        <p>Lector — Local-first language learning</p>
      </footer>
    </AppShell>
  );
}
