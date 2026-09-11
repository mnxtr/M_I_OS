"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import LangToggle from "@/components/LangToggle";
import {
  askStream,
  DocumentRecord,
  fetchDashboard,
  fetchDocuments,
  fetchUsage,
  listTables,
  QueryResult,
  runQuery,
  signOut,
  TableInfo,
  uploadDocument,
  UsageInfo,
} from "@/lib/api";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

import AnalyticsPanel from "./AnalyticsPanel";
import ChatPanel, { ChatMessage } from "./ChatPanel";
import CompliancePanel from "./CompliancePanel";
import DashboardOverview, { WorkspaceView } from "./DashboardOverview";
import KnowledgePanel from "./KnowledgePanel";

const NAV_ITEMS: { id: WorkspaceView; index: string }[] = [
  { id: "overview", index: "01" },
  { id: "chat", index: "02" },
  { id: "compliance", index: "03" },
  { id: "analytics", index: "04" },
  { id: "knowledge", index: "05" },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const tr = t(lang);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(() => defaultDashboardFilters());
  const [dashboardBusy, setDashboardBusy] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [analyticsQuery, setAnalyticsQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const dashboardRequest = useRef(0);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const refreshWorkspace = useCallback(async (filters: DashboardFilters) => {
    const requestId = ++dashboardRequest.current;
    setDashboardBusy(true);
    setDashboardError("");
    const [documentsResult, tablesResult, usageResult, dashboardResult] = await Promise.allSettled([
      fetchDocuments(),
      listTables(),
      fetchUsage(),
      fetchDashboard(filters),
    ]);

    if (documentsResult.status === "fulfilled") setDocuments(documentsResult.value);
    if (tablesResult.status === "fulfilled") setTables(tablesResult.value);
    if (usageResult.status === "fulfilled") setUsage(usageResult.value);
    const failed = [documentsResult, tablesResult, usageResult].find((result) => result.status === "rejected");
    if (failed?.status === "rejected") {
      setError(failed.reason instanceof Error ? failed.reason.message : "Workspace data unavailable");
    }
    if (requestId === dashboardRequest.current) {
      if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
      else setDashboardError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard unavailable");
      setDashboardBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspace(defaultDashboardFilters());
    return () => { dashboardRequest.current += 1; };
  }, [refreshWorkspace]);

  async function refreshDashboard(filters: DashboardFilters = dashboardFilters) {
    const requestId = ++dashboardRequest.current;
    setDashboardBusy(true);
    setDashboardError("");
    try {
      const snapshot = await fetchDashboard(filters);
      if (requestId === dashboardRequest.current) setDashboard(snapshot);
    } catch (dashboardFetchError) {
      if (requestId !== dashboardRequest.current) return;
      setDashboardError(
        dashboardFetchError instanceof Error ? dashboardFetchError.message : "Dashboard unavailable",
      );
    } finally {
      if (requestId === dashboardRequest.current) setDashboardBusy(false);
    }
  }

  function updateDashboardFilters(filters: DashboardFilters) {
    setDashboardFilters(filters);
    void refreshDashboard(filters);
  }

  async function onUpload(file: File) {
    setError("");
    setUploadBusy(true);

    try {
      await uploadDocument(file);
      await refreshWorkspace(dashboardFilters);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploadBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || chatBusy) return;

    setError("");
    setQuestion("");
    setMessages((current) => [
      ...current,
      { role: "user", text: nextQuestion },
      { role: "assistant", text: "", citations: [], streaming: true },
    ]);
    setChatBusy(true);

    try {
      await askStream(nextQuestion, {
        onMetadata: (metadata) =>
          setMessages((current) => updateLastAssistant(current, { metadata })),
        onCitations: (citations) =>
          setMessages((current) => updateLastAssistant(current, { citations })),
        onWarning: (warning) =>
          setMessages((current) => {
            const lastMessage = current[current.length - 1];
            return updateLastAssistant(current, {
              warnings: [...(lastMessage?.warnings ?? []), warning],
            });
          }),
        onToken: (token) =>
          setMessages((current) => {
            const lastMessage = current[current.length - 1];
            return updateLastAssistant(current, { text: `${lastMessage?.text ?? ""}${token}` });
          }),
      });
      setMessages((current) => updateLastAssistant(current, { streaming: false }));
      void fetchUsage().then(setUsage).catch(() => undefined);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Query failed");
      setMessages((current) => updateLastAssistant(current, { streaming: false }));
    } finally {
      setChatBusy(false);
    }
  }

  async function onAnalytics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = analyticsQuery.trim();
    if (!nextQuery || analyticsBusy) return;

    setAnalyticsBusy(true);
    setError("");
    try {
      setQueryResult(await runQuery(nextQuery));
      void fetchUsage().then(setUsage).catch(() => undefined);
    } catch (analyticsError) {
      setError(analyticsError instanceof Error ? analyticsError.message : "Analytics failed");
    } finally {
      setAnalyticsBusy(false);
    }
  }

  function navigate(view: WorkspaceView) {
    setError("");
    setActiveView(view);
  }

  async function logout() {
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign out failed. Please retry.");
    }
  }

  const pageMeta = getPageMeta(activeView, tr);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace-content">Skip to workspace</a>
      <input
        id="workspace-upload"
        aria-label={tr.uploadDoc}
        ref={fileInput}
        type="file"
        accept=".pdf,.txt,.md,.docx,.xlsx,.csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
        }}
      />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <div>
            <strong>{tr.appName}</strong>
            <span>Manufacturing OS</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => (
            <button
              className={activeView === item.id ? "nav-item is-active" : "nav-item"}
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={activeView === item.id ? "page" : undefined}
            >
              <span aria-hidden="true">{item.index}</span>
              {navLabel(item.id, tr)}
            </button>
          ))}
        </nav>

        <div className="factory-card">
          <span className="factory-monogram" aria-hidden="true">
            DF
          </span>
          <div>
            <strong>{dashboard?.context.factory.name || tr.factoryLabel}</strong>
            <span>
              <i className="status-dot" /> {dashboard?.seeded_demo ? tr.seededData : dashboard ? tr.operational : tr.workspace}
            </span>
          </div>
        </div>
      </aside>

      <div className="app-stage">
        <header className="topbar">
          <div className="topbar-title">
            <span>{pageMeta.eyebrow}</span>
            <strong>{pageMeta.title}</strong>
          </div>
          <div className="topbar-actions">
            {usage ? <UsageSummary usage={usage} /> : null}
            <LangToggle lang={lang} onChange={setLang} />
            <button className="btn btn-quiet" onClick={() => void logout()}>
              {tr.signOut}
            </button>
          </div>
        </header>

        {error && activeView !== "chat" && activeView !== "analytics" ? (
          <div className="global-alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="app-content" id="workspace-content" tabIndex={-1}>
          {activeView === "overview" ? (
            <DashboardOverview
              dashboard={dashboard}
              filters={dashboardFilters}
              loading={dashboardBusy}
              error={dashboardError}
              lang={lang}
              onFiltersChange={updateDashboardFilters}
              onRefresh={() => void refreshDashboard(dashboardFilters)}
              onNavigate={navigate}
            />
          ) : null}

          {activeView === "chat" ? (
            <ChatPanel
              messages={messages}
              question={question}
              busy={chatBusy}
              error={error}
              documents={documents}
              lang={lang}
              messageEndRef={messageEndRef}
              onQuestionChange={setQuestion}
              onAsk={onAsk}
              onPrompt={setQuestion}
              onClear={() => setMessages([])}
              onNavigate={navigate}
            />
          ) : null}

          {activeView === "compliance" ? <CompliancePanel lang={lang} /> : null}

          {activeView === "analytics" ? (
            <AnalyticsPanel
              tables={tables}
              query={analyticsQuery}
              result={queryResult}
              busy={analyticsBusy}
              error={error}
              lang={lang}
              onQueryChange={setAnalyticsQuery}
              onRun={onAnalytics}
              onUpload={() => fileInput.current?.click()}
            />
          ) : null}

          {activeView === "knowledge" ? (
            <KnowledgePanel
              documents={documents}
              fileInput={fileInput}
              isUploading={uploadBusy}
              lang={lang}
              onUpload={(file) => void onUpload(file)}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function defaultDashboardFilters(): DashboardFilters {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), granularity: "day" };
}

function updateLastAssistant(messages: ChatMessage[], patch: Partial<ChatMessage>): ChatMessage[] {
  if (messages.length === 0) return messages;
  const nextMessages = [...messages];
  const lastIndex = nextMessages.length - 1;
  const lastMessage = nextMessages[lastIndex];
  if (lastMessage?.role === "assistant") nextMessages[lastIndex] = { ...lastMessage, ...patch };
  return nextMessages;
}

function navLabel(view: WorkspaceView, tr: ReturnType<typeof t>): string {
  if (view === "overview") return tr.overview;
  if (view === "chat") return tr.askFactory;
  if (view === "compliance") return tr.complianceCopilot;
  if (view === "analytics") return tr.analytics;
  return tr.knowledgeBase;
}

function getPageMeta(view: WorkspaceView, tr: ReturnType<typeof t>) {
  if (view === "chat") return { eyebrow: tr.chatEyebrow, title: tr.askFactory };
  if (view === "compliance") return { eyebrow: tr.evidenceFirst, title: tr.complianceCopilot };
  if (view === "analytics") return { eyebrow: tr.analyticsEyebrow, title: tr.analytics };
  if (view === "knowledge") return { eyebrow: tr.connectSources, title: tr.knowledgeBase };
  return { eyebrow: tr.overviewEyebrow, title: tr.overview };
}

function UsageSummary({ usage }: { usage: UsageInfo }) {
  const used = usage.usage.chat_queries ?? 0;
  const limit = usage.limits.chat_queries ?? 0;

  return (
    <div className="usage-summary" title={`${usage.estimated_minutes_saved} minutes saved this month`}>
      <span>{usage.plan.name}</span>
      <strong>
        {used}/{limit < 0 ? "∞" : limit}
      </strong>
    </div>
  );
}
