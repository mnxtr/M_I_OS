import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPortal, isPortalSection, resolvePortalHost, PORTAL_SECTIONS, PORTALS } from "@/lib/portals/catalog";
import { PortalSectionPage } from "@/components/portals/PortalExperience";

type Props = { params: Promise<{ portal: string; section: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return PORTALS.flatMap(({ slug }) => PORTAL_SECTIONS.map((section) => ({ portal: slug, section })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { portal: slug, section } = await params;
  const portal = getPortal(slug);
  if (!portal || !isPortalSection(section)) return {};
  return {
    title: `${section === "demo" ? "Explore" : section.charAt(0).toUpperCase() + section.slice(1)} · Linora ${portal.name}`,
    description: `Explore ${portal.name} on Linora MIOS: ${portal.description}`,
  };
}

export default async function PortalInfoPage({ params }: Props) {
  const { portal: slug, section } = await params;
  const portal = getPortal(slug);
  if (!portal || !isPortalSection(section)) notFound();
  const vanity = resolvePortalHost((await headers()).get("host"), process.env.LINORA_ROOT_DOMAIN) === portal.slug;
  return <PortalSectionPage portal={portal} section={section} vanity={vanity}/>;
}
