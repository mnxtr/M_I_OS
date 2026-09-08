import type { Metadata } from "next";
import Link from "next/link";
import { requireClaims, getAccessToken } from "@/lib/supabase/claims";
import { listDocumentsServer, listTablesServer } from "@/lib/api";
import { getServerT } from "@/lib/i18n";
import { Uploader } from "@/components/knowledge/Uploader";
import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { ErrorBanner, EmptyState, Panel, PanelTitle, Muted } from "@/components/ui/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import type { DocumentRecord, TableInfo } from "@mios/shared";

export const metadata: Metadata = { title: "Knowledge base" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function KnowledgePage({ searchParams }: Props) {
  const [{ t }, params] = await Promise.all([getServerT(), searchParams, requireClaims()]);
  const token = await getAccessToken();

  let documents: DocumentRecord[] = [];
  let tables: TableInfo[] = [];
  let error = "";
  if (token) {
    const [documentResult, tableResult] = await Promise.allSettled([
      listDocumentsServer({ token }),
      listTablesServer({ token }),
    ]);
    if (documentResult.status === "fulfilled") documents = documentResult.value;
    if (tableResult.status === "fulfilled") tables = tableResult.value;
    if (documentResult.status === "rejected" || tableResult.status === "rejected") {
      error = t.common.networkError;
    }
  }

  const defaultTab = ["documents", "uploads", "tables", "failed"].includes(params.tab ?? "")
    ? params.tab!
    : "documents";
  const failedDocuments = documents.filter((doc) => doc.status === "failed");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-fg">{t.knowledge.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.knowledge.subtitle}</p>
      </div>

      <ErrorBanner className="mb-4">{error}</ErrorBanner>

      <FeatureTabs
        defaultValue={defaultTab}
        tabs={[
          { value: "documents", label: t.tabs.documents },
          { value: "uploads", label: t.tabs.uploads },
          { value: "tables", label: t.tabs.tables },
          { value: "failed", label: t.tabs.failedIngestion },
        ]}
      >
        <TabsContent value="documents">
          <DocumentTable documents={documents} />
        </TabsContent>
        <TabsContent value="uploads">
          <Uploader />
        </TabsContent>
        <TabsContent value="tables">
          <TableList tables={tables} />
        </TabsContent>
        <TabsContent value="failed">
          {failedDocuments.length > 0 ? (
            <DocumentTable documents={failedDocuments} />
          ) : (
            <EmptyState title={t.tabs.failedIngestion} body={t.tabs.notYetTracked} />
          )}
        </TabsContent>
      </FeatureTabs>
    </div>
  );
}

function TableList({ tables }: { tables: TableInfo[] }) {
  if (tables.length === 0) return <EmptyState title="Tables" body="Upload a spreadsheet to create queryable tables." />;
  return (
    <Panel>
      <PanelTitle>Queryable tables</PanelTitle>
      <TableWrapper className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sheet</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead>Columns</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table) => (
              <TableRow key={table.id}>
                <TableCell><Link href="/analytics?tab=query" className="text-accent hover:underline">{table.name}</Link></TableCell>
                <TableCell className="text-muted">{table.sheet_name || "-"}</TableCell>
                <TableCell className="text-right text-muted">{table.row_count}</TableCell>
                <TableCell><Muted className="line-clamp-2 text-xs">{table.columns.map((column) => column.name).join(", ")}</Muted></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </Panel>
  );
}
