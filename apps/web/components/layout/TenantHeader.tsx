import Link from "next/link";
import type { UsageInfo, UserRole } from "@mios/shared";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { UsageMeter } from "@/components/layout/UsageMeter";
import { Activity, ChevronDown, Command } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="group flex shrink-0 items-center gap-2 text-fg">
            <span className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-panel text-sm font-bold text-accent">M</span>
            <span className="hidden text-sm font-bold tracking-[0.2em] sm:block">{t.brand.name}</span>
          </Link>
          <span className="hidden h-5 w-px bg-line md:block" />
          <span className="hidden items-center gap-2 text-xs text-muted md:flex"><span className="mios-signal-dot mios-live-dot" /> Aster Textiles <span className="text-line">/</span> Plant 1 <ChevronDown className="size-3" /></span>
          <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel/70 px-3 py-2 text-xs text-muted xl:flex"><Command className="size-3" /> Ask your factory… <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.6rem] text-accent">⌘K</kbd></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <UsageMeter usage={usage} />
          <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel/70 px-3 py-1.5 text-xs text-muted lg:flex"><Activity className="size-3 text-accent" /> Factory online</span>
          <span className="hidden max-w-[18ch] truncate text-xs text-muted md:inline" title={email}>{email} · {t.settings.team.roles[role]}</span>
          <LangToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
