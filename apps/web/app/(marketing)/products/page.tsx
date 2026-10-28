import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ChartNoAxesCombined, FileStack, Layers3, Link2,
  MessageSquareText, ScanSearch, ShieldCheck,
} from "lucide-react";
import { PRODUCTS, type ProductSlug } from "@/lib/products/catalog";

export const metadata: Metadata = {
  title: "Products — Linora Manufacturing Intelligence OS",
  description: "Explore the Linora Ask, Knowledge, Compliance, Analytics, Quality, Operations and Connect product experiences.",
};

const icons = {
  ask: MessageSquareText,
  knowledge: FileStack,
  compliance: ShieldCheck,
  analytics: ChartNoAxesCombined,
  quality: ScanSearch,
  operations: Layers3,
  connect: Link2,
} satisfies Record<ProductSlug, typeof ShieldCheck>;

export default function ProductDirectory() {
  return (
    <div className="mios-grid-surface min-h-[80vh]">
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="mios-eyebrow">LINORA / PRODUCT CONSTELLATION</p>
          <h1 className="mios-display mt-5 text-5xl font-semibold text-fg sm:text-6xl">One operating system.<br /><span className="text-accent">Seven focused lenses.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
            Explore the distinct intelligence capabilities that make up Linora.
            Each has its own identity and workflow, connected through the same authorized factory workspace.
          </p>
        </div>
        <section aria-label="Linora products" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRODUCTS.map((product, index) => {
            const Icon = icons[product.slug];
            return (
              <Link key={product.slug} href={"/products/" + product.slug}
                className="group flex min-h-[295px] flex-col rounded-2xl border border-border bg-panel/80 p-6 transition-colors hover:border-accent/50 hover:bg-panel-raised">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent"><Icon className="size-6" aria-hidden /></span>
                  <span className="font-mono text-xs text-muted">0{index + 1} / 07</span>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-accent">Linora / {product.name}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{product.tagline}</h2>
                <p className="mt-3 flex-1 text-sm leading-7 text-muted">{product.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs">
                  <span className="text-muted">{product.stage === "pilot" ? "Pilot" : "Preview"}</span>
                  <span className="inline-flex items-center gap-1 text-accent">Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
                </div>
              </Link>
            );
          })}
        </section>
        <p className="mt-8 max-w-3xl text-xs leading-6 text-muted">
          Proposed addresses such as compliance.linora.ai, ask.linora.ai and knowledge.linora.ai require separate domain ownership and DNS verification.
          Until connected, these product pages are available under the existing Linora application domain.
        </p>
      </div>
    </div>
  );
}
