import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const { t } = await getServerT();
  return <EmptyState title={t.settings.auditLog.title} body={t.settings.auditLog.notEnabled} />;
}
