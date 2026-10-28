import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPortal, resolvePortalHost, PORTALS } from "@/lib/portals/catalog";
import { PortalLanding } from "@/components/portals/PortalExperience";

type Props = { params: Promise<{ portal: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return PORTALS.map(({ slug }) => ({ portal: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { portal: slug } = await params;
  const portal = getPortal(slug);
  return portal ? {
    title: `Linora ${portal.name} | MIOS`,
    description: portal.description,
  } : {};
}

export default async function LinoraPortalPage({ params }: Props) {
  const { portal: slug } = await params;
  const portal = getPortal(slug);
  if (!portal) notFound();
  const vanity = resolvePortalHost((await headers()).get("host"), process.env.LINORA_ROOT_DOMAIN) === portal.slug;
  return <PortalLanding portal={portal} vanity={vanity}/>;
}
