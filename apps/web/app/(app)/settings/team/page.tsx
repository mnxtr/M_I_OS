import type { Metadata } from "next";
import { requireClaims } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { TeamManager } from "@/components/settings/TeamManager";
import { listTeam } from "./actions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const [{ t }, claims, members] = await Promise.all([getServerT(), requireClaims(), listTeam()]);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t.settings.team.title}</h2>
        <p className="mt-1 text-sm text-muted">{t.settings.team.subtitle}</p>
      </div>
      <TeamManager members={members} currentUserId={claims.userId} currentRole={claims.role} />
    </div>
  );
}
