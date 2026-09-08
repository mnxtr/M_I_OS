import Link from "next/link";
import type { UsageInfo, UserRole } from "@mios/shared";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { UsageMeter } from "@/components/layout/UsageMeter";

export async function TenantHeader({
  email,
  role,
  usage,
}: {
  email: string;
  role: UserRole;
  usage: UsageInfo | null;
}) {
  const { t } = await getServerT();

  return (
    <header className="border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href="/dashboard" className="text-base font-semibold text-fg">
          {t.brand.name}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <UsageMeter usage={usage} />
          <span className="hidden max-w-[18ch] truncate text-xs text-muted md:inline" title={email}>
            {email} · {t.settings.team.roles[role]}
          </span>
          <LangToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
