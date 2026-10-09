
import { ClipboardCheck, Download, Plus, ScanSearch, WandSparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from "react";

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
import { t, type Lang } from "@/lib/i18n";

export default function CompliancePanel({ lang }: { lang: Lang }) {
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
    void loadComplianceData();
  }, []);

  async function loadComplianceData() {
    try {
      const [templateList, assessmentList] = await Promise.all([
        listTemplates(),
        listAssessments(),
      ]);
      setTemplates(templateList);
      setTemplateCode((current) => current || templateList[0]?.code || "");
      setAssessments(assessmentList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load compliance data");
    }
  }

  async function loadItems(assessmentId: string) {
    setSelected(assessmentId);
    try {
      setItems(await getAssessmentItems(assessmentId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load assessment");
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!templateCode || !title.trim()) return;
    setBusy(true);
    setError("");

    try {
      const created = await createAssessment(templateCode, title.trim(), dueDate);
      setTitle("");
      setDueDate("");
      await loadComplianceData();
      await loadItems(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create assessment");
    } finally {
      setBusy(false);
    }
  }

  async function onAutoAssess(assessmentId: string) {
    if (busy) return;
    setBusy(true);
    setSelected(assessmentId);
    setError("");

    try {
      await autoAssessStream(assessmentId, (event) => {
        if (event.type === "verdict") setRunningRef(null);
        if (event.type === "progress" && event.ref) setRunningRef(event.ref);
      });
      await Promise.all([loadComplianceData(), loadItems(assessmentId)]);
    } catch (assessmentError) {
      setError(
        assessmentError instanceof Error ? assessmentError.message : "Auto-assessment failed",
      );
    } finally {
      setBusy(false);
      setRunningRef(null);
    }
  }

  async function onOverride(item: AssessmentItemRecord, newStatus: string) {
    try {
      const updated = await updateAssessmentItem(item.id, { status: newStatus });
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updated.id ? { ...currentItem, ...updated } : currentItem,
        ),
      );
      setAssessments(await listAssessments());
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed");
    }
  }

  async function onDraftCap(item: AssessmentItemRecord) {
    try {
      const updated = await draftCap(item.id);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updated.id ? { ...currentItem, ...updated } : currentItem,
        ),
      );
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Corrective action drafting failed");
    }
  }

  return (
    <div className="workspace-view compliance-view">
      <section className="view-intro">
        <div>
          <p className="eyebrow">{tr.evidenceFirst}</p>
          <h1>{tr.complianceCopilot}</h1>
          <p>{tr.prepareAuditCopy}</p>
        </div>
        <span className="count-badge">{assessments.length}</span>
      </section>

      <section className="section-card assessment-create-card">
        <div className="section-heading">
          <p className="eyebrow">{tr.newAuditCheck}</p>
          <h2>{tr.createAssessment}</h2>
          <p>{tr.newAuditDescription}</p>
        </div>

        <form onSubmit={onCreate} className="assessment-form">
          <label className="field-label">
            <span>{tr.templateLabel}</span>
            <select
              className="input"
              value={templateCode}
              onChange={(event) => setTemplateCode(event.target.value)}
              required
            >
              {templates.map((template) => (
                <option key={template.code} value={template.code}>
                  {template.name} · {template.item_count}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            <span>{tr.assessmentTitleLabel}</span>
            <input
              className="input"
              placeholder={tr.exampleTitle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="field-label">
            <span>{tr.dueDateLabel}</span>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || !templateCode || !title.trim()}>
            <Plus aria-hidden="true" size={16} />
            {busy ? tr.pleaseWait : tr.createAssessment}
          </button>
        </form>
      </section>

      {error ? (
        <p className="error-text global-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="compliance-layout">
        <section className="section-card assessment-list-card">
          <div className="section-heading section-heading-inline">
            <div>
              <p className="eyebrow">{tr.assessments}</p>
              <h2>{tr.workspacePulse}</h2>
            </div>
            <span className="count-badge">{assessments.length}</span>
          </div>

          {assessments.length > 0 ? (
            <div className="assessment-list">
              {assessments.map((assessment) => (
                <article
                  className={selected === assessment.id ? "assessment-card is-selected" : "assessment-card"}
                  key={assessment.id}
                >
                  <button className="assessment-open" onClick={() => void loadItems(assessment.id)}>
                    <span className="assessment-code">{assessment.template_code}</span>
                    <strong>{assessment.title}</strong>
                    <small>
                      {assessment.due_date || tr.noDueDate} · {assessment.status}
                    </small>
                  </button>
                  <div className="assessment-counts">
                    {Object.entries(assessment.counts).map(([statusKey, count]) => (
                      <span key={statusKey} className={`status-badge status-${statusClass(statusKey)}`}>
                        {statusKey} {count}
                      </span>
                    ))}
                  </div>
                  <div className="assessment-actions">
                    <button
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => void onAutoAssess(assessment.id)}
                    >
                      <ScanSearch aria-hidden="true" size={15} />
                      {tr.autoAssess}
                    </button>
                    <button
                      className="btn btn-quiet"
                      onClick={() =>
                        void downloadBinder(assessment.id).catch((downloadError) =>
                          setError(
                            downloadError instanceof Error
                              ? downloadError.message
                              : "Download failed",
                          ),
                        )
                      }
                    >
                      <Download aria-hidden="true" size={15} />
                      {tr.binder}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty-state">
              <span className="empty-index" aria-hidden="true"><ClipboardCheck size={20} /></span>
              <h3>{tr.noAssessments}</h3>
            </div>
          )}
        </section>

        <section className="section-card requirement-card">
          <div className="section-heading">
            <p className="eyebrow">{tr.requirementStatus}</p>
            <h2>{runningRef ? tr.assessing(runningRef) : tr.evidence}</h2>
            <p>{tr.selectItemHint}</p>
          </div>

          {items.length > 0 ? (
            <div className="requirement-list">
              {items.map((item) => (
                <details className="requirement-item" key={item.id}>
                  <summary>
                    <span className={`status-badge status-${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="requirement-ref">{item.ref}</span>
                    <strong>{item.title}</strong>
                    {item.manually_set ? <small>{tr.manualOverride}</small> : null}
                  </summary>
                  <div className="requirement-detail">
                    <p className="requirement-category">{item.category}</p>
                    {item.guidance ? <p>{item.guidance}</p> : null}
                    {item.ai_notes ? (
                      <div className="evidence-block">
                        <strong>{tr.aiNotes}</strong>
                        <p>{item.ai_notes}</p>
                      </div>
                    ) : null}
                    {item.evidence.length > 0 ? (
                      <div className="evidence-block">
                        <strong>{tr.evidence}</strong>
                        {item.evidence.map((citation, index) => (
                          <article className="citation-card" key={`${citation.document_id}-${index}`}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <strong>{citation.document_name}</strong>
                              <small>
                                p.{citation.page} · {citation.snippet.slice(0, 180)}
                              </small>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                    {item.cap_text ? <pre className="cap-copy">{item.cap_text}</pre> : null}
                    <div className="requirement-actions">
                      <label className="field-label compact-field">
                        <span>{tr.requirementStatus}</span>
                        <select
                          className="input"
                          value={item.status}
                          onChange={(event) => void onOverride(item, event.target.value)}
                        >
                          {ITEM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="btn btn-secondary" onClick={() => void onDraftCap(item)}>
                        <WandSparkles aria-hidden="true" size={15} />
                        {tr.draftCap}
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty-state">
              <span className="empty-index" aria-hidden="true"><ClipboardCheck size={20} /></span>
              <p>{tr.selectItemHint}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  if (status === "compliant" || status === "ready" || status === "complete") return "ready";
  if (status === "gap" || status === "failed") return "failed";
  if (status === "unknown") return "unknown";
  return "processing";
}
