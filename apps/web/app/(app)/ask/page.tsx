import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireClaims } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { FeatureTabs, TabsContent } from "@/components/navigation/FeatureTabs";
import { EmptyState } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Ask" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AskPage({ searchParams }: Props) {
  const [{ t }, params] = await Promise.all([getServerT(), searchParams, requireClaims()]);

  const supabase = await createClient();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "ready");

  const defaultTab = ["chat", "recent", "sources"].includes(params.tab ?? "") ? params.tab! : "chat";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-fg">{t.ask.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.ask.emptyBody}</p>
      </div>
      <FeatureTabs
        defaultValue={defaultTab}
        tabs={[
          { value: "chat", label: t.tabs.chat },
          { value: "recent", label: t.tabs.recentAnswers },
          { value: "sources", label: t.tabs.savedSources },
        ]}
      >
        <TabsContent value="chat">
          <ChatSurface hasDocuments={(count ?? 0) > 0} />
        </TabsContent>
        <TabsContent value="recent">
          <EmptyState title={t.tabs.recentAnswers} body={t.tabs.notYetTracked} />
        </TabsContent>
        <TabsContent value="sources">
          <EmptyState title={t.tabs.savedSources} body={t.tabs.notYetTracked} />
        </TabsContent>
      </FeatureTabs>
    </div>
  );
}
