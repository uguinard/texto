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
  const [error, setError] = createSignal<string | null>(null);
  const [importing, setImporting] = createSignal(false);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);
    setRenderedText(null);
    setSelectedToken(null);

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
                              onClick={() => setSelectedToken(token)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedToken(token);
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
            <span>{token().surface}</span>
            <button
              style={styles.closePopup}
              type="button"
              aria-label="Close selected word"
              onClick={() => setSelectedToken(null)}
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
    "align-items": "center",
    gap: "1rem",
    padding: "0.75rem 1rem",
    color: "white",
    "background-color": "#1f2937",
    "border-radius": "6px",
    "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.2)",
    "z-index": 10,
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
