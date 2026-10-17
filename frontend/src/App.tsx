import { createResource, createSignal, For, Show } from "solid-js";
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
    typeof value.created_at === "string"
  );
}

function isLexiconList(value: unknown): value is LexiconItem[] {
  return Array.isArray(value) && value.every(isLexiconItem);
}

function isLexiconState(value: string): value is LexiconState {
  return value === "new" || value === "learning" || value === "known";
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
  const [currentView, setCurrentView] = createSignal<"reader" | "lexicon">("reader");
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
  const [title, setTitle] = createSignal("");
  const [language, setLanguage] = createSignal("");
  const [rawText, setRawText] = createSignal("");
  const [result, setResult] = createSignal<TextImportResult | null>(null);
  const [renderedText, setRenderedText] = createSignal<RenderedText | null>(null);
  const [selectedToken, setSelectedToken] = createSignal<RenderedToken | null>(null);
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

  const openSavedText = async (textId: number) => {
    const requestId = readerRequestId() + 1;
    setReaderRequestId(requestId);
    setOpeningTextId(textId);
    setReaderError(null);
    setResult(null);
    closeLookup();

    try {
      const text = await fetchRenderedText(textId);
      if (requestId === readerRequestId()) {
        setRenderedText(text);
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
  ) => {
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
        <button
          style={currentView() === "reader" ? styles.navButtonActive : styles.navButton}
          type="button"
          aria-current={currentView() === "reader" ? "page" : undefined}
          onClick={() => setCurrentView("reader")}
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
          }}
        >
          Lexicon
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
                        {(token) => (
                          <>
                            <span
                              class={`reader-token reader-token--${token.state}${selectedToken()?.id === token.id ? " reader-token--selected" : ""}`}
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                void handleTokenClick(token, sentence, text())
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
                        )}
                      </For>
                    </p>
                  )}
                </For>
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
              Saved words and their exposure in your imported texts.
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
              Search words
            </label>
            <input
              id="lexicon-search"
              style={styles.input}
              type="search"
              value={lexiconSearch()}
              onInput={(event) => setLexiconSearch(event.currentTarget.value)}
              placeholder="Search lemma..."
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
