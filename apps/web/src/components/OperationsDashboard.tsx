import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";
import { Lang } from "@/lib/i18n";
import { getAccessToken } from "@/lib/supabase";

interface GapResult {
  observed_intervals: number; missing_actual_intervals: number; unscheduled_intervals: number;
  target_units: number; actual_units: number; gap_units: number; attainment_percent: number | null;
  cycles: { line: string; start: string; end: string; intervals: number; gap_units: number }[];
  recurring_slots: { line: string; slot_dhaka: string; observed_days: number; gap_days: number }[];
  points: { line: string; start: string; target: number; actual: number | null; gap: number | null }[];
}
const sample = JSON.stringify({ interval_minutes: 60, observations: [
  { line: "Demo Line 01", start: "2026-09-01T09:00:00+06:00", target: 100, actual: 72 },
  { line: "Demo Line 01", start: "2026-09-01T10:00:00+06:00", target: 100, actual: 86 },
  { line: "Demo Line 01", start: "2026-09-02T09:00:00+06:00", target: 100, actual: 78 },
  { line: "Demo Line 01", start: "2026-09-03T09:00:00+06:00", target: 100, actual: 92 },
] }, null, 2);

export default function OperationsDashboard({ lang, onKnowledge, onActivity }: { lang: Lang; onKnowledge: () => void; onActivity?: (text: string) => void }) {
  const bn = lang === "bn";
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState({ line: "", start: "", target: "", actual: "" });
  function addInterval() {
    if (!entry.line.trim() || !entry.start || entry.target === "") { setError("Enter a line, Dhaka start time and target."); return; }
    try {
      const payload = input.trim() ? JSON.parse(input) : {interval_minutes: 60, observations: []};
      payload.observations.push({ line: entry.line.trim(), start: `${entry.start.length === 16 ? entry.start + ":00" : entry.start}+06:00`, target: Number(entry.target), actual: entry.actual === "" ? null : Number(entry.actual) });
      setInput(JSON.stringify(payload, null, 2)); setResult(null); setError("");
      setEntry({...entry, start:"", target:"", actual:""});
    } catch { setError("Correct the advanced JSON before adding an interval."); }
  }
  async function analyze(e: FormEvent) {
    e.preventDefault(); setError(""); setResult(null); setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error(bn ? "আবার সাইন ইন করুন।" : "Please sign in again.");
      const payload = JSON.parse(input);
      const res = await fetch(`${API_URL}/v1/operations/gaps`, { method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.status === 401) { localStorage.removeItem("mios_token"); throw new Error(bn ? "সেশন শেষ। আবার সাইন ইন করুন।" : "Session expired. Please sign in again."); }
      if (!res.ok) throw new Error(bn ? "বিশ্লেষণ ব্যর্থ। সময়, লক্ষ্য ও প্রকৃত সংখ্যা যাচাই করুন।" : "Analysis unavailable. Check timestamps, targets and actuals; intervals must not overlap.");
      setResult(await res.json());
      onActivity?.("Production-gap analysis completed (submitted intervals)");
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  return <section className="operations-dashboard">
    <div className="hero"><div><span className="eyebrow">{bn ? "কারখানার অপারেশনস" : "YOUR FACTORY. IN FOCUS."}</span>
      <h1>{bn ? "ঘাটতি দেখুন। উৎপাদন এগিয়ে নিন।" : <>See the gap.<br />Keep production moving.</>}</h1>
      <p>{bn ? "লক্ষ্য, প্রকৃত উৎপাদন ও পুনরাবৃত্ত ঘাটতি—এক জায়গায়।" : "Turn shift records into clear priorities. Understand the shortfall before it becomes tomorrow’s problem."}</p>
      <button className="btn" onClick={onKnowledge}>{bn ? "জ্ঞান ইনবক্স খুলুন" : "Open knowledge inbox"} ↗</button></div>
      <div className="hero-note"><span className="status-dot" /> {bn ? "অপারেশনস আগে" : "OPERATIONS FIRST"}<strong>{bn ? "তথ্য থেকে পদক্ষেপ" : "From records to action."}</strong><p>{bn ? "প্রথমে আপনার তথ্য দিন। কোনো ডেমো সংখ্যা লাইভ নয়।" : "Bring your actuals. We surface the gaps—not made-up performance scores."}</p><span className="badge">GAZIPUR · SAVAR</span></div>
    </div>
    <div className="section-heading"><div><span className="eyebrow">{bn ? "উৎপাদন বিশ্লেষণ" : "PRODUCTION INTELLIGENCE"}</span><h2>{bn ? "আপনার উৎপাদনের ব্যবধান" : "Where is output falling behind?"}</h2></div><span className="badge">{bn ? "দেওয়া তথ্য · সংরক্ষিত নয়" : "Submitted data · not persisted"}</span></div>
    <form className="analysis-form" onSubmit={e => void analyze(e)}>
      <div className="entry-grid">
        <label>Line<input className="input" value={entry.line} onChange={e => setEntry({...entry,line:e.target.value})} placeholder="Line 01" maxLength={80}/></label>
        <label>Start (Dhaka)<input className="input" type="datetime-local" value={entry.start} onChange={e => setEntry({...entry,start:e.target.value})}/></label>
        <label>Target (pieces)<input className="input" type="number" min="0" max="1000000" value={entry.target} onChange={e => setEntry({...entry,target:e.target.value})}/></label>
        <label>Actual (blank = unknown)<input className="input" type="number" min="0" max="1000000" value={entry.actual} onChange={e => setEntry({...entry,actual:e.target.value})}/></label>
      </div><button type="button" className="btn btn-ghost" onClick={addInterval}>Add hourly interval</button>
      <details className="advanced-input"><summary>Review / import interval JSON</summary>
      <label htmlFor="observations">{bn ? "সময়ভিত্তিক রেকর্ড (JSON)" : "Production intervals (JSON)"}</label>
      <p id="observations-help" className="muted">{bn ? "সর্বোচ্চ ৫০০ রেকর্ড। একক: পিস। অনুপস্থিত actual: null।" : "Up to 500 intervals. Units: pieces. Include line, timezone-aware start, target and actual (null when unknown)."}</p>
      <textarea id="observations" aria-describedby="observations-help" className="textarea code-input" rows={5} value={input} onChange={e => { setInput(e.target.value); setResult(null); }} placeholder={'{"interval_minutes":60,"observations":[]}'} maxLength={150000} />
      </details>
      <div className="button-row"><button className="btn" disabled={busy || !input.trim()}>{busy ? (bn ? "বিশ্লেষণ হচ্ছে…" : "Analyzing…") : (bn ? "ঘাটতি বিশ্লেষণ" : "Analyze gaps")}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setInput(sample); setResult(null); }}>{bn ? "ডেমো রেকর্ড দিন" : "Load labeled demo records"}</button></div>
      <p className="muted">{bn ? "ঘণ্টাভিত্তিক বিশ্লেষণ; রেকর্ড সংরক্ষণ ও CSV ম্যাপিং পরের ধাপে।" : "Pilot workbench: hourly entry is analyzed, not saved. Durable records and CSV field mapping are the next milestone."}</p>
    </form>
    {error && <p role="alert" className="error-panel">{error}</p>}
    {!result && !busy && <div className="empty-panel"><h3>{bn ? "আপনার পরবর্তী সিদ্ধান্ত এখান থেকে শুরু" : "Your next production decision starts here"}</h3><p>{bn ? "প্রকৃত রেকর্ড দিয়ে বিশ্লেষণ করুন।" : "Analyze submitted records to see target attainment, shortfall runs, and recurring time slots. No live production feed is connected yet."}</p></div>}
    {result && <div aria-live="polite">
      <div className="metric-grid"><article className="metric-card"><span>{bn ? "লক্ষ্য অর্জন" : "Target attainment"}</span><strong>{result.attainment_percent === null ? "—" : `${result.attainment_percent}%`}</strong><small>{result.actual_units} / {result.target_units} pcs</small></article><article className="metric-card"><span>{bn ? "মোট ঘাটতি" : "Gross shortfall"}</span><strong>{result.gap_units}</strong><small>{bn ? "পিস; অতিরিক্ত উৎপাদন বাদ দেয় না" : "pieces; surplus does not cancel gaps"}</small></article><article className="metric-card"><span>{bn ? "তথ্য কভারেজ" : "Observed intervals"}</span><strong>{result.observed_intervals}</strong><small>{result.missing_actual_intervals} {bn ? "অনুপস্থিত" : "missing actuals"} · {result.unscheduled_intervals} {bn ? "লক্ষ্য শূন্য" : "zero-target intervals"}</small></article></div>
      <h3>{bn ? "সময়ভিত্তিক তুলনা" : "Interval performance"}</h3><p className="muted">{bn ? "লক্ষ্য অর্জনের বার; বিস্তারিত টেবিলে।" : "Bars show actual / target, capped visually at 100%. Exact values remain in the table. First 24 intervals shown."}</p>
      <div className="readiness-bars">{result.points.slice(0,24).map((p,i) => <div className="chart-row" key={i}><span>{p.line} · {new Date(p.start).toLocaleTimeString("en-GB", { timeZone:"Asia/Dhaka", hour:"2-digit", minute:"2-digit" })}</span><span className="bar-track" aria-hidden="true"><span className={`bar-fill ${p.gap ? "bar-processing" : "bar-ready"}`} style={{width: `${p.target && p.actual !== null ? Math.min(100, p.actual / p.target * 100) : 0}%`}} /></span><strong>{p.actual ?? "—"}/{p.target}</strong></div>)}</div>
      <div className="table-scroll"><table><caption>{bn ? "ঘাটতির উৎস রেকর্ড" : "Source records behind the production gaps"}</caption><thead><tr><th>Line</th><th>Start (Dhaka)</th><th>Target</th><th>Actual</th><th>Gap</th></tr></thead><tbody>{result.points.map((p,i) => <tr key={i}><td>{p.line}</td><td>{new Date(p.start).toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}</td><td>{p.target}</td><td>{p.actual ?? "—"}</td><td>{p.gap ?? "—"}</td></tr>)}</tbody></table></div>
      <div className="insight-grid"><article className="panel"><h3>{bn ? "ধারাবাহিক ঘাটতি" : "Consecutive shortfall runs"}</h3><p className="muted">{bn ? "পাশাপাশি সময়ের ঘাটতি; মেশিন সাইকেল টাইম নয়।" : "Adjacent deficient intervals—not machine cycle time."}</p><ul>{result.cycles.map((c,i) => <li key={i}>{c.line}: {new Date(c.start).toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})} · {c.intervals} intervals · {c.gap_units} pcs</li>)}</ul>{!result.cycles.length && <p>No shortfall runs in submitted observations.</p>}</article>
      <article className="panel"><h3>{bn ? "পুনরাবৃত্ত সময়" : "Recurring gap slots"}</h3><p className="muted">{bn ? "অন্তত ৩ পর্যবেক্ষিত দিন ও ৬০% দিনে ঘাটতি। কারণের প্রমাণ নয়।" : "At least 3 observed days and gaps on ≥60% of them. A pattern to investigate, not proof of cause."}</p><ul>{result.recurring_slots.map((s,i) => <li key={i}>{s.line} · {s.slot_dhaka} Dhaka · {s.gap_days}/{s.observed_days} days</li>)}</ul>{!result.recurring_slots.length && <p>No recurring pattern meets the evidence threshold.</p>}</article></div>
    </div>}
  </section>;
}
