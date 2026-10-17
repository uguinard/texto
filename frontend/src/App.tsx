import { createSignal, Show } from "solid-js";
import type { JSX } from "solid-js";

type TextImportResult = {
  id: number;
  sentence_count: number;
  approximate_token_count: number;
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
  const [error, setError] = createSignal<string | null>(null);
  const [importing, setImporting] = createSignal(false);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);

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
        </section>
      </main>

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
  footer: {
    "text-align": "center",
    "padding-top": "2rem",
    "border-top": "1px solid #e0e0e0",
    color: "#999",
    "font-size": "0.875rem",
  },
};

export default App;
