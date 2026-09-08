import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle, PanelDescription } from "@/components/ui/panel";

export default async function LandingPage() {
  const { t } = await getServerT();

  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="py-16 md:py-24">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-fg md:text-5xl">
          {t.marketing.heroTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">{t.marketing.heroBody}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">{t.marketing.getStarted}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/pricing">{t.marketing.pricingTitle}</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="capabilities" className="pb-8">
        <h2 id="capabilities" className="text-xl font-semibold text-fg">
          {t.marketing.capabilities}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {t.marketing.capabilityList.map((capability) => (
            <Panel key={capability.title}>
              <PanelTitle>{capability.title}</PanelTitle>
              <PanelDescription className="mt-2">{capability.body}</PanelDescription>
            </Panel>
          ))}
        </div>
      </section>

      <section className="py-12">
        <Panel className="bg-panel-raised">
          <PanelTitle>{t.ask.trySomething}</PanelTitle>
          <ul className="mt-3 grid gap-2">
            {t.ask.samples.map((sample) => (
              <li key={sample} className="text-sm text-muted">
                “{sample}”
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}
