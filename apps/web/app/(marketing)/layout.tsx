import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { LangMigration } from "@/components/layout/LangMigration";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();

  return (
    <div className="min-h-dvh bg-ink">
      <LangMigration />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.a11y.skipToContent}
      </a>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="group flex items-center gap-3 text-fg">
            <span className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-panel text-sm font-bold text-accent shadow-[0_0_24px_rgb(115_246_210_/_0.12)]">
              M
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.2em]">{t.brand.name}</span>
              <span className="hidden text-[0.58rem] uppercase tracking-[0.18em] text-muted sm:block">
                manufacturing intelligence
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label={t.a11y.mainNavigation}>
            <Link href="/pricing" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg">
              {t.marketing.pricingTitle}
            </Link>
            <Link href="/login" className="rounded-lg border border-accent/35 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">
              {t.common.signIn}
            </Link>
            <LangToggle />
          </nav>
        </div>
      </header>

      <main id="content">{children}</main>

      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{t.marketing.footerNote}</span>
          <span className="mios-eyebrow text-[0.58rem]">{t.brand.name} / 01</span>
        </div>
      </footer>
    </div>
  );
}
