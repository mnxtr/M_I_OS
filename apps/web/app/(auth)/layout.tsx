import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { LangMigration } from "@/components/layout/LangMigration";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();

  return (
    <div className="mios-grid-surface flex min-h-dvh flex-col bg-ink">
      <LangMigration />
      <header className="relative z-10 flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-fg">
          <span className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-panel text-sm font-bold text-accent">M</span>
          <span><span className="block text-sm font-bold tracking-[0.2em]">{t.brand.name}</span><span className="hidden text-[0.58rem] uppercase tracking-[0.18em] text-muted sm:block">manufacturing intelligence</span></span>
        </Link>
        <LangToggle />
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:px-6 sm:pt-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
