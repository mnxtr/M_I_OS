import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleDot, Network } from "lucide-react";
import { PORTALS, canonicalAppOrigin } from "@/lib/portals/catalog";
import { PortalIcon } from "@/components/portals/PortalIcon";

export const metadata: Metadata = {
  title: "Linora | Manufacturing Intelligence Product Suite",
  description: "Explore the Linora MIOS product ecosystem: Compliance, Ask, Knowledge, Analytics, Quality, Integrations, Identity, Billing, and Governance.",
};

export default function PortalDirectoryPage() {
  const canonical = canonicalAppOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-[#244047]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: "linear-gradient(#345861 1px,transparent 1px),linear-gradient(90deg,#345861 1px,transparent 1px)", backgroundSize: "54px 54px", maskImage: "linear-gradient(to bottom, black,transparent)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="portal-eyebrow flex items-center gap-2"><CircleDot className="size-4" /> LINORA / PRODUCT ARCHITECTURE / 2026</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-.06em] text-[#f0f7f6] sm:text-6xl lg:text-7xl">
              Many capabilities.<br /><span className="text-[#73f6d2]">One intelligence layer.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#a6bec2]">
              A focused doorway for every decision. Explore how Linora connects evidence,
              manufacturing knowledge and accountable people across one MIOS workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a className="portal-button" href={canonical + "/dashboard"}>Open MIOS workspace <ArrowUpRight size={17}/></a>
              <a className="portal-outline" href="#products">Explore the suite <ArrowRight size={16}/></a>
            </div>
          </div>
          <div className="portal-panel relative min-h-[240px] overflow-hidden p-7">
            <div className="absolute -right-12 -top-12 size-48 rounded-full border border-[#73f6d2]/20" />
            <div className="absolute -right-5 -top-5 size-32 rounded-full border border-[#73f6d2]/30" />
            <Network className="size-9 text-[#73f6d2]" strokeWidth={1.5}/>
            <p className="mt-7 font-mono text-xs tracking-[.15em] text-[#94b2b3]">PLATFORM PRINCIPLE</p>
            <p className="mt-2 text-xl font-semibold leading-snug tracking-tight">One identity. Clear boundaries. Connected outcomes.</p>
            <p className="mt-3 text-xs leading-6 text-[#a4babc]">Each portal uses the existing MIOS application and is not a separate customer database.</p>
          </div>
        </div>
      </section>
      <section id="products" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="portal-eyebrow">Product directory / 10 modules</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Choose your intelligence layer.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#9fb6ba]">Subdomain names are proposed. These public module previews are available on the current MIOS host.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((portal, index) => (
            <Link href={`/portals/${portal.slug}`} key={portal.slug}
              className="portal-module-card group flex min-h-[255px] flex-col justify-between p-6"
              style={{ "--portal-accent": portal.accent } as React.CSSProperties}>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="grid size-12 place-items-center rounded-xl border border-[#36535a] bg-[#10272c] portal-accent"><PortalIcon slug={portal.slug} /></div>
                  <span className="font-mono text-xs text-[#7e9ca2]">{String(index+1).padStart(2, "0")} / 10</span>
                </div>
                <p className="mt-5 portal-eyebrow">{portal.category}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{portal.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#a1b9bd]">{portal.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-[#274148] pt-4 text-xs">
                <span className="portal-status">{portal.stage === "existing" ? "Existing workspace" : portal.stage === "review" ? "Review underway" : "Planned capability"}</span>
                <ArrowUpRight className="size-4 portal-accent transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
