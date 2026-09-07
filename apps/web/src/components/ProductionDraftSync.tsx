import { useEffect, useRef, useState } from "react";
import { Lang } from "@/lib/i18n";
import { loadProductionDraft, SavedDraft, saveProductionDraft } from "@/lib/productionDrafts";

export default function ProductionDraftSync({value, onRestore, disabled, lang}: {
  value:string; onRestore:(value:string)=>void; disabled:boolean; lang:Lang;
}) {
  const bn = lang === "bn";
  const [remote, setRemote] = useState<SavedDraft | null>(null);
  const [revision, setRevision] = useState(0);
  const [savedValue, setSavedValue] = useState("");
  const [review, setReview] = useState(false);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const running = useRef(false);
  const saveController = useRef<AbortController | null>(null);
  useEffect(() => () => { saveController.current?.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setState("loading"); setError("");
    loadProductionDraft(controller.signal).then(draft => {
      if (!active) return;
      setRemote(draft); setRevision(draft?.revision ?? 0); setReview(Boolean(draft)); setState("ready");
    }).catch(err => { if (active) { setState("error"); setError(err instanceof Error ? err.message : "DRAFT_UNAVAILABLE"); } })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [reload]);

  async function save() {
    if (running.current || disabled || review || state !== "ready") return;
    const captured = value;
    try { JSON.parse(captured); } catch { setError("DRAFT_INVALID"); return; }
    running.current = true; setState("saving"); setError("");
    const controller = new AbortController(); saveController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const draft = await saveProductionDraft(captured, revision, controller.signal);
      if (!draft) throw new Error("DRAFT_UNAVAILABLE");
      setRemote(draft); setRevision(draft.revision); setSavedValue(captured); setState("ready");
    } catch (err) {
      const code = err instanceof Error ? err.message : "DRAFT_UNAVAILABLE";
      setError(code); setState(code === "DRAFT_CONFLICT" ? "conflict" : "ready");
    } finally { clearTimeout(timeout); running.current = false; saveController.current = null; }
  }

  const dirty = value !== savedValue;
  const busy = state === "loading" || state === "saving";
  return <section className="draft-storage" aria-label={bn ? "খসড়া সংরক্ষণ" : "Draft storage"}>
    <div className="section-heading"><div><strong>{bn ? "আমার সংরক্ষিত খসড়া" : "My saved draft"}</strong><p className="muted">{bn ? "আপনার একাউন্ট ও বর্তমান ওয়ার্কস্পেসের ব্যক্তিগত খসড়া।" : "Private to your account in this workspace. Saving does not submit official production records."}</p></div>
      <button type="button" className="btn btn-ghost" disabled={disabled || busy || review || state !== "ready" || !value.trim() || !dirty} onClick={() => void save()}>{state === "saving" ? (bn ? "সংরক্ষণ হচ্ছে…" : "Saving…") : (bn ? "খসড়া সংরক্ষণ" : "Save draft")}</button></div>
    <p role="status" className="muted">{state === "loading" ? (bn ? "সংরক্ষিত খসড়া খুঁজছি…" : "Checking for a saved draft…") : review ? (bn ? "একটি সংরক্ষিত খসড়া আছে। নিচে বেছে নিন।" : "A saved draft is available. Choose how to continue below.") : remote && !dirty ? (bn ? "সার্ভারে সংরক্ষিত।" : "Saved on the server.") : (bn ? "অসংরক্ষিত পরিবর্তন রিফ্রেশ করলে মুছে যাবে।" : "Unsaved changes will be lost on refresh.")}</p>
    {remote && <p className="muted">{bn ? "সংস্করণ" : "Revision"} {remote.revision} · {new Date(remote.updated_at).toLocaleString(bn ? "bn-BD" : "en-GB", {timeZone:"Asia/Dhaka"})} · {remote.payload.observations.length} {bn ? "রেকর্ড" : "intervals"}</p>}
    {review && remote && <div className="draft-choice"><details><summary>{bn ? "সংরক্ষিত রেকর্ড দেখুন" : "Review saved records"}</summary><pre className="saved-draft-preview">{JSON.stringify(remote.payload, null, 2)}</pre></details><div className="button-row">
      <button type="button" className="btn" disabled={disabled || busy} onClick={() => { const restored = JSON.stringify(remote.payload, null, 2); onRestore(restored); setSavedValue(restored); setReview(false); setError(""); }}>{bn ? "সংরক্ষিত খসড়া পুনরুদ্ধার" : "Restore saved draft"}</button>
      <button type="button" className="btn btn-ghost" disabled={disabled || busy} onClick={() => { setReview(false); setSavedValue(JSON.stringify(remote.payload, null, 2)); }}>{bn ? "স্থানীয় খসড়া রাখুন" : "Use my local draft instead"}</button>
    </div><p className="muted">{bn ? "পুনরুদ্ধার করলে বর্তমান ইনপুট বদলে যাবে। স্থানীয় খসড়া রাখলে আবার সংরক্ষণ চাপুন।" : "Restore replaces the current input. Keeping local changes does not overwrite the server until you press Save draft."}</p></div>}
    {error && <div role="alert" className="error-panel"><p>{error === "DRAFT_CONFLICT" ? (bn ? "অন্য ট্যাবে নতুন সংস্করণ সংরক্ষিত। আপনার ইনপুট অক্ষত আছে।" : "A newer draft was saved elsewhere. Your local input is unchanged.") : error === "DRAFT_INVALID" ? (bn ? "সময়, সংখ্যা ও একই সময়ের রেকর্ড যাচাই করুন।" : "Check the JSON, whole-piece counts and timestamps. Intervals must not overlap.") : error === "SESSION_EXPIRED" ? (bn ? "সেশন শেষ। আবার সাইন ইন করতে হবে।" : "Your session could not be authorized. Sign in again before saving.") : (bn ? "সার্ভারে সংরক্ষণ সম্ভব হয়নি। আপনার ইনপুট এই ট্যাবে আছে।" : "Server draft storage is unavailable. Your input is still in this tab.")}</p>
      {error !== "DRAFT_INVALID" && <button type="button" className="btn btn-ghost" disabled={disabled || busy} onClick={() => setReload(x => x + 1)}>{error === "DRAFT_CONFLICT" ? (bn ? "নতুন সংস্করণ দেখুন" : "Review latest saved draft") : (bn ? "আবার সংযোগ করুন" : "Reconnect draft storage")}</button>}
    </div>}
  </section>;
}
