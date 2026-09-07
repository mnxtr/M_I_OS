import { useRef, useState } from "react";
import { uploadDocument } from "@/lib/api";
import { Lang } from "@/lib/i18n";

export default function KnowledgeInbox({ lang, onUploaded }: { lang: Lang; onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const bn = lang === "bn";
  async function upload(files: FileList | null) {
    if (!files || running.current) return;
    running.current = true; setBusy(true); setResults([]);
    try {
      if (files.length > 10) { setResults([bn ? "একবারে সর্বোচ্চ ১০টি ফাইল।" : "Choose up to 10 files per batch."]); return; }
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024 || !/\.(pdf|txt|md|docx|xlsx|csv)$/i.test(file.name)) {
          setResults(old => [...old, `${file.name}: ${bn ? "অসমর্থিত ফাইল বা ২০ এমবি-এর বেশি" : "unsupported type or larger than 20 MiB"}`]); continue;
        }
        try {
          await uploadDocument(file);
          setResults(old => [...old, `${file.name}: ${bn ? "প্রক্রিয়াকরণের জন্য গৃহীত" : "accepted for processing"}`]);
          onUploaded();
        } catch {
          setResults(old => [...old, `${file.name}: ${bn ? "আপলোড ব্যর্থ; আবার দিন" : "upload failed; select again to retry"}`]);
        }
      }
    } finally { running.current = false; setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <section className="inbox" aria-labelledby="inbox-title" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files); }}>
    <span className="eyebrow">{bn ? "জ্ঞান ইনবক্স" : "KNOWLEDGE INBOX"}</span><h2 id="inbox-title">{bn ? "ফাইল দিন। জ্ঞান গড়ুন।" : "Drop files. Build shared knowledge."}</h2>
    <p>{bn ? "এসওপি, ম্যানুয়াল ও প্রোডাকশন শিট—একসাথে রাখুন।" : "SOPs, manuals and production sheets—one place for your team’s source material."}</p>
    <input ref={input} type="file" multiple hidden accept=".pdf,.txt,.md,.docx,.xlsx,.csv" onChange={e => void upload(e.target.files)} />
    <button className="btn" disabled={busy} onClick={() => input.current?.click()}>{busy ? (bn ? "আপলোড হচ্ছে…" : "Uploading…") : (bn ? "ফাইল বাছুন" : "Choose files")}</button>
    <p className="muted">PDF, TXT, MD, DOCX, XLSX, CSV · 20 MiB/file · 10 files/batch</p>
    <ul aria-live="polite">{results.map((result, i) => <li key={i}>{result}</li>)}</ul>
    <small>{bn ? "গৃহীত মানেই অনুসন্ধানের জন্য প্রস্তুত নয়। অবস্থা দেখুন।" : "Accepted is not the same as searchable. Check processing status below. React handles the inbox; the backend parses and indexes files."}</small>
  </section>;
}
