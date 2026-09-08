import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { LangMigration } from "@/components/layout/LangMigration";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();

  return (
    <div className="min-h-dvh">
      <LangMigration />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.a11y.skipToContent}
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-fg">
            {t.brand.name}
          </Link>
          <nav className="flex items-center gap-3" aria-label={t.a11y.mainNavigation}>
            <Link href="/pricing" className="text-sm text-muted hover:text-fg">
              {t.marketing.pricingTitle}
            </Link>
            <Link href="/login" className="text-sm text-muted hover:text-fg">
              {t.common.signIn}
            </Link>
            <LangToggle />
          </nav>
        </div>
      </header>

      <main id="content">{children}</main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted">
          {t.marketing.footerNote} · {t.brand.name}
        </div>
      </footer>
    </div>
  );
}
