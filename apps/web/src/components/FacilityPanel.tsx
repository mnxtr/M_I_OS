import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Facility { id: string; name: string; code: string; timezone: string; industry: string }
export default function FacilityPanel() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    if (!supabase) { setState("unconfigured"); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    supabase.from("factories").select("id,name,code,timezone,industry").order("name").limit(100)
      .abortSignal(controller.signal)
      .then(({data, error}) => { clearTimeout(timeout); if (active) { setFacilities(error ? [] : data ?? []); setState(error ? "error" : "ready"); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);
  return <section className="panel"><span className="eyebrow">FACILITY ROLLOUT</span><h2>Your connected facilities</h2>
    <p className="muted">Read-only facility directory. Supabase enforces organization membership. This does not switch the document workspace or deploy a new facility.</p>
    {state === "loading" && <p role="status">Loading facilities…</p>}
    {state === "unconfigured" && <p>Configure Supabase sign-in to see your authorized facilities.</p>}
    {state === "error" && <p role="alert">Facility access unavailable. Check your membership and Data API grants.</p>}
    {state === "ready" && facilities.length === 0 && <p>No accessible facilities. An administrator must provision organization membership and factory records.</p>}
    <ul>{facilities.map(f => <li key={f.id}><strong>{f.name}</strong> · {f.code} · {f.industry} · {f.timezone}</li>)}</ul>
    <h3>Pilot deployment checklist</h3><ol><li>Confirm factory sponsor and floor champion.</li><li>Provision organization and factory access.</li><li>Map line codes, shifts, target units and source files.</li><li>Run a baseline week before evaluating improvements.</li></ol>
  </section>;
}
