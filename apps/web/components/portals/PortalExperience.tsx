import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, CircleDot, Compass, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  PORTAL_SECTIONS, canonicalAppOrigin, type PortalDefinition, type PortalSection, workspaceUrl,
} from "@/lib/portals/catalog";
import { PortalIcon } from "./PortalIcon";

type Portal = PortalDefinition;

function Theme({ portal, children }: { portal: Portal; children: ReactNode }) {
  return <div style={{ "--portal-accent": portal.accent } as CSSProperties}>{children}</div>;
}

function PortalNav({ portal, current, vanity }: { portal: Portal; current?: PortalSection; vanity: boolean }) {
  const base = vanity ? "" : `/portals/${portal.slug}`;
  return (
    <nav aria-label={portal.name + " information"} className="flex flex-wrap items-center gap-1.5">
      <Link href={base || "/"} aria-current={!current ? "page" : undefined}
        className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${!current ? "bg-[#19353a] font-semibold text-white" : "text-[#a2b9bc] hover:bg-[#183036] hover:text-white"}`}>
        Overview
      </Link>
      {PORTAL_SECTIONS.map((section) => (
        <Link key={section} href={`${base}/${section}`} aria-current={current === section ? "page" : undefined}
          className={`rounded-lg px-3 py-2.5 text-sm capitalize transition-colors ${current === section ? "bg-[#19353a] font-semibold text-white" : "text-[#a2b9bc] hover:bg-[#183036] hover:text-white"}`}>
          {section === "demo" ? "Explore" : section}
        </Link>
      ))}
    </nav>
  );
}

function Intro({ portal, current, vanity }: { portal: Portal; current?: PortalSection; vanity: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#213e44] pb-6">
      <a href={canonicalAppOrigin(process.env.NEXT_PUBLIC_SITE_URL) + "/portals"} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#a1b6ba] hover:text-white"><ArrowLeft className="size-4"/> Suite directory</a>
      <PortalNav portal={portal} current={current} vanity={vanity} />
    </div>
  );
}

function PortalArtwork({ portal }: { portal: Portal }) {
  return (
    <div className="portal-radar relative flex min-h-[380px] flex-col justify-between p-6 sm:min-h-[475px] sm:p-9">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-[#c1d6d8]">
          <CircleDot className="size-3 portal-accent"/> Product system / {portal.slug.toUpperCase()}
        </div>
        <span className="portal-status">Conceptual workflow</span>
      </div>

      <div className="relative flex min-h-52 flex-1 items-center justify-center">
        <div aria-hidden="true" className="portal-curve absolute size-[235px] sm:size-[300px]" />
        <div aria-hidden="true" className="portal-curve absolute size-[160px] sm:size-[200px]" />
        <div aria-hidden="true" className="portal-curve absolute size-[95px] sm:size-[125px]" />
        <span className="absolute left-[4%] top-[22%] h-2 w-2 rounded-full bg-[var(--portal-accent)] shadow-[0_0_24px_var(--portal-accent)]" aria-hidden="true"/>
        <span className="absolute bottom-[13%] right-[17%] h-2.5 w-2.5 rounded-full bg-[var(--portal-accent)] shadow-[0_0_24px_var(--portal-accent)]" aria-hidden="true"/>
        <div className="relative z-10 grid size-[104px] place-items-center rounded-[28px] border border-[var(--portal-accent)]/50 bg-[#0b1d21] shadow-[0_0_55px_#163f41] sm:size-[138px]">
          <PortalIcon slug={portal.slug as import("@/lib/portals/catalog").PortalSlug} className="size-12 portal-accent sm:size-16" />
        </div>
        <span className="absolute bottom-5 left-1 rounded-lg border border-[#35555c] bg-[#0c1c20]/85 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[#b3cbcf]">MIOS / One platform</span>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-[#29464b] pt-5">
        {portal.journey.map((step, index) => (
          <div key={step} className="min-w-0">
            <span className="font-mono text-[10px] portal-accent">{String(index+1).padStart(2,"0")}</span>
            <p className="mt-1 break-words text-xs font-semibold text-[#d9e8e7] sm:text-sm">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalLanding({ portal, vanity = false }: { portal: Portal; vanity?: boolean }) {
  const workspace = workspaceUrl(portal.slug as import("@/lib/portals/catalog").PortalSlug, process.env.NEXT_PUBLIC_SITE_URL);
  return (
    <Theme portal={portal}>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <Intro portal={portal} vanity={vanity}/>
        <section className="grid gap-9 py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:items-center lg:gap-14 lg:py-20">
          <div>
            <p className="portal-eyebrow">{portal.category} · Linora MIOS</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.06em] sm:text-6xl lg:text-[4.4rem]">
              {portal.headline}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#acc1c5]">{portal.description}</p>
            <p className="mt-5 text-sm font-medium portal-accent">{portal.signature}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="portal-button" href={workspace}>Open {portal.name} <ArrowUpRight className="size-4"/></a>
              <Link className="portal-outline" href={vanity ? "/platform" : `/portals/${portal.slug}/platform`}>Explore capabilities <ArrowRight className="size-4"/></Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#253e44] pt-6">
              <span className="portal-status">{portal.stage === "existing" ? "Existing MIOS workspace" : portal.stage === "review" ? "Engineering review" : "Planned module"}</span>
              <span className="text-xs text-[#90aab0]">Designed for: {portal.audience}</span>
            </div>
          </div>
          <PortalArtwork portal={portal}/>
        </section>
        <section aria-labelledby="portal-what" className="pb-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="portal-eyebrow">Inside this module</p>
              <h2 id="portal-what" className="mt-2 text-3xl font-semibold tracking-tight">Built around the work.</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm portal-accent hover:underline" href={vanity ? "/platform" : `/portals/${portal.slug}/platform`}>Full platform view <ArrowUpRight size={16}/></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {portal.modules.map((module, i) => (
              <article key={module.title} className="portal-module-card min-h-[210px] p-6">
                <span className="font-mono text-[10px] uppercase tracking-wider portal-accent">Capability / {String(i+1).padStart(2,"0")}</span>
                <h3 className="mt-7 text-xl font-semibold tracking-tight">{module.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#a0b9bc]">{module.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-7 text-xs leading-6 text-[#94aaae]">
            Product information reflects existing, in-review and planned capabilities. Domain registration, SSO and production launch must be verified separately.
            {portal.slug === "compliance" ? " Linora helps prepare and organize assessments; it does not provide independent certification." : ""}
          </p>
        </section>
      </div>
    </Theme>
  );
}

function SectionHeader({ portal, label, title, description }: {
  portal: Portal; label: string; title: string; description: string;
}) {
  return (
    <div className="max-w-3xl py-12 sm:py-16">
      <p className="portal-eyebrow">{portal.name} / {label}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.055em] sm:text-6xl">{title}</h1>
      <p className="mt-6 text-base leading-8 text-[#a9c0c4]">{description}</p>
    </div>
  );
}

export function PortalSectionPage({ portal, section, vanity = false }: { portal: Portal; section: PortalSection; vanity?: boolean }) {
  const href = workspaceUrl(portal.slug as import("@/lib/portals/catalog").PortalSlug, process.env.NEXT_PUBLIC_SITE_URL);
  return (
    <Theme portal={portal}>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <Intro portal={portal} current={section} vanity={vanity}/>
        {section === "platform" ? (
          <>
            <SectionHeader portal={portal} label="Platform" title="A focused workspace. A connected system." description={portal.description}/>
            <div className="grid gap-4 md:grid-cols-3">
              {portal.modules.map((module,i) => (
                <article key={module.title} className="portal-module-card min-h-[260px] p-7">
                  <span className="portal-eyebrow">0{i+1} / Product pillar</span>
                  <h2 className="mt-8 text-2xl font-semibold tracking-tight">{module.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-[#adc3c6]">{module.description}</p>
                </article>
              ))}
            </div>
            <div className="portal-panel mt-8 p-7">
              <h2 className="text-xl font-semibold">From question to accountable action</h2>
              <ol className="mt-6 grid gap-4 sm:grid-cols-4">
                {portal.journey.map((step,i) => <li key={step} className="border-l border-[var(--portal-accent)]/40 pl-4"><span className="portal-eyebrow">{String(i+1).padStart(2,"0")}</span><p className="mt-2 font-semibold">{step}</p></li>)}
              </ol>
            </div>
          </>
        ) : null}
        {section === "about" ? (
          <>
            <SectionHeader portal={portal} label="About" title="One Linora identity. Many ways to work." description="Linora MIOS is designed as a connected manufacturing intelligence platform. Each specialist portal reflects a distinct workflow, while customer identity and records remain governed by a shared architecture."/>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="portal-panel p-8"><Compass className="size-7 portal-accent"/><h2 className="mt-6 text-2xl font-semibold">A manufacturing-first perspective</h2><p className="mt-3 text-sm leading-7 text-[#a7bdc0]">The goal is to make existing factory signals useful without forcing teams to abandon their current systems. Begin with source data; preserve context as work moves between departments.</p></div>
              <div className="portal-panel p-8"><Fingerprint className="size-7 portal-accent"/><h2 className="mt-6 text-2xl font-semibold">A connected product family</h2><p className="mt-3 text-sm leading-7 text-[#a7bdc0]">{portal.name} is one part of the MIOS suite. Portal subdomains are proposed entry points, not independently deployed applications or separate customer databases.</p></div>
            </div>
          </>
        ) : null}
        {section === "trust" ? (
          <>
            <SectionHeader portal={portal} label="Trust" title="Built for accountable use." description="Sensitive manufacturing records deserve explicit authorization, careful evidence handling and claims that can be independently verified. Product and infrastructure security are continuously reviewed."/>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {icon: LockKeyhole, title:"Factory boundaries",text:"Authorization and tenant isolation require direct negative tests through APIs, storage and privileged functions before sensitive customer rollout."},
                {icon: ShieldCheck,title:"Human review",text:"AI-generated conclusions are suggestions, not automatic legal or audit certifications; people remain accountable for approvals."},
                {icon: CheckCircle2,title:"Release discipline",text:"Preview builds and unit tests do not replace authentication journeys, deployment checks, monitoring or disaster-recovery rehearsals."}
              ].map(({icon: Icon,title,text})=>(<article key={title} className="portal-panel p-7"><Icon className="size-7 portal-accent"/><h2 className="mt-7 text-xl font-semibold">{title}</h2><p className="mt-4 text-sm leading-7 text-[#aac1c4]">{text}</p></article>))}
            </div>
            <p className="mt-7 text-sm text-[#9bb4b8]">This page describes engineering principles, not a certification or a guarantee that every control is production-verified.</p>
          </>
        ) : null}
        {section === "demo" ? (
          <>
            <SectionHeader portal={portal} label="Explore" title="See the workflow before you commit." description="A transparent, self-guided look at how this module is intended to work. This illustration uses no customer data and does not require a sales form." />
            <div className="portal-panel overflow-hidden p-7 sm:p-10">
              <p className="portal-eyebrow">Guided product walkthrough</p>
              <ol className="mt-8 grid gap-5 md:grid-cols-4">
                {portal.journey.map((step,i)=>(
                  <li key={step} className="relative rounded-xl border border-[#365159] bg-[#0c1b1e] p-5">
                    <span className="font-mono text-xs portal-accent">STEP {String(i+1).padStart(2,"0")}</span>
                    <p className="mt-8 text-xl font-semibold">{step}</p>
                    <p className="mt-3 text-xs leading-6 text-[#a6bdc2]">Explore the {step.toLowerCase()} stage in the connected {portal.name} workflow.</p>
                    {i<3?<ArrowRight aria-hidden="true" className="absolute right-4 top-4 size-4 portal-accent"/>:null}
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a className="portal-button" href={href}>Open existing MIOS workspace <ArrowUpRight size={16}/></a>
                <span className="text-sm text-[#99b4b7]">Some workflows require administrator enablement or remain in review.</span>
              </div>
            </div>
          </>
        ) : null}
        {section !== "demo" ? (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#2b454b] pt-9">
            <p className="max-w-lg text-sm text-[#afc4c6]">Continue with Linora MIOS using your existing account and the current secured application route.</p>
            <a href={href} className="portal-button">Open {portal.name} <ArrowUpRight size={16}/></a>
          </div>
        ) : null}
      </div>
    </Theme>
  );
}
