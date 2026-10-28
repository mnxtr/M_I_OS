import type { ReactNode } from "react";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { canonicalAppOrigin } from "@/lib/portals/catalog";
import "./portals.css";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const site = canonicalAppOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  return (
    <div className="linora-portal">
      <a href="#portal-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[#193237] focus:px-4 focus:py-2">
        Skip to portal content
      </a>
      <header className="sticky top-0 z-40 border-b border-[#244047] bg-[#071013]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href={site + "/portals"} aria-label="Linora MIOS product suite" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-[#73f6d2]/40 bg-[#10262a] text-lg font-black tracking-[-.08em] text-[#73f6d2]">L.</span>
            <span>
              <span className="block text-base font-bold tracking-[.20em] text-[#eaf8f4]">LINORA</span>
              <span className="block font-mono text-[.55rem] tracking-[.18em] text-[#8ea9ad]">MANUFACTURING INTELLIGENCE</span>
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-2 text-xs sm:text-sm" aria-label="Portal navigation">
            <a href={site + "/portals"} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-[#bacdd0] hover:bg-[#142b30] hover:text-white">
              <Layers3 size={15} /> Product suite
            </a>
            <a href={site + "/login"} className="flex min-h-11 items-center gap-1 rounded-lg border border-[#39585e] px-4 font-semibold text-[#eaf8f4] hover:border-[#73f6d2]">
              Sign in <ArrowUpRight size={15} />
            </a>
          </nav>
        </div>
      </header>
      <main id="portal-content">{children}</main>
      <footer className="mt-20 border-t border-[#213a40]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-9 text-xs text-[#8fa9ad] sm:px-8">
          <span>© {new Date().getUTCFullYear()} Linora · Manufacturing Intelligence OS</span>
          <span>Product information, not a claim of certification or production availability.</span>
          <a className="underline underline-offset-4 hover:text-white" href={site}>Open MIOS workspace</a>
        </div>
      </footer>
    </div>
  );
}
