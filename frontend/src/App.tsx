import { createSignal } from "solid-js";
import { For } from "solid-js";

function App() {
  const [text, setText] = createSignal("");
  const [status, setStatus] = createSignal<{ message: string; type: "success" | "error" } | null>(null);
  const [importing, setImporting] = createSignal(false);

  const handleImport = async () => {
    const content = text().trim();
    if (!content) {
      setStatus({ message: "Please enter some text first.", type: "error" });
      return;
    }

    setImporting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ message: data.message || "Text imported successfully!", type: "success" });
        setText("");
      } else {
        setStatus({ message: data.detail || "Failed to import text", type: "error" });
      }
    } catch (error) {
      setStatus({ message: "Network error. Is the backend running?", type: "error" });
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
          <h2 style={styles.sectionTitle}>Import Text</h2>
          <p style={styles.description}>
            Paste a text in your target language to begin reading and learning.
          </p>

          <textarea
            style={styles.textarea}
            value={text()}
            onInput={(e) => setText(e.currentTarget.value)}
            placeholder="Paste your text here..."
            rows={15}
          />

          <div style={styles.buttonGroup}>
            <button
              style={styles.button}
              onClick={handleImport}
              disabled={importing()}
            >
              {importing() ? "Importing..." : "Import text"}
            </button>
          </div>

          {status() && (
            <div style={{
              ...styles.status,
              backgroundColor: status().type === "success" ? "#d4edda" : "#f8d7da",
              color: status().type === "success" ? "#155724" : "#721c24",
              borderColor: status().type === "success" ? "#c3e6cb" : "#f5c6cb",
            }}>
              {status().message}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Test</h2>
          <p style={styles.description}>
            Test the mock lookup endpoint:
          </p>
          <MockLookupTest />
        </section>
      </main>

      <footer style={styles.footer}>
        <p>Lector v0.0.1 — Local-first language learning</p>
      </footer>
    </div>
  );
}

// Simple component to test the mock-lookup endpoint
function MockLookupTest() {
  const [testText, setTestText] = createSignal("Hello world this is a test");
  const [result, setResult] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/mock-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText() }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to call mock-lookup" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.testContainer}>
      <input
        style={styles.testInput}
        type="text"
        value={testText()}
        onInput={(e) => setTestText(e.currentTarget.value)}
        placeholder="Enter text to analyze"
      />
      <button style={styles.button} onClick={handleTest} disabled={loading()}>
        {loading() ? "Analyzing..." : "Test Mock Lookup"}
      </button>

      {result() && (
        <pre style={styles.result}>{JSON.stringify(result(), null, 2)}</pre>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1rem",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e0e0e0",
  },
  title: {
    margin: 0,
    fontSize: "2.5rem",
    fontWeight: 600,
    color: "#1a1a2e",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    color: "#666",
    fontSize: "1.1rem",
  },
  main: {
    flex: 1,
  },
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "0.5rem",
    fontSize: "1.3rem",
    color: "#333",
  },
  description: {
    marginBottom: "1rem",
    color: "#666",
    lineHeight: 1.5,
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    fontFamily: "inherit",
    border: "1px solid #ddd",
    borderRadius: "4px",
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: "1rem",
  },
  buttonGroup: {
    display: "flex",
    gap: "0.5rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    fontWeight: 500,
    color: "white",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  status: {
    marginTop: "1rem",
    padding: "0.75rem 1rem",
    borderRadius: "4px",
    border: "1px solid",
  },
  testContainer: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "1rem",
  },
  testInput: {
    flex: 1,
    minWidth: "200px",
    padding: "0.5rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  result: {
    backgroundColor: "#f5f5f5",
    padding: "1rem",
    borderRadius: "4px",
    overflow: "auto",
    maxHeight: "300px",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  },
  footer: {
    textAlign: "center",
    paddingTop: "2rem",
    borderTop: "1px solid #e0e0e0",
    color: "#999",
    fontSize: "0.875rem",
  },
};

export default App;