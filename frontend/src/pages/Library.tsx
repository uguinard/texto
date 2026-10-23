import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import AppShell from "../components/AppShell";
import { starterStories } from "../data/starterStories";

type LibraryText = {
  id: number;
  title: string;
  language: string;
  created_at: string;
  sentence_count: number;
  token_count: number;
};

type ImportResult = {
  id: number;
  sentence_count: number;
  approximate_token_count: number;
};

function isLibraryText(value: unknown): value is LibraryText {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "language" in value &&
    typeof value.language === "string" &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "sentence_count" in value &&
    typeof value.sentence_count === "number" &&
    "token_count" in value &&
    typeof value.token_count === "number"
  );
}

function isImportResult(value: unknown): value is ImportResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "sentence_count" in value &&
    typeof value.sentence_count === "number" &&
    "approximate_token_count" in value &&
    typeof value.approximate_token_count === "number"
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

export default function Library() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [title, setTitle] = createSignal("");
  const [language, setLanguage] = createSignal("");
  const [rawText, setRawText] = createSignal("");
  const [importing, setImporting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [openingStoryId, setOpeningStoryId] = createSignal<string | null>(null);
  const [storyError, setStoryError] = createSignal<string | null>(null);

  const [texts] = createResource(refreshKey, async (): Promise<LibraryText[]> => {
    const response = await fetch("/api/texts");
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(errorDetail(body) ?? "Unable to load your library.");
    }
    if (!Array.isArray(body) || !body.every(isLibraryText)) {
      throw new Error("The backend returned an unexpected library response.");
    }
    return body;
  });

  const importText = async (event: SubmitEvent) => {
    event.preventDefault();
    setImporting(true);
    setError(null);
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
        throw new Error(errorDetail(body) ?? "Unable to import this text.");
      }
      if (!isImportResult(body)) {
        throw new Error("The backend returned an unexpected import response.");
      }
      setTitle("");
      setLanguage("");
      setRawText("");
      setRefreshKey((key) => key + 1);
      await navigate(`/read/${body.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to import this text.",
      );
    } finally {
      setImporting(false);
    }
  };

  const openStarterStory = async (storyId: string) => {
    const story = starterStories.find((item) => item.id === storyId);
    if (!story || openingStoryId() !== null) {
      return;
    }

    setOpeningStoryId(storyId);
    setStoryError(null);
    try {
      const existingStory = (texts() ?? []).find(
        (text) =>
          text.title === story.title &&
          text.language.toLocaleLowerCase() === story.language.toLocaleLowerCase(),
      );
      if (existingStory) {
        await navigate(`/read/${existingStory.id}`);
        return;
      }

      const response = await fetch("/api/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: story.title,
          language: story.language,
          raw_text: story.rawText,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorDetail(body) ?? "Unable to open this story.");
      }
      if (!isImportResult(body)) {
        throw new Error("The backend returned an unexpected story response.");
      }
      setRefreshKey((key) => key + 1);
      await navigate(`/read/${body.id}`);
    } catch (requestError) {
      setStoryError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to open this story.",
      );
    } finally {
      setOpeningStoryId(null);
    }
  };

  return (
    <AppShell>
      <section class="library-page">
        <div class="page-heading">
          <div>
            <h2>Library</h2>
            <p>Your imported texts, ready to read.</p>
          </div>
        </div>

        <section class="starter-stories" aria-labelledby="starter-stories-title">
          <div class="starter-stories__heading">
            <div>
              <h3 id="starter-stories-title">Reading stories</h3>
              <p>Don Quixote, Chapter I: the Spanish original and translations.</p>
            </div>
          </div>
          <Show when={storyError()}>
            <p class="message-error" role="alert">{storyError()}</p>
          </Show>
          <div class="starter-stories__grid">
            <For each={starterStories}>
              {(story) => {
                const existingStory = () =>
                  (texts() ?? []).find(
                    (text) =>
                      text.title === story.title &&
                      text.language.toLocaleLowerCase() ===
                        story.language.toLocaleLowerCase(),
                  );
                return (
                  <article class="starter-story">
                    <p class="starter-story__language">{story.language}</p>
                    <h4>{story.title}</h4>
                    <button
                      class="secondary-button"
                      type="button"
                      disabled={
                        texts.loading || openingStoryId() !== null
                      }
                      onClick={() => void openStarterStory(story.id)}
                    >
                      {openingStoryId() === story.id
                        ? "Opening…"
                        : existingStory()
                          ? "Read story"
                          : "Add and read"}
                    </button>
                  </article>
                );
              }}
            </For>
          </div>
        </section>

        <Show when={texts.loading}>
          <p class="muted-message">Loading your library…</p>
        </Show>
        <Show when={texts.error}>
          <p class="message-error" role="alert">
            {texts.error instanceof Error
              ? texts.error.message
              : "Unable to load your library."}
          </p>
        </Show>
        <Show when={!texts.loading && !texts.error}>
          <Show
            when={(texts()?.length ?? 0) > 0}
            fallback={
              <div class="empty-library">
                <h3>No texts yet</h3>
                <p>Import a text to begin reading and noticing language in context.</p>
              </div>
            }
          >
            <div class="library-table-wrap">
              <table class="library-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Added</th>
                    <th>Sentences</th>
                    <th>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={texts() ?? []}>
                    {(text) => (
                      <tr>
                        <td>
                          <A class="library-title-link" href={`/read/${text.id}`}>
                            {text.title}
                          </A>
                        </td>
                        <td>{text.language}</td>
                        <td>{new Date(text.created_at).toLocaleDateString()}</td>
                        <td>{text.sentence_count}</td>
                        <td>{text.token_count}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        <details class="library-import">
          <summary>Import a text</summary>
          <form onSubmit={importText}>
            <label>
              Title
              <input
                value={title()}
                onInput={(event) => setTitle(event.currentTarget.value)}
                required
              />
            </label>
            <label>
              Language
              <input
                value={language()}
                onInput={(event) => setLanguage(event.currentTarget.value)}
                placeholder="For example, Spanish"
                required
              />
            </label>
            <label>
              Text
              <textarea
                value={rawText()}
                onInput={(event) => setRawText(event.currentTarget.value)}
                rows={6}
                required
              />
            </label>
            <button class="primary-button" type="submit" disabled={importing()}>
              {importing() ? "Importing…" : "Import and read"}
            </button>
          </form>
          <Show when={error()}>
            <p class="message-error" role="alert">{error()}</p>
          </Show>
        </details>
      </section>
    </AppShell>
  );
}
