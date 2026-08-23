"use client";

import { useEffect, useState } from "react";
import {
  AssessmentInfo,
  AssessmentItemRecord,
  autoAssessStream,
  createAssessment,
  draftCap,
  downloadBinder,
  getAssessmentItems,
  ITEM_STATUSES,
  listAssessments,
  listTemplates,
  TemplateInfo,
  updateAssessmentItem,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

export default function CompliancePanel() {
  const [lang] = useLang();
  const tr = t(lang);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [assessments, setAssessments] = useState<AssessmentInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<AssessmentItemRecord[]>([]);
  const [templateCode, setTemplateCode] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [runningRef, setRunningRef] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function refresh() {
    const [templateList, assessmentList] = await Promise.all([
      listTemplates(),
      listAssessments(),
    ]);
    setTemplates(templateList);
    if (!templateCode && templateList.length > 0) {
      setTemplateCode(templateList[0].code);
    }
    setAssessments(assessmentList);
    if (selected) await loadItems(selected);
  }

  async function loadItems(assessmentId: string) {
    setSelected(assessmentId);
    setItems(await getAssessmentItems(assessmentId));
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!templateCode || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createAssessment(templateCode, title.trim(), dueDate);
      setTitle("");
      setDueDate("");
      await refresh();
      await loadItems(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assessment");
    } finally {
      setBusy(false);
    }
  }

  async function onAutoAssess() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await autoAssessStream(selected, (event) => {
        if (event.type === "verdict" && event.ref) setRunningRef(null);
        if (event.type === "progress" && event.ref) setRunningRef(event.ref);
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-assessment failed");
    } finally {
      setBusy(false);
      setRunningRef(null);
    }
  }

  async function onOverride(item: AssessmentItemRecord, newStatus: string) {
    try {
      const updated = await updateAssessmentItem(item.id, { status: newStatus });
      setItems((list) => list.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
      await listAssessments().then(setAssessments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDraftCap(item: AssessmentItemRecord) {
    try {
      const updated = await draftCap(item.id);
      setItems((list) => list.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "CAP drafting failed");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form onSubmit={onCreate} className="panel" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{tr.newAuditCheck}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <select className="input" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
            {templates.map((tpl) => (
              <option key={tpl.code} value={tpl.code}>
                {tpl.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder={tr.exampleTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <button className="btn" disabled={busy || !title.trim()}>
            {tr.createAssessment}
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="panel">
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{tr.assessments}</h3>
        {assessments.length === 0 && <p className="muted">{tr.noAssessments}</p>}
        {assessments.map((a) => (
          <div
            key={a.id}
            onClick={() => loadItems(a.id)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              fontWeight: selected === a.id ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 14 }}>{a.title}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {Object.entries(a.counts).map(([statusKey, count]) => (
                <span key={statusKey} className={`badge badge-${badgeClass(statusKey)}`}>
                  {statusKey}: {count}
                </span>
              ))}
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(a.id);
                  onAutoAssess();
                }}
              >
                {tr.autoAssess}
              </button>
              <button
                className="btn btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadBinder(a.id).catch((err) =>
                    setError(err instanceof Error ? err.message : "Download failed"),
                  );
                }}
              >
                {tr.binder}
              </button>
            </span>
          </div>
        ))}
        {selected && (
          <p className="muted" style={{ marginTop: 8 }}>
            {runningRef ? tr.assessing(runningRef) : tr.selectItemHint}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="panel" style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <details key={item.id}>
              <summary style={{ cursor: "pointer", fontSize: 14 }}>
                <span className={`badge badge-${badgeClass(item.status)}`}>{item.status}</span>{" "}
                <strong>[{item.ref}]</strong> {item.title}
                {item.manually_set ? " ✎" : ""}
              </summary>
              <div style={{ padding: "10px 4px", fontSize: 13, display: "grid", gap: 8 }}>
                <div className="muted">{item.category}</div>
                {item.ai_notes && (
                  <div>
                    {tr.aiNotes} {item.ai_notes}
                  </div>
                )}
                {item.evidence.length > 0 && (
                  <>
                    <div className="muted">{tr.evidence}</div>
                    <ul style={{ paddingLeft: 18 }}>
                      {item.evidence.map((c, i) => (
                        <li key={i} className="muted">
                          <strong>{c.document_name}</strong> p.{c.page}: {c.snippet.slice(0, 160)}…
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {item.cap_text && (
                  <pre style={{ whiteSpace: "pre-wrap", background: "var(--bg)", padding: 10, borderRadius: 6 }}>
                    {item.cap_text}
                  </pre>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="input"
                    style={{ width: 170 }}
                    value={item.status}
                    onChange={(e) => onOverride(item, e.target.value)}
                  >
                    {ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" onClick={() => onDraftCap(item)}>
                    {tr.draftCap}
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function badgeClass(statusKey: string): string {
  if (statusKey === "compliant") return "ready";
  if (statusKey === "gap") return "failed";
  if (statusKey === "pending" || statusKey === "partial") return "processing";
  return "";
}
