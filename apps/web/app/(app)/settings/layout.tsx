import Link from "next/link";
import { requireClaims } from "@/lib/supabase/claims";
import { getServerT } from "@/lib/i18n";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, claims] = await Promise.all([getServerT(), requireClaims()]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">{t.settings.title}</h1>
      <SettingsNav
        role={claims.role}
        showAuditLog={process.env.NEXT_PUBLIC_FEATURE_AUDIT_LOG === "true"}
      />
      <div className="mt-5">{children}</div>
      <p className="mt-8 text-xs text-muted">
        <Link href="/dashboard" className="hover:text-fg">
          {t.nav.dashboard}
        </Link>
      </p>
    </div>
  );
}
