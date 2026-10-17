import { createSignal, For, Show } from "solid-js";
import type { JSX } from "solid-js";

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
    typeof value.whitespace_after === "string"
  );
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
  const [error, setError] = createSignal<string | null>(null);
  const [importing, setImporting] = createSignal(false);

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
  };

  const handleImport = async () => {
    setLookupRequestId(lookupRequestId() + 1);
    setImporting(true);
    setError(null);
    setResult(null);
    setRenderedText(null);
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

      const renderResponse = await fetch(`/api/texts/${body.id}/render`);
      const renderBody: unknown = await renderResponse.json();
      if (!renderResponse.ok) {
        setError(
          getErrorMessage(renderBody) ?? "Text saved, but its reader view could not be loaded.",
        );
        return;
      }

      if (!isRenderedText(renderBody)) {
        setError("Text saved, but the backend returned an unexpected reader response.");
        return;
      }

      setRenderedText(renderBody);
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

      <main style={styles.main}>
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
                              style={
                                selectedToken()?.id === token.id
                                  ? styles.selectedToken
                                  : styles.token
                              }
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
      </main>

      <Show when={selectedToken()}>
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
  sectionTitle: {
    "margin-top": 0,
    "margin-bottom": "0.5rem",
    "font-size": "1.3rem",
    color: "#333",
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
  token: {
    cursor: "pointer",
    "border-radius": "2px",
  },
  selectedToken: {
    cursor: "pointer",
    "border-radius": "2px",
    "background-color": "#dbeafe",
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
