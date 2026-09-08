import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompliancePanel from "@/components/CompliancePanel";
import LangToggle from "@/components/LangToggle";
import {
  askStream,
  Citation,
  DocumentRecord,
  fetchDocuments,
  fetchUsage,
  listTables,
  QueryResult,
  runQuery,
  TableInfo,
  uploadDocument,
  UsageInfo,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  streaming?: boolean;
}

type Tab = "chat" | "compliance";

export default function WorkspacePage() {
  const router = useNavigate();
  const [lang, setLang] = useLang();
  const tr = t(lang);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analyticsQuery, setAnalyticsQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("mios_token")) {
      router("/");
      return;
    }
    refreshDocuments().catch(() => {});
    listTables()
      .then(setTables)
      .catch(() => {});
    fetchUsage()
      .then(setUsage)
      .catch(() => {});
  }, [router]);

  async function refreshDocuments() {
    setDocuments(await fetchDocuments());
    listTables()
      .then(setTables)
      .catch(() => {});
    fetchUsage()
      .then(setUsage)
      .catch(() => {});
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
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "assistant", text: "", streaming: true },
    ]);
    setBusy(true);
    try {
      await askStream(q, {
        onToken: (token) =>
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, text: last.text + token };
            }
            return copy;
          }),
      });
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { ...last, streaming: false };
        }
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAnalytics(event: FormEvent) {
    event.preventDefault();
    const q = analyticsQuery.trim();
    if (!q || analyticsBusy) return;
    setAnalyticsBusy(true);
    setError("");
    try {
      setQueryResult(await runQuery(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analytics failed");
    } finally {
      setAnalyticsBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("mios_token");
    router("/");
  }

  return (
    <main className="container">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>{tr.workspace}</h1>
        {usage && <UsageBadge usage={usage} />}
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LangToggle lang={lang} onChange={setLang} />
          <button className="btn btn-ghost" onClick={logout}>
            {tr.signOut}
          </button>
        </span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>{tr.knowledgeBase}</h2>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md,.docx,.xlsx,.csv"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <button
            className="btn"
            style={{ width: "100%" }}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {tr.uploadDoc}
          </button>

          <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
            {documents.map((doc) => (
              <li
                key={doc.id}
                style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>{doc.filename}</span>
                  <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                </div>
                <div className="muted">
                  {doc.doc_type} · {doc.page_count > 0 ? `${doc.page_count} ${tr.pages}` : ""}
                  {doc.error ? ` · ${doc.error}` : ""}
                </div>
              </li>
            ))}
            {documents.length === 0 && <li className="muted">{tr.noDocsYet}</li>}
          </ul>
        </section>

        <section
          className="panel"
          style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={tab === "chat" ? activeTabStyle : {}}
                onClick={() => setTab("chat")}
              >
                {tr.askFactory}
              </button>
              <button
                className="btn btn-ghost"
                style={tab === "compliance" ? activeTabStyle : {}}
                onClick={() => setTab("compliance")}
              >
                {tr.complianceCopilot}
              </button>
            </div>
            {tab === "chat" && (
              <button className="btn btn-ghost" onClick={() => setShowAnalytics((v) => !v)}>
                {showAnalytics ? tr.hideAnalytics : tr.analyticsWithCount(tables.length)}
              </button>
            )}
          </div>

          {tab === "compliance" ? (
            <CompliancePanel />
          ) : (
            <>
              {showAnalytics && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 12,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div className="muted">
                    {tables.length === 0
                      ? tr.analyticsHint
                      : `${tr.tablesPrefix} ${tables.map((tb) => `${tb.name} (${tb.row_count} ${tr.rows})`).join(", ")}`}
                  </div>
                  {tables.length > 0 && (
                    <>
                      <form onSubmit={onAnalytics} style={{ display: "flex", gap: 8 }}>
                        <input
                          className="input"
                          placeholder={tr.analyticsPlaceholder}
                          value={analyticsQuery}
                          onChange={(e) => setAnalyticsQuery(e.target.value)}
                        />
                        <button
                          className="btn"
                          disabled={analyticsBusy || !analyticsQuery.trim()}
                        >
                          {tr.run}
                        </button>
                      </form>
                      {queryResult && (
                        <div style={{ fontSize: 13 }}>
                          <p style={{ margin: "4px 0" }}>{queryResult.answer}</p>
                          <details>
                            <summary className="muted" style={{ cursor: "pointer" }}>
                              SQL ({queryResult.row_count})
                            </summary>
                            <pre style={{ whiteSpace: "pre-wrap", color: "var(--muted)" }}>
                              {queryResult.sql}
                            </pre>
                            {queryResult.rows.length > 0 && (
                              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                  <tr>
                                    {queryResult.columns.map((c) => (
                                      <th
                                        key={c}
                                        style={{
                                          textAlign: "left",
                                          borderBottom: "1px solid var(--border)",
                                          padding: 4,
                                        }}
                                      >
                                        {c}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {queryResult.rows.slice(0, 20).map((row, i) => (
                                    <tr key={i}>
                                      {queryResult.columns.map((c) => (
                                        <td
                                          key={c}
                                          style={{
                                            borderBottom: "1px solid var(--border)",
                                            padding: 4,
                                          }}
                                        >
                                          {String(row[c] ?? "")}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </details>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div
                style={{ flex: 1, overflowY: "auto", display: "grid", gap: 12, alignContent: "start" }}
              >
                {messages.length === 0 && <p className="muted">{tr.tryPrompt}</p>}
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
                          {tr.sources(msg.citations.length)}
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
                {busy && messages[messages.length - 1]?.text === "" && (
                  <p className="muted">{tr.thinking}</p>
                )}
              </div>

              {error && <p className="error-text">{error}</p>}

              <form onSubmit={onAsk} style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="input"
                  placeholder={tr.askPlaceholder}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button className="btn" disabled={busy || !question.trim()}>
                  {tr.ask}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const activeTabStyle: React.CSSProperties = {
  borderColor: "var(--accent)",
  color: "var(--accent)",
};

function UsageBadge({ usage }: { usage: UsageInfo }) {
  const used = usage.usage["chat_queries"] ?? 0;
  const limit = usage.limits["chat_queries"] ?? 0;
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <span
      className="muted"
      title={`Estimated ${usage.estimated_minutes_saved} minutes of expert time saved this month`}
      style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
    >
      <span className="badge">{usage.plan.name}</span>
      <span>
        {used}/{unlimited ? "∞" : limit} queries · ~{usage.estimated_minutes_saved} min saved
      </span>
      {!unlimited && (
        <span
          style={{
            width: 70,
            height: 5,
            background: "var(--border)",
            borderRadius: 4,
            overflow: "hidden",
            display: "inline-block",
          }}
        >
          <span
            style={{
              display: "block",
              width: `${pct}%`,
              height: "100%",
              background: pct > 90 ? "var(--danger)" : "var(--ok)",
            }}
          />
        </span>
      )}
    </span>
  );
}
