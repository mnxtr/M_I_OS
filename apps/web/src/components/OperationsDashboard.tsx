import { FormEvent, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import ProductionDraftSync from "@/components/ProductionDraftSync";
import ProductionCharts from "@/components/ProductionCharts";
import { API_URL } from "@/lib/api";
import { Lang } from "@/lib/i18n";
import { clearLegacyToken, getAccessToken } from "@/lib/supabase";

export interface GapResult {
  observed_intervals: number; missing_actual_intervals: number; unscheduled_intervals: number;
  submitted_intervals?: number; data_coverage_percent?: number;
  target_units: number; actual_units: number; gap_units: number; attainment_percent: number | null;
  cycles: { line: string; start: string; end: string; intervals: number; gap_units: number }[];
  recurring_slots: { line: string; slot_dhaka: string; observed_days: number; gap_days: number }[];
  points: { line: string; start: string; target: number; actual: number | null; gap: number | null }[];
  by_line?: { line: string; target_units: number; actual_units: number; gap_units: number; attainment_percent: number | null; observed_intervals: number; missing_actual_intervals: number }[];
  daily?: { date: string; target_units: number; actual_units: number; gap_units: number; attainment_percent: number | null; observed_intervals: number }[];
  priority_actions?: { line: string | null; kind: "shortfall" | "data" | "monitor"; message: string }[];
}
const sample = JSON.stringify({ interval_minutes: 60, observations: [
  { line: "Demo Line 01", start: "2026-09-01T09:00:00+06:00", target: 100, actual: 72 },
  { line: "Demo Line 01", start: "2026-09-01T10:00:00+06:00", target: 100, actual: 86 },
  { line: "Demo Line 01", start: "2026-09-02T09:00:00+06:00", target: 100, actual: 78 },
  { line: "Demo Line 01", start: "2026-09-03T09:00:00+06:00", target: 100, actual: 92 },
] }, null, 2);

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadProductionCsv(points: GapResult["points"]) {
  const rows = [
    ["line", "start", "target_pieces", "actual_pieces", "gap_pieces"],
    ...points.map((point) => [point.line, point.start, point.target, point.actual, point.gap]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `linora-production-gaps-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OperationsDashboard({ lang, onKnowledge, onActivity }: { lang: Lang; onKnowledge: () => void; onActivity?: (text: string) => void }) {
  const bn = lang === "bn";
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [lineFilter, setLineFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [entry, setEntry] = useState({ line: "", start: "", target: "", actual: "" });
  const draft = useMemo(() => {
    try {
      const data = JSON.parse(input || '{"interval_minutes":60,"observations":[]}');
      if (!Array.isArray(data.observations) || data.observations.some((r: unknown) => !r || typeof r !== "object")) return null;
      return data as { interval_minutes: number; observations: GapResult["points"] };
    } catch { return null; }
  }, [input]);
  const visiblePoints = useMemo(() => result?.points.filter(p => lineFilter === "all" || p.line === lineFilter) ?? [], [result, lineFilter]);
  function loadDemo() { setInput(sample); setResult(null); setError(""); setConfirmDemo(false); setNotice(bn ? "à¦¡à§à¦®à§ à¦°à§à¦à¦°à§à¦¡ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤à¥¤" : "Demo records loaded. These are sample observations."); }
  function addInterval() {
    if (!entry.line.trim() || !entry.start || entry.target === "") { setError("Enter a line, Dhaka start time and target."); return; }
    const values = [Number(entry.target), ...(entry.actual === "" ? [] : [Number(entry.actual)])];
    if (values.some(n => !Number.isInteger(n) || n < 0 || n > 1000000)) { setError(bn ? "à§¦ à¦¥à§à¦à§ à§§à§¦,à§¦à§¦,à§¦à§¦à§¦ à¦ªà¦°à§à¦¯à¦¨à§à¦¤ à¦ªà§à¦°à§à¦£ à¦¸à¦à¦à§à¦¯à¦¾ à¦¦à¦¿à¦¨à¥¤" : "Use whole pieces between 0 and 1,000,000."); return; }
    if (!draft || draft.interval_minutes !== 60) { setError(bn ? "à¦à¦£à§à¦à¦¾à¦° à¦à¦¨à¦ªà§à¦à§à¦° à¦à¦¨à§à¦¯ à§¬à§¦ à¦®à¦¿à¦¨à¦¿à¦à§à¦° à¦°à§à¦à¦°à§à¦¡ à¦¦à¦°à¦à¦¾à¦°à¥¤" : "Hourly entry needs valid 60-minute interval JSON. Review the import first."); return; }
    if (draft.observations.length >= 500) { setError(bn ? "à¦¸à¦°à§à¦¬à§à¦à§à¦ à§«à§¦à§¦ à¦°à§à¦à¦°à§à¦¡à¥¤" : "The 500-interval limit is reached. Remove a record before adding another."); return; }
    try {
      const payload = input.trim() ? JSON.parse(input) : {interval_minutes: 60, observations: []};
      payload.observations.push({ line: entry.line.trim(), start: `${entry.start.length === 16 ? entry.start + ":00" : entry.start}+06:00`, target: Number(entry.target), actual: entry.actual === "" ? null : Number(entry.actual) });
      setInput(JSON.stringify(payload, null, 2)); setResult(null); setError("");
      setNotice(bn ? "à¦°à§à¦à¦°à§à¦¡ à¦¯à§à¦ à¦¹à¦¯à¦¼à§à¦à§à¥¤ à¦¨à¦¿à¦à§ à¦¯à¦¾à¦à¦¾à¦ à¦à¦°à§à¦¨à¥¤" : "Interval added to your draft. Review it below, then analyze.");
      setEntry({...entry, start:"", target:"", actual:""});
    } catch { setError("Correct the advanced JSON before adding an interval."); }
  }
  async function analyze(e: FormEvent) {
    e.preventDefault(); setError(""); setResult(null); setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error(bn ? "à¦à¦¬à¦¾à¦° à¦¸à¦¾à¦à¦¨ à¦à¦¨ à¦à¦°à§à¦¨à¥¤" : "Please sign in again.");
      const payload = JSON.parse(input);
      const res = await fetch(`${API_URL}/v1/operations/gaps`, { method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.status === 401) { clearLegacyToken(); throw new Error(bn ? "à¦¸à§à¦¶à¦¨ à¦¶à§à¦·à¥¤ à¦à¦¬à¦¾à¦° à¦¸à¦¾à¦à¦¨ à¦à¦¨ à¦à¦°à§à¦¨à¥¤" : "Session expired. Please sign in again."); }
      if (!res.ok) throw new Error(bn ? "à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£ à¦¬à§à¦¯à¦°à§à¦¥à¥¤ à¦¸à¦®à¦¯à¦¼, à¦²à¦à§à¦·à§à¦¯ à¦ à¦ªà§à¦°à¦à§à¦¤ à¦¸à¦à¦à§à¦¯à¦¾ à¦¯à¦¾à¦à¦¾à¦ à¦à¦°à§à¦¨à¥¤" : "Analysis unavailable. Check timestamps, targets and actuals; intervals must not overlap.");
      setResult(await res.json()); setLineFilter("all"); setPage(0); setNotice("");
      onActivity?.("Production-gap analysis completed (submitted intervals)");
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  return <section className="operations-dashboard">
    <div className="overview-heading"><div><span className="eyebrow">{bn ? "à¦à¦ªà¦¾à¦°à§à¦¶à¦¨à¦¸ à¦à¦­à¦¾à¦°à¦­à¦¿à¦" : "THE PRODUCTION PICTURE"}</span><h1>{bn ? "à¦ªà§à¦°à¦¤à¦¿à¦à¦¿ à¦¶à¦¿à¦«à¦, à¦à¦°à¦ à¦¸à§à¦ªà¦·à§à¦à¥¤" : "Every shift. A little clearer."}</h1><p className="muted">{bn ? "à¦²à¦à§à¦·à§à¦¯, à¦ªà§à¦°à¦à§à¦¤ à¦à§à¦ªà¦¾à¦¦à¦¨ à¦ à¦à¦¾à¦à¦¤à¦¿âà¦à¦ à¦à¦¾à¦¯à¦¼à¦à¦¾à¦¯à¦¼à¥¤" : "See what is falling behind, find the pattern, and focus your next conversation."}</p></div><button className="btn btn-ghost" onClick={onKnowledge}>{bn ? "à¦à§à¦à¦¾à¦¨ à¦à¦¨à¦¬à¦à§à¦¸" : "Knowledge inbox"}<Icon name="arrow"/></button></div>
    <div className="workflow-strip" aria-label={bn ? "à¦à¦¾à¦à§à¦° à¦§à¦¾à¦ª" : "Analysis workflow"}><span><b>01</b>{bn ? "à¦°à§à¦à¦°à§à¦¡ à¦¯à§à¦" : "Add actuals"}</span><span><b>02</b>{bn ? "à¦à¦¸à¦¡à¦¼à¦¾ à¦¯à¦¾à¦à¦¾à¦" : "Review your draft"}</span><span><b>03</b>{bn ? "à¦à¦¾à¦à¦¤à¦¿ à¦¦à§à¦à§à¦¨" : "Find the gaps"}</span></div>
    <ProductionDraftSync value={input} disabled={busy} lang={lang} onRestore={restored => { setInput(restored); setResult(null); setError(""); setNotice(""); setConfirmDemo(false); }}/>
    <form className="analysis-form" onSubmit={e => void analyze(e)}>
      <div className="section-heading"><div><span className="eyebrow">{bn ? "à¦¶à§à¦°à§ à¦à¦°à§à¦¨" : "START WITH THE ACTUALS"}</span><h2>{bn ? "à¦à¦£à§à¦à¦¾à¦­à¦¿à¦¤à§à¦¤à¦¿à¦ à¦à§à¦ªà¦¾à¦¦à¦¨" : "Hourly production"}</h2></div><span className="badge">{bn ? "à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£à§à¦° à¦à¦¸à¦¡à¦¼à¦¾" : "Workbench draft"}</span></div>
      <fieldset disabled={busy} className="entry-fieldset"><legend className="sr-only">{bn ? "à¦à§à¦ªà¦¾à¦¦à¦¨à§à¦° à¦°à§à¦à¦°à§à¦¡" : "Production observation"}</legend>
      <div className="entry-grid">
        <label>{bn ? "à¦²à¦¾à¦à¦¨" : "Line"}<input className="input" value={entry.line} onChange={e => setEntry({...entry,line:e.target.value})} placeholder="Line 01" maxLength={80}/></label>
        <label>{bn ? "à¦¶à§à¦°à§ (à¦¢à¦¾à¦à¦¾)" : "Start (Dhaka)"}<input className="input" type="datetime-local" value={entry.start} onChange={e => setEntry({...entry,start:e.target.value})}/></label>
        <label>{bn ? "à¦²à¦à§à¦·à§à¦¯ (à¦ªà¦¿à¦¸)" : "Target (pieces)"}<input className="input" type="number" min="0" max="1000000" step="1" value={entry.target} onChange={e => setEntry({...entry,target:e.target.value})}/></label>
        <label>{bn ? "à¦ªà§à¦°à¦à§à¦¤ (à¦«à¦¾à¦à¦à¦¾ = à¦à¦à¦¾à¦¨à¦¾)" : "Actual (blank = unknown)"}<input className="input" type="number" min="0" max="1000000" step="1" value={entry.actual} onChange={e => setEntry({...entry,actual:e.target.value})}/></label>
      </div><button type="button" className="btn btn-ghost" onClick={addInterval}>{bn ? "à¦à¦£à§à¦à¦¾à¦° à¦°à§à¦à¦°à§à¦¡ à¦¯à§à¦ à¦à¦°à§à¦¨" : "Add hourly interval"}</button>
      {notice && <p role="status" className="success-notice">{notice}</p>}
      {draft && draft.observations.length > 0 && <div className="draft-review"><div className="section-heading"><h3>{bn ? "à¦à¦ªà¦¨à¦¾à¦° à¦à¦¸à¦¡à¦¼à¦¾" : "Your draft"}</h3><span className="badge">{draft.observations.length} / 500</span></div><div className="table-scroll"><table><caption>{bn ? "à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£à§à¦° à¦à¦à§ à¦°à§à¦à¦°à§à¦¡ à¦¯à¦¾à¦à¦¾à¦ à¦à¦°à§à¦¨" : "Review intervals before analysis"}</caption><thead><tr><th>{bn ? "à¦²à¦¾à¦à¦¨" : "Line"}</th><th>{bn ? "à¦¶à§à¦°à§" : "Start"}</th><th>{bn ? "à¦²à¦à§à¦·à§à¦¯" : "Target"}</th><th>{bn ? "à¦ªà§à¦°à¦à§à¦¤" : "Actual"}</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{draft.observations.slice(-10).map((row, i) => {
        const index = Math.max(0, draft.observations.length - 10) + i;
        return <tr key={index}><td>{String(row.line ?? "â")}</td><td>{String(row.start ?? "â").replace("T", " ")}</td><td>{String(row.target ?? "â")}</td><td>{row.actual == null ? (bn ? "à¦à¦à¦¾à¦¨à¦¾" : "Unknown") : String(row.actual)}</td><td><button className="remove-button" type="button" aria-label={`${bn ? "à¦¸à¦°à¦¾à¦¨" : "Remove interval"} ${index + 1}`} onClick={() => { setInput(JSON.stringify({...draft, observations: draft.observations.filter((_, j) => j !== index)}, null, 2)); setResult(null); setNotice(bn ? "à¦°à§à¦à¦°à§à¦¡ à¦¸à¦°à¦¾à¦¨à§ à¦¹à¦¯à¦¼à§à¦à§à¥¤" : "Interval removed."); }}>{bn ? "à¦¸à¦°à¦¾à¦¨" : "Remove"}</button></td></tr>;
      })}</tbody></table></div>{draft.observations.length > 10 && <p className="muted">{bn ? "à¦¶à§à¦· à§§à§¦à¦à¦¿ à¦°à§à¦à¦°à§à¦¡ à¦¦à§à¦à¦¾à¦¨à§ à¦¹à¦¯à¦¼à§à¦à§à¥¤ à¦¸à¦¬ à¦°à§à¦à¦°à§à¦¡ à¦¨à¦¿à¦à§à¦° à¦à¦®à¦ªà§à¦°à§à¦ à¦à¦à¦¶à§ à¦à¦à§à¥¤" : "Showing the last 10 draft intervals. Review all records in the import below."}</p>}</div>}
      <details className="advanced-input"><summary>Review / import interval JSON</summary>
      <label htmlFor="observations">{bn ? "à¦¸à¦®à¦¯à¦¼à¦­à¦¿à¦¤à§à¦¤à¦¿à¦ à¦°à§à¦à¦°à§à¦¡ (JSON)" : "Production intervals (JSON)"}</label>
      <p id="observations-help" className="muted">{bn ? "à¦¸à¦°à§à¦¬à§à¦à§à¦ à§«à§¦à§¦ à¦°à§à¦à¦°à§à¦¡à¥¤ à¦à¦à¦: à¦ªà¦¿à¦¸à¥¤ à¦à¦¨à§à¦ªà¦¸à§à¦¥à¦¿à¦¤ actual: nullà¥¤" : "Up to 500 intervals. Units: pieces. Include line, timezone-aware start, target and actual (null when unknown)."}</p>
      <textarea id="observations" aria-describedby="observations-help" className="textarea code-input" rows={5} value={input} onChange={e => { setInput(e.target.value); setResult(null); }} placeholder={'{"interval_minutes":60,"observations":[]}'} maxLength={150000} />
      </details>
      </fieldset>
      <div className="button-row"><button className="btn" disabled={busy || !input.trim() || draft?.observations.length === 0}>{busy ? (bn ? "à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£ à¦¹à¦à§à¦à§â¦" : "Analyzingâ¦") : (bn ? "à¦à¦¾à¦à¦¤à¦¿ à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£" : "Analyze gaps")}<Icon name="arrow"/></button><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.trim() ? setConfirmDemo(true) : loadDemo()}>{bn ? "à¦¡à§à¦®à§ à¦°à§à¦à¦°à§à¦¡ à¦¦à¦¿à¦¨" : "Load labeled demo records"}</button></div>
      {confirmDemo && <div className="demo-confirm" role="group" aria-label="Replace draft with demo"><p>{bn ? "à¦¬à¦°à§à¦¤à¦®à¦¾à¦¨ à¦à¦¸à¦¡à¦¼à¦¾ à¦¡à§à¦®à§ à¦¦à¦¿à¦¯à¦¼à§ à¦¬à¦¦à¦²à¦¾à¦¬à§à¦¨?" : "Replace your current draft with sample records?"}</p><button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setConfirmDemo(false)}>{bn ? "à¦à¦¸à¦¡à¦¼à¦¾ à¦°à¦¾à¦à§à¦¨" : "Keep my draft"}</button><button className="btn" type="button" disabled={busy} onClick={loadDemo}>{bn ? "à¦¡à§à¦®à§ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦à¦°à§à¦¨" : "Use demo records"}</button></div>}
      <p className="muted">{bn ? "à¦°à¦¿à¦«à§à¦°à§à¦¶à§à¦° à¦à¦à§ à¦à¦¸à¦¡à¦¼à¦¾ à¦¸à¦à¦°à¦à§à¦·à¦£ à¦à¦°à§à¦¨à¥¤ à¦à¦à¦¾à¦¨à¦¾ à¦à§à¦ªà¦¾à¦¦à¦¨à§à¦° à¦à¦° à¦«à¦¾à¦à¦à¦¾ à¦°à¦¾à¦à§à¦¨à¥¤" : "Use Save draft before refreshing. Leave actual blank when output is unknown."}</p>
    </form>
    {error && <p role="alert" className="error-panel">{error}</p>}
    {!result && !busy && <div className="empty-panel"><h3>{bn ? "à¦à¦ªà¦¨à¦¾à¦° à¦ªà¦°à¦¬à¦°à§à¦¤à§ à¦¸à¦¿à¦¦à§à¦§à¦¾à¦¨à§à¦¤ à¦à¦à¦¾à¦¨ à¦¥à§à¦à§ à¦¶à§à¦°à§" : "Your next production decision starts here"}</h3><p>{bn ? "à¦ªà§à¦°à¦à§à¦¤ à¦°à§à¦à¦°à§à¦¡ à¦¦à¦¿à¦¯à¦¼à§ à¦¬à¦¿à¦¶à§à¦²à§à¦·à¦£ à¦à¦°à§à¦¨à¥¤" : "Analyze submitted records to see target attainment, shortfall runs, and recurring time slots. No live production feed is connected yet."}</p></div>}
    {result && <div aria-live="polite">
      <div className="metric-grid"><article className="metric-card"><span>{bn ? "à¦²à¦à§à¦·à§à¦¯ à¦à¦°à§à¦à¦¨" : "Target attainment"}</span><strong>{result.attainment_percent === null ? "â" : `${result.attainment_percent}%`}</strong><small>{result.actual_units} / {result.target_units} pcs</small></article><article className="metric-card"><span>{bn ? "à¦®à§à¦ à¦à¦¾à¦à¦¤à¦¿" : "Gross shortfall"}</span><strong>{result.gap_units}</strong><small>{bn ? "à¦ªà¦¿à¦¸; à¦à¦¤à¦¿à¦°à¦¿à¦à§à¦¤ à¦à§à¦ªà¦¾à¦¦à¦¨ à¦¬à¦¾à¦¦ à¦¦à§à¦¯à¦¼ à¦¨à¦¾" : "pieces; surplus does not cancel gaps"}</small></article><article className="metric-card"><span>{bn ? "à¦¤à¦¥à§à¦¯ à¦à¦­à¦¾à¦°à§à¦" : "Data coverage"}</span><strong>{result.data_coverage_percent ?? Math.round(result.observed_intervals * 100 / Math.max(result.points.length, 1))}%</strong><small>{result.observed_intervals}/{result.submitted_intervals ?? result.points.length} {bn ? "à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à¦¯à§à¦à§à¦¯ à¦°à§à¦à¦°à§à¦¡" : "usable records"}</small></article></div>
      {(result.priority_actions ?? []).length > 0 && <section className="priority-actions" aria-label="Priority production actions"><div><span className="eyebrow">NEXT BEST ACTIONS</span><h3>{bn ? "à¦ªà¦°à¦¬à¦°à§à¦¤à§ à¦¶à¦¿à¦«à¦à§à¦° à¦à¦à§à¦°à¦¾à¦§à¦¿à¦à¦¾à¦°" : "Priorities for the next shift"}</h3></div><ul>{result.priority_actions?.map((action, index) => <li key={`${action.kind}-${action.line ?? "all"}-${index}`}><span className={`action-kind action-${action.kind}`}>{action.kind === "shortfall" ? "Output" : action.kind === "data" ? "Data" : "Monitor"}</span><span>{action.message}</span></li>)}</ul></section>}
      <div className="section-heading"><h3>{bn ? "à¦ªà§à¦°à§à¦¡à¦¾à¦à¦¶à¦¨ à¦à¦¨à§à¦à§à¦²à¦¿à¦à§à¦¨à§à¦¸" : "Production intelligence"}</h3><div className="button-row"><label>{bn ? "à¦²à¦¾à¦à¦¨à§à¦° à¦°à§à¦à¦°à§à¦¡" : "Line records"}<select value={lineFilter} onChange={e => { setLineFilter(e.target.value); setPage(0); }}><option value="all">{bn ? "à¦¸à¦¬ à¦²à¦¾à¦à¦¨" : "All lines"}</option>{[...new Set(result.points.map(p => p.line))].map(line => <option key={line}>{line}</option>)}</select></label><button type="button" className="btn btn-ghost" onClick={() => downloadProductionCsv(visiblePoints)}>{bn ? "CSV à¦¡à¦¾à¦à¦¨à¦²à§à¦¡" : "Download CSV"}</button></div></div><p className="muted">{bn ? "à¦«à¦¿à¦²à§à¦à¦¾à¦° à¦¨à¦¿à¦à§à¦° à¦à¦¾à¦°à§à¦ à¦ à¦à§à¦¬à¦¿à¦²à§ à¦ªà§à¦°à¦¯à§à¦à§à¦¯à¥¤ à¦¸à¦¾à¦°à¦¾à¦à¦¶à§ à¦¸à¦¬ à¦à¦®à¦¾ à¦¦à§à¦à¦¯à¦¼à¦¾ à¦°à§à¦à¦°à§à¦¡ à¦à¦à§à¥¤" : "The filter applies to the charts and table below. The summary cards include every submitted record."}</p>
      <ProductionCharts result={result} lineFilter={lineFilter}/>
      <div className="table-scroll"><table><caption>{bn ? "à¦à¦¾à¦à¦¤à¦¿à¦° à¦à§à¦¸ à¦°à§à¦à¦°à§à¦¡" : "Source records behind the production gaps"}</caption><thead><tr><th>Line</th><th>Start (Dhaka)</th><th>Target</th><th>Actual</th><th>Gap</th></tr></thead><tbody>{visiblePoints.slice(page * 20, (page + 1) * 20).map((p,i) => <tr key={i}><td>{p.line}</td><td>{new Date(p.start).toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}</td><td>{p.target}</td><td>{p.actual ?? "â"}</td><td>{p.gap ?? "â"}</td></tr>)}</tbody></table></div>
      <div className="section-heading"><small>{bn ? "à¦®à§à¦ à¦°à§à¦à¦°à§à¦¡" : "Matching records"}: {visiblePoints.length} Â· {bn ? "à¦ªà§à¦·à§à¦ à¦¾" : "Page"} {page + 1}/{Math.max(1, Math.ceil(visiblePoints.length / 20))}</small><div className="button-row"><button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>{bn ? "à¦à¦à§à¦°" : "Previous records"}</button><button className="btn btn-ghost" disabled={(page + 1) * 20 >= visiblePoints.length} onClick={() => setPage(page + 1)}>{bn ? "à¦ªà¦°à§à¦°" : "Next records"}</button></div></div>
      <div className="insight-grid"><article className="panel"><h3>{bn ? "à¦§à¦¾à¦°à¦¾à¦¬à¦¾à¦¹à¦¿à¦ à¦à¦¾à¦à¦¤à¦¿" : "Consecutive shortfall runs"}</h3><p className="muted">{bn ? "à¦ªà¦¾à¦¶à¦¾à¦ªà¦¾à¦¶à¦¿ à¦¸à¦®à¦¯à¦¼à§à¦° à¦à¦¾à¦à¦¤à¦¿; à¦®à§à¦¶à¦¿à¦¨ à¦¸à¦¾à¦à¦à§à¦² à¦à¦¾à¦à¦® à¦¨à¦¯à¦¼à¥¤" : "Adjacent deficient intervalsânot machine cycle time."}</p><ul>{result.cycles.map((c,i) => <li key={i}>{c.line}: {new Date(c.start).toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})} Â· {c.intervals} intervals Â· {c.gap_units} pcs</li>)}</ul>{!result.cycles.length && <p>No shortfall runs in submitted observations.</p>}</article>
      <article className="panel"><h3>{bn ? "à¦ªà§à¦¨à¦°à¦¾à¦¬à§à¦¤à§à¦¤ à¦¸à¦®à¦¯à¦¼" : "Recurring gap slots"}</h3><p className="muted">{bn ? "à¦à¦¨à§à¦¤à¦¤ à§© à¦ªà¦°à§à¦¯à¦¬à§à¦à§à¦·à¦¿à¦¤ à¦¦à¦¿à¦¨ à¦ à§¬à§¦% à¦¦à¦¿à¦¨à§ à¦à¦¾à¦à¦¤à¦¿à¥¤ à¦à¦¾à¦°à¦£à§à¦° à¦ªà§à¦°à¦®à¦¾à¦£ à¦¨à¦¯à¦¼à¥¤" : "At least 3 observed days and gaps on â¥60% of them. A pattern to investigate, not proof of cause."}</p><ul>{result.recurring_slots.map((s,i) => <li key={i}>{s.line} Â· {s.slot_dhaka} Dhaka Â· {s.gap_days}/{s.observed_days} days</li>)}</ul>{!result.recurring_slots.length && <p>No recurring pattern meets the evidence threshold.</p>}</article></div>
    </div>}
  </section>;
}
