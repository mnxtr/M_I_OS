"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Play, FileArchive, Sparkles, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  ITEM_STATUSES,
  type AssessmentInfo,
  type AssessmentItemRecord,
  type AutoAssessFrame,
  type ItemStatus,
} from "@mios/shared";
import { autoAssessCompliance, draftComplianceCap, updateComplianceItem } from "@/lib/compliance/client";
import { sseFrames } from "@/lib/api/sse";
import { ApiError } from "@/lib/api/fetcher";
import { useT } from "@/lib/i18n/useT";
import { citationHref } from "@/lib/citation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Panel, PanelTitle, ErrorBanner, Muted, Badge } from "@/components/ui/panel";
import { Progress, Tooltip } from "@/components/ui/primitives";
import { StatusPill } from "./StatusPill";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function AssessmentWorkspace({
  assessment,
  initialItems,
}: {
  assessment: AssessmentInfo;
  initialItems: AssessmentItemRecord[];
}) {
  const { t } = useT();
  const router = useRouter();

  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [runningRef, setRunningRef] = useState<string | null>(null);
  const [assessed, setAssessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [binderBusy, setBinderBusy] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, AssessmentItemRecord[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [items]);

  const patchItem = useCallback((id: string, update: Partial<AssessmentItemRecord>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }, []);

  async function onAutoAssess() {
    if (running) return;
    setRunning(true);
    setError("");
    setAssessed(0);
    setTotal(0);
    try {
      const response = await autoAssessCompliance(assessment.id);

      for await (const frame of sseFrames<AutoAssessFrame>(response)) {
        if (frame.type === "start") {
          setTotal(frame.total);
        } else if (frame.type === "progress") {
          setRunningRef(frame.ref);
        } else if (frame.type === "verdict") {
          setRunningRef(null);
          setAssessed((count) => count + 1);
          // Rows update live so a long run shows real progress, not a spinner.
          setItems((current) =>
            current.map((item) =>
              item.ref === frame.ref ? { ...item, status: frame.status } : item,
            ),
          );
        } else if (frame.type === "error") {
          toast.error(`${frame.ref}: ${frame.detail}`);
        } else if (frame.type === "done") {
          setRunningRef(null);
        }
      }
      // Pull the authoritative rows (evidence + notes are not streamed).
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    } finally {
      setRunning(false);
      setRunningRef(null);
    }
  }

  async function onStatusChange(item: AssessmentItemRecord, status: ItemStatus) {
    try {
      const updated = await updateComplianceItem(item.id, { status });
      // The API preserves evidence but does not return it on PATCH — keep what we have.
      patchItem(item.id, {
        status: updated.status,
        manually_set: updated.manually_set,
        cap_text: updated.cap_text,
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    }
  }

  async function onClearOverride(item: AssessmentItemRecord) {
    try {
      const updated = await updateComplianceItem(item.id, { manually_set: false });
      patchItem(item.id, { manually_set: updated.manually_set });
      toast.success(t.compliance.clearOverride);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    }
  }

  async function onDraftCap(item: AssessmentItemRecord) {
    try {
      const updated = await draftComplianceCap(item.id);
      patchItem(item.id, { cap_text: updated.cap_text });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    }
  }

  async function onSaveCap(item: AssessmentItemRecord, text: string) {
    try {
      await updateComplianceItem(item.id, { cap_text: text });
      patchItem(item.id, { cap_text: text });
      toast.success(t.common.saved);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    }
  }

  async function onBinder() {
    setBinderBusy(true);
    try {
      // The authenticated route returns a portable Markdown evidence binder.
      window.location.href = `/api/binder/${assessment.id}`;
    } finally {
      setTimeout(() => setBinderBusy(false), 2000);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid gap-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <PanelTitle>{t.compliance.itemsTitle}</PanelTitle>
              <Muted className="mt-0.5 text-xs">{t.compliance.humanInLoop}</Muted>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onAutoAssess} disabled={running}>
                <Play className="size-4" />
                {running ? t.compliance.assessing : t.compliance.autoAssess}
              </Button>
              <Button variant="ghost" onClick={onBinder} disabled={binderBusy}>
                <FileArchive className="size-4" />
                {binderBusy ? t.compliance.preparingBinder : t.compliance.binder}
              </Button>
            </div>
          </div>

          {running ? (
            <div className="mt-4 grid gap-1.5">
              <Progress value={assessed} max={Math.max(total, 1)} label={t.compliance.assessing} />
              <Muted className="text-xs">
                {runningRef
                  ? t.compliance.assessingItem(runningRef)
                  : t.compliance.assessedOf(assessed, Math.max(total, assessed))}
              </Muted>
            </div>
          ) : null}

          <ErrorBanner className="mt-4">{error}</ErrorBanner>
        </Panel>

        {grouped.map(([category, categoryItems]) => (
          <Panel key={category}>
            <PanelTitle className="text-sm uppercase tracking-wide text-muted">
              {category}
            </PanelTitle>
            <ul className="mt-3 divide-y divide-border">
              {categoryItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "flex w-full flex-wrap items-center gap-3 py-3 text-left",
                      selectedId === item.id && "text-fg",
                    )}
                  >
                    <span className="font-mono text-xs text-muted">{item.ref}</span>
                    <span className="min-w-0 flex-1 text-sm text-fg">{item.title}</span>
                    {item.manually_set ? (
                      <Tooltip content={t.compliance.manuallySetNote}>
                        <span className="text-muted">
                          <Lock className="size-3.5" />
                        </span>
                      </Tooltip>
                    ) : null}
                    {item.evidence.length > 0 ? (
                      <Badge tone="neutral">{item.evidence.length}</Badge>
                    ) : null}
                    <StatusPill status={item.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        {selected ? (
          <EvidencePanel
            key={selected.id}
            item={selected}
            onStatusChange={onStatusChange}
            onClearOverride={onClearOverride}
            onDraftCap={onDraftCap}
            onSaveCap={onSaveCap}
          />
        ) : (
          <Panel>
            <Muted>{t.compliance.selectItem}</Muted>
          </Panel>
        )}
      </div>
    </div>
  );
}

function EvidencePanel({
  item,
  onStatusChange,
  onClearOverride,
  onDraftCap,
  onSaveCap,
}: {
  item: AssessmentItemRecord;
  onStatusChange: (item: AssessmentItemRecord, status: ItemStatus) => Promise<void>;
  onClearOverride: (item: AssessmentItemRecord) => Promise<void>;
  onDraftCap: (item: AssessmentItemRecord) => Promise<void>;
  onSaveCap: (item: AssessmentItemRecord, text: string) => Promise<void>;
}) {
  const { t } = useT();
  const [cap, setCap] = useState(item.cap_text);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keyed on item.id by the parent, so this state resets when the selection changes.

  return (
    <Panel className="grid gap-4">
      <div>
        <p className="font-mono text-xs text-muted">{item.ref}</p>
        <PanelTitle className="mt-1">{item.title}</PanelTitle>
        {item.guidance ? <Muted className="mt-2 text-xs">{item.guidance}</Muted> : null}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`status-${item.id}`} className="text-xs uppercase tracking-wide text-muted">
          {t.compliance.itemStatus}
        </label>
        <Select
          id={`status-${item.id}`}
          value={item.status}
          onChange={(event) => void onStatusChange(item, event.target.value as ItemStatus)}
        >
          {ITEM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t.compliance.statuses[status]}
            </option>
          ))}
        </Select>
        {item.manually_set ? (
          <div className="mt-1 grid gap-1.5">
            <p className="text-xs text-warn">{t.compliance.manuallySetNote}</p>
            <Button variant="ghost" size="sm" onClick={() => void onClearOverride(item)}>
              <Unlock className="size-3.5" />
              {t.compliance.clearOverride}
            </Button>
          </div>
        ) : null}
      </div>

      {item.ai_notes ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t.compliance.aiNotes}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {item.ai_notes}
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-wide text-muted">{t.compliance.evidence}</p>
        {item.evidence.length === 0 ? (
          <Muted className="mt-1 text-xs">{t.compliance.noEvidence}</Muted>
        ) : (
          <ul className="mt-2 grid gap-2">
            {item.evidence.map((citation, index) => (
              <li
                key={`${citation.document_id}-${citation.chunk_index}-${index}`}
                className="rounded-md border border-border bg-bg p-2.5"
              >
                <Link
                  href={citationHref(citation)}
                  className="block truncate text-xs text-accent hover:underline"
                  title={citation.document_name}
                >
                  {citation.document_name} · {t.ask.pageLabel(citation.page)}
                </Link>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs text-muted">
                  {citation.snippet}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <p className="text-xs uppercase tracking-wide text-muted">{t.compliance.cap}</p>
        <Textarea
          rows={7}
          value={cap}
          onChange={(event) => setCap(event.target.value)}
          placeholder={t.compliance.capPlaceholder}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={drafting}
            onClick={async () => {
              setDrafting(true);
              await onDraftCap(item);
              setDrafting(false);
            }}
          >
            <Sparkles className="size-3.5" />
            {drafting ? t.compliance.draftingCap : t.compliance.draftCap}
          </Button>
          <Button
            size="sm"
            disabled={saving || cap === item.cap_text}
            onClick={async () => {
              setSaving(true);
              await onSaveCap(item, cap);
              setSaving(false);
            }}
          >
            {saving ? t.common.saving : t.compliance.saveCap}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
