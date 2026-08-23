"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ask,
  Citation,
  DocumentRecord,
  fetchDocuments,
  uploadDocument,
} from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  provider?: string;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("mios_token")) {
      router.replace("/");
      return;
    }
    refreshDocuments().catch(() => {});
  }, [router]);

  async function refreshDocuments() {
    setDocuments(await fetchDocuments());
  }

  async function onUpload(file: File) {
    setError("");
    setBusy(true);
    try {
      await uploadDocument(file);
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onAsk(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setError("");
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await ask(q);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.answer,
          citations: res.citations,
          provider: res.provider,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("mios_token");
    router.replace("/");
  }

  return (
    <main className="container">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>MIOS Workspace</h1>
        <button className="btn btn-ghost" onClick={logout}>
          Sign out
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Knowledge Base</h2>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <button
            className="btn"
            style={{ width: "100%" }}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Upload document (PDF/TXT)
          </button>

          <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
            {documents.map((doc) => (
              <li
                key={doc.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>{doc.filename}</span>
                  <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                </div>
                <div className="muted">
                  {doc.doc_type} · {doc.page_count} pages
                  {doc.error ? ` · ${doc.error}` : ""}
                </div>
              </li>
            ))}
            {documents.length === 0 && (
              <li className="muted">No documents yet. Upload SOPs, audit reports, production sheets.</li>
            )}
          </ul>
        </section>

        <section className="panel" style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Ask your factory</h2>

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 12, alignContent: "start" }}>
            {messages.length === 0 && (
              <p className="muted">
                Try: “What was Line 7&apos;s efficiency last week?” or “Show fire drill records.”
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  style={{
                    background: msg.role === "user" ? "var(--accent-dark)" : "var(--bg)",
                    border: `1px solid ${msg.role === "user" ? "transparent" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: 12,
                    whiteSpace: "pre-wrap",
                    fontSize: 14,
                    marginLeft: msg.role === "user" ? 48 : 0,
                    marginRight: msg.role === "assistant" ? 48 : 0,
                  }}
                >
                  {msg.text}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <details style={{ marginTop: 6, marginLeft: 0 }}>
                    <summary className="muted" style={{ cursor: "pointer" }}>
                      Sources ({msg.citations.length})
                    </summary>
                    <ul style={{ paddingLeft: 18 }}>
                      {msg.citations.map((c, j) => (
                        <li key={j} className="muted" style={{ margin: "6px 0" }}>
                          <strong>{c.document_name}</strong> p.{c.page}: {c.snippet}…
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
            {busy && <p className="muted">Thinking…</p>}
          </div>

          {error && <p className="error-text">{error}</p>}

          <form onSubmit={onAsk} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              className="input"
              placeholder="Ask a question… (Bangla or English)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn" disabled={busy || !question.trim()}>
              Ask
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
