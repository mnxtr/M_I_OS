"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TemplateInfo } from "@mios/shared";
import { createComplianceAssessment } from "@/lib/compliance/client";
import { ApiError } from "@/lib/api/fetcher";
import { useT } from "@/lib/i18n/useT";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Panel, PanelTitle, ErrorBanner } from "@/components/ui/panel";

export function CreateAssessmentForm({ templates }: { templates: TemplateInfo[] }) {
  const { t } = useT();
  const router = useRouter();
  const [templateCode, setTemplateCode] = useState(templates[0]?.code ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!templateCode || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createComplianceAssessment({ template_code: templateCode, title: title.trim(), due_date: dueDate });
      setTitle("");
      setDueDate("");
      toast.success(created.title);
      router.push(`/compliance/${created.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle>{t.compliance.newCheck}</PanelTitle>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="template">{t.compliance.template}</Label>
            <Select
              id="template"
              value={templateCode}
              onChange={(event) => setTemplateCode(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.code} value={template.code}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="title">{t.compliance.checkTitle}</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.compliance.titleExample}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="due">{t.compliance.dueDate}</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <div>
          <Button type="submit" disabled={busy || !title.trim() || !templateCode}>
            {busy ? t.compliance.creating : t.compliance.create}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
