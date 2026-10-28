import {
  BookOpenText, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck,
  LayoutDashboard, MessageSquareText, Network, ShieldCheck, UsersRound, ScanSearch,
} from "lucide-react";
import type { PortalSlug } from "@/lib/portals/catalog";

const ICONS = {
  app: LayoutDashboard,
  compliance: ClipboardCheck,
  ask: MessageSquareText,
  knowledge: BookOpenText,
  analytics: ChartNoAxesCombined,
  quality: ScanSearch,
  integrations: Network,
  accounts: UsersRound,
  billing: CircleDollarSign,
  governance: ShieldCheck,
} satisfies Record<PortalSlug, typeof LayoutDashboard>;

export function PortalIcon({ slug, className = "size-6" }: { slug: PortalSlug; className?: string }) {
  const Icon = ICONS[slug];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.6} />;
}
