import Link from "next/link";
import { headers } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { LangMigration } from "@/components/layout/LangMigration";
import { CopyrightFooter } from "@/components/layout/CopyrightFooter";
import { defaultProductDomain, productFromHost, workspaceSignInUrl } from "@/lib/products/subdomains";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, requestHeaders] = await Promise.all([getServerT(), headers()]);
  const product = productFromHost(requestHeaders.get("host"), defaultProductDomain());

  return (
    <div className="min-h-dvh bg-ink">
      <LangMigration />
      <a href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2 focus:text-sm">
        {t.a11y.skipToContent}
      </a>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="group flex items-center gap-3 text-fg" aria-label={product ? "Linora " + product.name + " homepage" : "Linora homepage"}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/40 bg-panel text-sm font-bold text-accent shadow-[0_0_24px_rgb(115_246_210_/_0.12)]">
              L
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.16em]">
                LINORA{product ? <span className="font-normal tracking-normal text-muted"> / {product.name.toUpperCase()}</span> : null}
              </span>
              <span className="hidden text-[0.58rem] uppercase tracking-[0.18em] text-muted sm:block">
                {product ? product.eyebrow : "manufacturing intelligence"}
              </span>
            </span>
          </Link>
          {product ? (
            <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2" aria-label="Product information">
              <Link href="/platform" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg sm:inline-flex">Platform</Link>
              <Link href="/about" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg md:inline-flex">About</Link>
              <Link href="/trust" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg lg:inline-flex">Trust</Link>
              <Link href="/demo" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg">Explore</Link>
              {product.stage === "pilot" ? (
                <a href={workspaceSignInUrl(product.workspacePath, process.env.NEXT_PUBLIC_SITE_URL)}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 sm:text-sm">
                  Workspace <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ) : null}
              <LangToggle />
            </nav>
          ) : (
            <nav className="flex flex-wrap items-center gap-2" aria-label={t.a11y.mainNavigation}>
              <Link href="/products" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg">Products</Link>
              <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-fg sm:inline-flex">
                {t.marketing.pricingTitle}
              </Link>
              <Link href="/login" className="rounded-lg border border-accent/35 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">
                {t.common.signIn}
              </Link>
              <LangToggle />
            </nav>
          )}
        </div>
      </header>

      <main id="content">{children}</main>

      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{product ? "Linora " + product.name + " · " + product.tagline : t.marketing.footerNote}</span>
          <span className="mios-eyebrow text-[0.58rem]">LINORA / {product?.slug.toUpperCase() ?? "MIOS"}</span>
        </div>
      </footer>
      <CopyrightFooter />
    </div>
  );
}
