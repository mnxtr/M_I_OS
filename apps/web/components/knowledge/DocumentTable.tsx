"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import type { DocumentRecord } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatInteger, formatRelative } from "@/lib/format";
import { ApiError } from "@/lib/api/fetcher";
import { Input, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { EmptyState, Muted } from "@/components/ui/panel";
import { StatusBadge } from "./StatusBadge";
import { DocumentRealtime } from "./DocumentRealtime";

export function DocumentTable({ documents }: { documents: DocumentRecord[] }) {
  const { t, lang } = useT();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const docTypes = useMemo(
    () => [...new Set(documents.map((d) => d.doc_type).filter(Boolean))].sort(),
    [documents],
  );
  const departments = useMemo(
    () => [...new Set(documents.map((d) => d.department).filter(Boolean))].sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (needle && !doc.filename.toLowerCase().includes(needle)) return false;
      if (docType && doc.doc_type !== docType) return false;
      if (department && doc.department !== department) return false;
      if (status && doc.status !== status) return false;
      return true;
    });
  }, [documents, search, docType, department, status]);

  const hasProcessing = documents.some((doc) => doc.status === "processing");

  async function onReingest(doc: DocumentRecord) {
    setPendingId(doc.id);
    try {
      const response = await fetch(`/api/documents/${doc.id}/process`, { method: "POST" });
      if (!response.ok) throw new ApiError((await response.json().catch(() => ({}))).detail || "Could not process document", response.status);
      toast.success(t.knowledge.processing);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(doc: DocumentRecord) {
    if (!window.confirm(t.knowledge.deleteConfirm(doc.filename))) return;
    setPendingId(doc.id);
    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!response.ok) throw new ApiError((await response.json().catch(() => ({}))).detail || "Could not delete document", response.status);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
    } finally {
      setPendingId(null);
    }
  }

  if (documents.length === 0) {
    return <EmptyState title={t.knowledge.emptyTitle} body={t.knowledge.emptyBody} />;
  }

  return (
    <div className="grid gap-3">
      <DocumentRealtime hasProcessing={hasProcessing} />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.knowledge.searchPlaceholder}
          aria-label={t.knowledge.searchPlaceholder}
        />
        <Select
          value={docType}
          onChange={(event) => setDocType(event.target.value)}
          aria-label={t.knowledge.type}
        >
          <option value="">{t.knowledge.allTypes}</option>
          {docTypes.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          aria-label={t.knowledge.department}
        >
          <option value="">{t.knowledge.allDepartments}</option>
          {departments.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label={t.knowledge.status}
        >
          <option value="">{t.knowledge.allStatuses}</option>
          <option value="ready">{t.knowledge.ready}</option>
          <option value="processing">{t.knowledge.processing}</option>
          <option value="failed">{t.knowledge.failed}</option>
        </Select>
      </div>

      <Muted>{t.knowledge.countLabel(filtered.length, documents.length)}</Muted>

      <TableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.knowledge.filename}</TableHead>
              <TableHead>{t.knowledge.type}</TableHead>
              <TableHead>{t.knowledge.department}</TableHead>
              <TableHead>{t.knowledge.status}</TableHead>
              <TableHead className="text-right">{t.knowledge.pageCount}</TableHead>
              <TableHead>{t.knowledge.uploaded}</TableHead>
              <TableHead className="text-right">{t.knowledge.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="max-w-[22rem]">
                  <Link
                    href={`/knowledge/${doc.id}`}
                    className="break-words text-accent hover:underline"
                  >
                    {doc.filename}
                  </Link>
                </TableCell>
                <TableCell className="text-muted">{doc.doc_type}</TableCell>
                <TableCell className="text-muted">{doc.department}</TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} error={doc.error} />
                </TableCell>
                <TableCell className="text-right text-muted">
                  {doc.page_count > 0 ? formatInteger(doc.page_count, lang) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted">
                  {formatRelative(doc.created_at, lang)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/knowledge/${doc.id}`}
                      aria-label={t.knowledge.view}
                      className="rounded p-1.5 text-muted hover:text-fg"
                    >
                      <Eye className="size-4" />
                    </Link>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      aria-label={t.knowledge.download}
                      className="rounded p-1.5 text-muted hover:text-fg"
                    >
                      <Download className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void onReingest(doc)}
                      disabled={pendingId === doc.id}
                      aria-label={t.knowledge.reingest}
                      className="rounded p-1.5 text-muted hover:text-fg disabled:opacity-40"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(doc)}
                      disabled={pendingId === doc.id}
                      aria-label={t.common.delete}
                      className="rounded p-1.5 text-muted hover:text-danger disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>

      {hasProcessing ? <Muted>{t.knowledge.processingNote}</Muted> : null}
    </div>
  );
}
