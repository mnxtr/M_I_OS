import { useEffect, useState } from "react";
import { getKnowledgeSnapshot, KnowledgeSnapshot, SourceStatus } from "@/lib/dashboard";
import { Lang } from "@/lib/i18n";

export default function KnowledgeDashboard({ lang, revision = 0 }: { lang: Lang; revision?: number }) {
  const [filter, setFilter] = useState<SourceStatus | "all">("all");
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<KnowledgeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bn = lang === "bn";
  const names = { all: bn ? "সব" : "All", ready: bn ? "প্রস্তুত" : "Ready", processing: bn ? "প্রক্রিয়াধীন" : "Processing", failed: bn ? "ব্যর্থ" : "Failed" };
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoading(true); setError(""); setData(null);
    getKnowledgeSnapshot(filter, offset, controller.signal)
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "DASHBOARD_UNAVAILABLE"); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [filter, offset, reload, revision]);
  function select(value: SourceStatus | "all") { setFilter(value); setOffset(0); }

  return <section aria-labelledby="knowledge-title" className="knowledge-dashboard">
    <div className="section-heading">
      <div><span className="eyebrow">{bn ? "জ্ঞানভিত্তি" : "KNOWLEDGE INTELLIGENCE"}</span>
        <h2 id="knowledge-title">{bn ? "আপনার তথ্য কতটা প্রস্তুত?" : "How ready is your knowledge?"}</h2></div>
      <button className="btn btn-ghost" disabled={loading} onClick={() => setReload(x => x + 1)}>{bn ? "রিফ্রেশ" : "Refresh"}</button>
    </div>
    <p className="muted">{bn ? "বর্তমান প্রতিষ্ঠানের সব সময়ের ডকুমেন্ট। প্রস্তুত অবস্থা মানের নিশ্চয়তা নয়।" : "All-time documents in your current workspace. Ready means processed—not independently verified."}</p>
    {loading && <p role="status">{bn ? "তথ্য আসছে…" : "Loading knowledge readiness…"}</p>}
    {error && <div role="alert" className="error-panel"><p>{error === "SESSION_EXPIRED" ? (bn ? "আবার সাইন ইন করুন।" : "Your session expired. Please sign in again.") : (bn ? "তথ্য পাওয়া যাচ্ছে না। কোনো সংখ্যা অনুমান করা হয়নি।" : "Knowledge data is unavailable. No numbers have been estimated.")}</p>
      {error === "SESSION_EXPIRED" ? <a href="#/">{bn ? "সাইন ইন" : "Sign in"}</a> : <button className="btn" onClick={() => setReload(x => x + 1)}>{bn ? "আবার চেষ্টা" : "Retry"}</button>}</div>}
    {data && <>
      <div className="metric-grid">
        <article className="metric-card"><span>{bn ? "মোট ডকুমেন্ট" : "Total sources"}</span><strong>{data.total}</strong><small>{bn ? "আপনার প্রতিষ্ঠান" : "Current workspace"}</small></article>
        <article className="metric-card"><span>{bn ? "প্রস্তুত হার" : "Ready to retrieve"}</span><strong>{data.ready_percent === null ? "—" : `${data.ready_percent}%`}</strong><small>{bn ? "প্রস্তুত / মোট" : "Ready / total documents"}</small></article>
        <article className="metric-card"><span>{bn ? "মনোযোগ প্রয়োজন" : "Needs attention"}</span><strong>{data.counts.failed}</strong><small>{bn ? "প্রক্রিয়াকরণ ব্যর্থ" : "Failed processing"}</small></article>
      </div>
      {data.total === 0 ? <div className="empty-panel"><h3>{bn ? "জ্ঞানভিত্তি তৈরি করুন" : "Start with the files you already have"}</h3><p>{bn ? "ইনবক্সে এসওপি বা প্রোডাকশন শিট আপলোড করুন।" : "Add SOPs or production sheets to the knowledge inbox. Your source status will appear here."}</p></div> : <div className="readiness-bars" aria-label={bn ? "ডকুমেন্টের অবস্থা" : "Document status chart"}>
        {(["ready", "processing", "failed"] as SourceStatus[]).map(status => <button key={status} className="chart-row" aria-pressed={filter === status} onClick={() => select(status)}>
          <span>{names[status]}</span><span className="bar-track" aria-hidden="true"><span className={`bar-fill bar-${status}`} style={{ width: `${100 * data.counts[status] / data.total}%` }} /></span><strong>{data.counts[status]}</strong>
        </button>)}
      </div>}
      <div className="section-heading"><h3>{bn ? "উৎসের রেকর্ড" : "Source records"}</h3><label>{bn ? "অবস্থা" : "Status"}<select value={filter} onChange={e => select(e.target.value as SourceStatus | "all")}>{Object.entries(names).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label></div>
      <div className="table-scroll"><table><caption>{bn ? "নির্বাচিত ডকুমেন্ট" : "Documents matching the selected status"}</caption><thead><tr><th>{bn ? "ফাইল" : "File"}</th><th>{bn ? "অবস্থা" : "Status"}</th><th>{bn ? "বিভাগ" : "Department"}</th><th>{bn ? "আপলোড" : "Uploaded (Dhaka)"}</th></tr></thead><tbody>
        {data.records.map(record => <tr key={record.id}><td>{record.filename}</td><td><span className={`badge badge-${record.status}`}>{names[record.status]}</span></td><td>{record.department}</td><td>{new Date(record.created_at).toLocaleString(bn ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })}</td></tr>)}
        {data.records.length === 0 && <tr><td colSpan={4}>{bn ? "কোনো মিল নেই" : "No matching documents"}</td></tr>}
      </tbody></table></div>
      <div className="section-heading"><small>{bn ? "মোট মিল" : "Matching sources"}: {data.matched}</small><div className="button-row"><button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - data.limit))}>{bn ? "আগের" : "Previous"}</button><button className="btn btn-ghost" disabled={offset + data.limit >= data.matched} onClick={() => setOffset(offset + data.limit)}>{bn ? "পরের" : "Next"}</button></div></div>
      <p className="muted">{bn ? "তথ্য সংগ্রহ" : "Fetched"}: {new Date(data.fetched_at).toLocaleString(bn ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })} · {bn ? "সর্বশেষ অবস্থা জানতে রিফ্রেশ করুন" : "Refresh for the latest processing status"}</p>
    </>}
  </section>;
}
