"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, ArrowUpRight, CalendarDays, CircleCheck,
  ClipboardList, Flag, ShieldAlert, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACTION_PRIORITIES, ACTION_STATUSES, complianceActionMetrics,
  filterComplianceActions, isActionOverdue, localDateISO,
  type ActionCandidate, type ActionOwner, type ComplianceAction,
  type ActionPriority, type ActionStatus,
} from "@/lib/compliance/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorBanner, Panel } from "@/components/ui/panel";

type ActionChange = Partial<Pick<ComplianceAction, "status" | "priority" | "assigned_to" | "due_date" | "notes">>;
type Filter = "all" | "attention" | "resolved";

async function parseApiResponse(response: Response): Promise<any> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Request failed");
  return result;
}

const labels: Record<ActionStatus, string> = {
  open: "Open", in_progress: "In progress", blocked: "Blocked", resolved: "Resolved",
};
const priorityLabels: Record<ActionPriority, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
};
const prioritiesTone: Record<ActionPriority, "neutral" | "accent" | "warn" | "danger"> = {
  low: "neutral", medium: "accent", high: "warn", critical: "danger",
};
const selectStyle = "min-w-0";

export function ComplianceActionCenter({
  initialActions,
  candidates,
  owners,
  initialError,
}: {
  initialActions: ComplianceAction[];
  candidates: ActionCandidate[];
  owners: ActionOwner[];
  initialError: string;
}) {
  const [actions, setActions] = useState(initialActions);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("high");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const today = localDateISO(new Date());
  const metrics = useMemo(() => complianceActionMetrics(actions, today), [actions, today]);
  const visible = useMemo(
    () => filterComplianceActions(actions, filter, query, today),
    [actions, filter, query, today],
  );
  const eligible = candidates.filter((item) => !actions.some((action) => action.assessment_item_id === item.id));

  async function createAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCandidate || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/compliance/actions", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessment_item_id: selectedCandidate,
          priority,
          due_date: dueDate || null,
          assigned_to: assignee || null,
          notes,
        }),
      });
      const created = await parseApiResponse(response) as ComplianceAction;
      setActions((previous) => [created, ...previous]);
      setSelectedCandidate("");
      setNotes("");
      setDueDate("");
      setAssignee("");
      toast.success("Action created");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create action");
    } finally {
      setBusy(false);
    }
  }

  async function patchAction(id: string, update: ActionChange) {
    const response = await fetch("/api/compliance/actions/" + encodeURIComponent(id), {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(update),
    });
    const saved = await parseApiResponse(response) as ComplianceAction;
    setActions((current) => current.map((action) => action.id === id ? saved : action));
    return saved;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/compliance" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted hover:text-accent">
            <ArrowLeft className="size-4" /> Compliance / Action register
          </Link>
          <p className="mios-eyebrow mb-2">Executive assurance / operational follow-through</p>
          <h1 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">Compliance Action Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Give every evidence gap an owner, a deadline and a visible path to resolution.
            Closing an action does not certify that a compliance requirement is satisfied.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">
          <Sparkles className="size-4" /> Evidence-led oversight
        </div>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <section aria-label="Action register summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={<ClipboardList className="size-5" />} label="Active actions" value={metrics.active} accent="text-accent" note="Awaiting closure" />
        <MetricCard icon={<AlertTriangle className="size-5" />} label="Overdue" value={metrics.overdue} accent="text-danger" note="Requires escalation" />
        <MetricCard icon={<CalendarDays className="size-5" />} label="Due in 7 days" value={metrics.dueSoon} accent="text-warn" note="Upcoming deadlines" />
        <MetricCard icon={<CircleCheck className="size-5" />} label="Resolved actions" value={metrics.resolved} accent="text-ok" note="Not audit-certified" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Action list" className="min-w-0 space-y-4">
          <Panel className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-fg">Review queue</h2>
              <p className="text-xs text-muted">{visible.length} actions shown, {metrics.blocked} blocked across the register</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input aria-label="Search actions" placeholder="Search actions" className="w-44" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div role="group" aria-label="Filter actions" className="flex overflow-hidden rounded-lg border border-border">
                {(["all", "attention", "resolved"] as Filter[]).map((option) => (
                  <button type="button" key={option} onClick={() => setFilter(option)}
                    aria-pressed={filter === option}
                    className={"px-3 py-2 text-xs font-semibold capitalize transition " +
                      (filter === option ? "bg-accent text-ink" : "text-muted hover:bg-panel-raised hover:text-fg")}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {visible.length === 0 ? (
            <Panel><EmptyState title={actions.length ? "No matching actions" : "Action register is ready"}
              body={actions.length ? "Try another search or filter." : "Create a task from an unreviewed compliance requirement to begin tracking remediation."} /></Panel>
          ) : visible.map((action) => (
            <ActionCard key={action.id} action={action} owners={owners} today={today} onPatch={patchAction} />
          ))}
          <p className="text-xs text-muted">Showing up to 250 recent actions. Server-side pagination and activity history are planned enhancements.</p>
        </section>

        <aside className="space-y-4">
          <Panel className="border-accent/30">
            <div className="flex items-center gap-2 text-accent"><Flag className="size-5" /><h2 className="text-base font-semibold">Assign an action</h2></div>
            <p className="mt-2 text-xs leading-5 text-muted">Start with an existing tenant-scoped requirement. The item and assessment cannot be reassigned later.</p>
            <form onSubmit={createAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-requirement">Evidence gap</Label>
                <Select id="action-requirement" value={selectedCandidate} required onChange={(e) => setSelectedCandidate(e.target.value)}>
                  <option value="">Select a requirement</option>
                  {eligible.map((item) => <option key={item.id} value={item.id}>{item.ref} — {item.title}</option>)}
                </Select>
                {eligible.length === 0 ? <p className="text-xs text-muted">No unassigned requirements. Create or assess a checklist first.</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="action-priority">Priority</Label>
                  <Select id="action-priority" value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)}>
                    {ACTION_PRIORITIES.map((option) => <option key={option} value={option}>{priorityLabels[option]}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-due">Due date</Label>
                  <Input id="action-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-owner">Owner</Label>
                <Select id="action-owner" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.full_name || owner.email}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-notes">Action notes</Label>
                <Textarea id="action-notes" rows={3} maxLength={4000} placeholder="What needs to change? What evidence will confirm closure?" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !selectedCandidate || !!initialError}>
                {busy ? "Creating…" : "Create tracked action"}
              </Button>
            </form>
          </Panel>
          <Panel className="border-warn/30 bg-warn/5">
            <div className="flex items-center gap-2 text-warn"><ShieldAlert className="size-5" /><h2 className="text-sm font-semibold">Assurance boundary</h2></div>
            <p className="mt-2 text-xs leading-5 text-muted">This is an action-management register. A resolved task still requires a separate, authorized assessment of the underlying compliance requirement and its evidence.</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, accent, note }: {
  icon: React.ReactNode; label: string; value: number; accent: string; note: string;
}) {
  return (
    <Panel className="relative overflow-hidden">
      <div className={"mb-4 " + accent}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-fg">{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </Panel>
  );
}

function ActionCard({ action, owners, today, onPatch }: {
  action: ComplianceAction;
  owners: ActionOwner[];
  today: string;
  onPatch: (id: string, update: ActionChange) => Promise<ComplianceAction>;
}) {
  const [notes, setNotes] = useState(action.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const overdue = isActionOverdue(action, today);

  async function update(changes: ActionChange) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await onPatch(action.id, changes);
      setNotes(saved.notes);
      toast.success("Action updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update action");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className={"space-y-4 " + (overdue ? "border-danger/40" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={prioritiesTone[action.priority]}>{priorityLabels[action.priority]}</Badge>
            {overdue ? <Badge tone="danger">Overdue</Badge> : null}
            <Badge tone={action.status === "resolved" ? "ok" : action.status === "blocked" ? "danger" : "neutral"}>
              {labels[action.status]}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-fg">{action.title}</h3>
          <Link href={"/compliance/" + encodeURIComponent(action.assessment_id)} className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Inspect requirement and evidence <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={"status-" + action.id}>Progress</Label>
          <Select className={selectStyle} id={"status-" + action.id} disabled={busy} value={action.status}
            onChange={(e) => void update({ status: e.target.value as ActionStatus })}>
            {ACTION_STATUSES.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={"owner-" + action.id}>Responsible</Label>
          <Select className={selectStyle} id={"owner-" + action.id} disabled={busy} value={action.assigned_to ?? ""}
            onChange={(e) => void update({ assigned_to: e.target.value || null })}>
            <option value="">Unassigned</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.full_name || owner.email}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={"due-" + action.id}>Deadline</Label>
          <Input id={"due-" + action.id} type="date" disabled={busy} value={action.due_date ?? ""}
            onChange={(e) => void update({ due_date: e.target.value || null })} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor={"notes-" + action.id}>Resolution notes</Label>
          <Textarea id={"notes-" + action.id} rows={2} disabled={busy} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Record corrective measures and verification evidence" />
        </div>
        <Button variant="subtle" size="sm" disabled={busy || notes === action.notes} onClick={() => void update({ notes })}>
          Save notes
        </Button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <p className="text-xs text-muted">Action progress is separate from the assessment verdict. A resolution note is required before closing a task.</p>
    </Panel>
  );
}
