import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Database, FileCheck2, MessageSquareText, ShieldCheck } from "lucide-react";
import { getServerT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle, PanelDescription } from "@/components/ui/panel";

export default async function LandingPage() {
  const { t } = await getServerT();

  return (
    <div className="mios-grid-surface min-h-[calc(100dvh-73px)]">
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <section className="grid gap-10 py-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:py-24">
          <div>
            <div className="mios-eyebrow mb-6 flex items-center gap-2"><span className="mios-signal-dot mios-live-dot" /> factory intelligence layer / 01</div>
            <h1 className="mios-display max-w-3xl text-5xl font-semibold leading-[0.93] text-fg sm:text-6xl lg:text-7xl">
              Turn factory <span className="text-accent">signals</span> into decisions.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">{t.marketing.heroBody}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/register">{t.marketing.getStarted}<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost"><Link href="/pricing">{t.marketing.pricingTitle}</Link></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Tenant-safe by design</span>
              <span className="inline-flex items-center gap-2"><MessageSquareText className="size-4 text-accent" /> English · বাংলা · Banglish</span>
            </div>
          </div>

          <div className="relative min-h-[390px] overflow-hidden rounded-2xl border border-line bg-panel/70 shadow-2xl shadow-black/30 sm:min-h-[480px]">
            <Image src="/images/mios-factory-hero.png" alt="A textile factory floor" fill priority className="object-cover opacity-60" sizes="(max-width: 768px) 100vw, 55vw" />
            <div className="absolute inset-0 bg-gradient-to-br from-bg/85 via-bg/25 to-bg/80" />
            <div className="absolute inset-x-5 top-5 flex items-center justify-between text-xs text-muted sm:inset-x-7 sm:top-7">
              <span className="mios-eyebrow">live plant view</span>
              <span className="inline-flex items-center gap-2"><span className="mios-signal-dot mios-live-dot" /> online</span>
            </div>
            <div className="absolute inset-x-5 bottom-5 rounded-xl border border-accent/25 bg-ink/80 p-5 backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div><p className="mios-eyebrow">key signal</p><p className="mt-2 text-xl font-semibold text-fg sm:text-2xl">Line 7 is trending <span className="text-danger">8% below target</span></p></div>
                <BarChart3 className="hidden size-8 shrink-0 text-accent sm:block" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4 text-xs">
                <div><p className="text-muted">output</p><p className="mt-1 text-lg font-semibold text-fg">24,320 <span className="text-xs font-normal text-muted">m</span></p></div>
                <div><p className="text-muted">downtime</p><p className="mt-1 text-lg font-semibold text-fg">2.4 <span className="text-xs font-normal text-muted">hrs</span></p></div>
                <div><p className="text-muted">quality</p><p className="mt-1 text-lg font-semibold text-accent">98.2%</p></div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 border-y border-line py-5 sm:grid-cols-3">
          {[
            [Database, "Knowledge core", "SOPs, manuals, audit files"],
            [BarChart3, "Production intelligence", "Signals your team can act on"],
            [FileCheck2, "Compliance copilot", "Evidence without the hunt"],
          ].map(([Icon, title, body]) => {
            const FeatureIcon = Icon as typeof Database;
            return <div key={String(title)} className="flex items-center gap-3"><FeatureIcon className="size-5 text-accent" /><div><p className="text-sm font-semibold text-fg">{title as string}</p><p className="text-xs text-muted">{body as string}</p></div></div>;
          })}
        </div>

      <section aria-labelledby="capabilities" className="pb-8 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mios-eyebrow">one intelligence layer</p><h2 id="capabilities" className="mios-display mt-2 text-3xl font-semibold text-fg">{t.marketing.capabilities}</h2></div><span className="text-sm text-muted">Built around the decisions your factory already makes.</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {t.marketing.capabilityList.map((capability, index) => (
            <Panel key={capability.title} className="group grid gap-4 bg-panel/70 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between"><span className="mios-eyebrow">0{index + 1}</span><ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" /></div>
              <div><PanelTitle className="text-lg">{capability.title}</PanelTitle><PanelDescription className="mt-2 max-w-md leading-6">{capability.body}</PanelDescription></div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="py-12">
        <Panel className="mios-topline grid gap-5 bg-panel/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mios-eyebrow">start with a question</p><PanelTitle className="mt-2 text-2xl">{t.ask.trySomething}</PanelTitle></div><Button asChild variant="ghost"><Link href="/register">{t.marketing.getStarted}<ArrowRight /></Link></Button></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {t.ask.samples.slice(0, 4).map((sample) => <Link key={sample} href="/register" className="rounded-lg border border-line bg-bg/60 px-4 py-3 text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg">“{sample}”</Link>)}
          </div>
        </Panel>
      </section>
      </div>
    </div>
  );
}
