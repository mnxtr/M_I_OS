import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, Boxes, ChartNoAxesCombined, CheckCheck,
  CircleHelp, ClipboardList, FileStack, Fingerprint, Layers, Link2, LockKeyhole,
  MessagesSquare, ScanSearch, ShieldCheck, Sparkles, Workflow,
} from "lucide-react";
import type { ProductDefinition, ProductSection, ProductSlug } from "@/lib/products/catalog";
import { PRODUCTS } from "@/lib/products/catalog";
import { workspaceSignInUrl } from "@/lib/products/subdomains";

const ProductIcons = {
  ask: MessagesSquare, knowledge: FileStack, compliance: ShieldCheck,
  analytics: ChartNoAxesCombined, quality: ScanSearch,
  operations: Layers, connect: Link2,
} satisfies Record<ProductSlug, typeof ShieldCheck>;

export function productSectionHref(product: ProductDefinition, section: ProductSection, branded: boolean) {
  return branded ? "/" + section : "/products/" + product.slug + "/" + section;
}

function WorkspaceCta({ product, className = "" }: { product: ProductDefinition; className?: string }) {
  if (product.stage !== "pilot") return (
    <span className={"inline-flex items-center gap-2 rounded-xl border border-border bg-panel-raised/70 px-5 py-3 text-sm font-semibold text-muted " + className}>
      Product preview · Workspace release pending
    </span>
  );
  return (
    <a href={workspaceSignInUrl(product.workspacePath, process.env.NEXT_PUBLIC_SITE_URL)}
      className={"inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:bg-accent-dark " + className}>
      Open workspace <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}

export function ProductLanding({ product, branded }: { product: ProductDefinition; branded: boolean }) {
  const Icon = ProductIcons[product.slug];
  return (
    <div className="mios-grid-surface relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-64 top-10 size-[38rem] rounded-full bg-accent/10 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 md:pt-24">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:items-center">
          <div className="space-y-6">
            <p className="mios-eyebrow flex items-center gap-2">
              <span className="mios-signal-dot" /> LINORA / {product.eyebrow}
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.13em] text-accent">
              {product.stage === "pilot" ? "Pilot capability" : "Product preview"} · Manufacturing Intelligence OS
            </p>
            <h1 className="mios-display max-w-3xl text-5xl font-semibold leading-[1.02] text-fg sm:text-6xl xl:text-7xl">
              {product.tagline}
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted sm:text-lg">{product.description}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <WorkspaceCta product={product} />
              <Link href={productSectionHref(product, "platform", branded)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-fg hover:border-accent/50">
                Explore the platform <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="max-w-xl text-xs leading-6 text-muted">{product.trustNote}</p>
          </div>

          <div className="relative isolate overflow-hidden rounded-3xl border border-accent/25 bg-panel/90 p-5 shadow-2xl shadow-black/30 sm:p-7" aria-label={"Conceptual workflow for Linora " + product.name}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(115,246,210,.09),transparent_65%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent"><Icon className="size-5" /></div>
                  <div><p className="text-sm font-bold uppercase tracking-[.15em] text-fg">LINORA / {product.name.toUpperCase()}</p><p className="mt-1 text-xs text-muted">Workflow architecture · Illustrative</p></div>
                </div>
                <span className="font-mono text-xs text-accent">0{PRODUCTS.findIndex((item) => item.slug === product.slug) + 1} / 07</span>
              </div>
              <div className="relative mt-8 space-y-4">
                {product.workflow.map((step, index) => (
                  <div key={step.title} className="group flex gap-4 rounded-2xl border border-line bg-bg/70 p-5">
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-sm font-semibold text-accent">0{index + 1}</span>
                      {index < product.workflow.length - 1 ? <span aria-hidden className="h-6 w-px bg-accent/30" /> : null}
                    </div>
                    <div className="min-w-0"><h2 className="font-semibold text-fg">{step.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{step.body}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5 text-xs text-muted">
                <ShieldCheck className="size-4 text-accent" aria-hidden />
                Architecture concept · No real customer data shown
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="mt-24 border-t border-line pt-10 md:mt-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="mios-eyebrow">Product framework</p><h2 className="mios-display mt-3 text-3xl font-semibold text-fg sm:text-4xl">Built around the evidence.</h2></div>
            <Link href={productSectionHref(product, "platform", branded)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">See capabilities <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {product.pillars.map((pillar, index) => (
              <article key={pillar.title} className="rounded-2xl border border-border bg-panel/80 p-6 transition-colors hover:border-accent/40">
                <div className="flex items-center justify-between text-accent"><span className="font-mono text-xs">0{index + 1} / CAPABILITY</span><Workflow className="size-4" aria-hidden /></div>
                <h3 className="mt-7 text-lg font-semibold text-fg">{pillar.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 rounded-3xl border border-accent/20 bg-panel/70 p-6 md:grid-cols-[.9fr_1.1fr] md:items-center md:p-9">
          <div><p className="mios-eyebrow">For your team</p><h2 className="mios-display mt-3 text-3xl font-semibold text-fg">{product.promise}</h2><p className="mt-4 text-sm leading-7 text-muted">Designed for {product.audience.toLowerCase()}.</p></div>
          <div className="grid gap-3">
            {product.useCases.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-bg/65 px-5 py-4 text-sm text-fg">
                <CheckCheck className="size-4 shrink-0 text-accent" aria-hidden /> {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-4 border-t border-line pt-9 sm:grid-cols-2">
          <Link href={productSectionHref(product, "trust", branded)} className="group flex items-start gap-4 rounded-2xl border border-border bg-panel/50 p-6 hover:border-accent/40">
            <LockKeyhole className="size-6 shrink-0 text-accent" aria-hidden />
            <span><span className="block font-semibold text-fg">Trust & safeguards</span><span className="mt-2 block text-sm leading-6 text-muted">Learn where evidence, privacy and human oversight enter the product.</span><span className="mt-3 inline-flex items-center gap-1 text-sm text-accent">Read our approach <ArrowRight className="size-4" /></span></span>
          </Link>
          <Link href={productSectionHref(product, "demo", branded)} className="group flex items-start gap-4 rounded-2xl border border-border bg-panel/50 p-6 hover:border-accent/40">
            <CircleHelp className="size-6 shrink-0 text-accent" aria-hidden />
            <span><span className="block font-semibold text-fg">Explore the experience</span><span className="mt-2 block text-sm leading-6 text-muted">Understand the product workflow and available workspace access.</span><span className="mt-3 inline-flex items-center gap-1 text-sm text-accent">Explore options <ArrowRight className="size-4" /></span></span>
          </Link>
        </section>
      </div>
    </div>
  );
}

export function ProductDetail({ product, section, branded }: { product: ProductDefinition; section: ProductSection; branded: boolean }) {
  const heading = {
    about: "A focused product. One Linora mission.",
    platform: "The workflow behind the promise.",
    trust: "Trust is built into the review process.",
    demo: "Explore before you adopt.",
  }[section];
  const intro = {
    about: product.description + " It belongs to a connected manufacturing intelligence platform, with separate product experiences and one canonical authorized factory workspace.",
    platform: product.promise + " These are the capabilities and workflows designed for the product, not a guarantee that every feature is operational in production.",
    trust: product.trustNote + " Linora must verify tenant boundaries, data retention and authorized human decisions before accepting confidential factory records.",
    demo: "Follow a representative workflow, read the implementation boundaries and open the existing workspace when the feature is available. A guided sales-demo request service has not yet been connected.",
  }[section];
  return (
    <div className="mios-grid-surface min-h-[65vh]">
      <div className="relative z-10 mx-auto max-w-6xl space-y-10 px-5 py-16 sm:px-8 sm:py-24">
        <Link href={branded ? "/" : "/products/" + product.slug}
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <ArrowRight className="size-4 rotate-180" /> Back to Linora {product.name}
        </Link>
        <header className="max-w-4xl">
          <p className="mios-eyebrow">LINORA / {product.slug.toUpperCase()} / {section.toUpperCase()}</p>
          <h1 className="mios-display mt-5 text-4xl font-semibold text-fg sm:text-6xl">{heading}</h1>
          <p className="mt-6 text-base leading-8 text-muted sm:text-lg">{intro}</p>
        </header>
        {section === "platform" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {product.pillars.map((item, index) => (
              <article key={item.title} className="rounded-2xl border border-border bg-panel p-6">
                <span className="font-mono text-xs text-accent">0{index + 1}</span>
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        ) : section === "trust" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Fingerprint, title: "Identity", body: "A single canonical sign-in origin and verified permissions for authenticated factory workflows." },
              { icon: LockKeyhole, title: "Data boundaries", body: "RLS and role checks require real two-tenant testing. Marketing hostnames are not trusted data APIs." },
              { icon: BookOpen, title: "Human review", body: "Document evidence and responsible staff determine final decisions; an AI response is not certification." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-panel p-6">
                <item.icon className="size-6 text-accent" aria-hidden />
                <h2 className="mt-5 font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        ) : section === "demo" ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {product.workflow.map((item, index) => (
              <article key={item.title} className="rounded-2xl border border-border bg-panel p-6">
                <p className="font-mono text-xs text-accent">STEP 0{index + 1}</p>
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 rounded-3xl border border-border bg-panel/70 p-7 sm:grid-cols-2">
            <div><Boxes className="size-7 text-accent" aria-hidden /><h2 className="mt-4 text-xl font-semibold">One platform, connected context.</h2><p className="mt-3 text-sm leading-7 text-muted">Linora is designed to connect knowledge, operations and governance rather than fragmenting factory work across unrelated accounts.</p></div>
            <div><ClipboardList className="size-7 text-accent" aria-hidden /><h2 className="mt-4 text-xl font-semibold">For the people making decisions.</h2><p className="mt-3 text-sm leading-7 text-muted">Intended for {product.audience.toLowerCase()}, with separate safeguards for critical data and human review.</p></div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-6">
          <Sparkles className="size-5 text-accent" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted">Stage: {product.stage === "pilot" ? "Pilot workspace" : "Preview / roadmap"}. Public overview is not a certification or production-readiness claim.</p>
          <WorkspaceCta product={product} />
        </div>
      </div>
    </div>
  );
}
