"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BarChart3,
  ClipboardCheck,
  Microscope,
  Settings,
} from "lucide-react";
import type { UserRole } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that see this entry. Cosmetic only — RLS and FastAPI do the enforcing. */
  roles?: UserRole[];
}

export function Sidebar({ role, showQuality }: { role: UserRole; showQuality: boolean }) {
  const { t } = useT();
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/ask", label: t.nav.ask, icon: MessageSquare },
    { href: "/knowledge", label: t.nav.knowledge, icon: FileText },
    {
      href: "/analytics",
      label: t.nav.analytics,
      icon: BarChart3,
      roles: ["owner", "admin", "production_manager", "compliance_manager"],
    },
    {
      href: "/compliance",
      label: t.nav.compliance,
      icon: ClipboardCheck,
      roles: ["owner", "admin", "compliance_manager"],
    },
    ...(showQuality
      ? [{ href: "/quality", label: t.nav.quality, icon: Microscope } satisfies NavItem]
      : []),
    { href: "/settings/team", label: t.nav.settings, icon: Settings },
  ];

  const visible = items.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav aria-label={t.a11y.mainNavigation} className="flex gap-1 lg:flex-col lg:gap-7">
      <div className="hidden px-3 lg:block"><p className="mios-eyebrow">workspace</p><p className="mt-2 truncate text-sm font-semibold text-fg">Aster Textiles</p><p className="mt-1 text-xs text-muted">Plant 1 · Live operations</p></div>
      <div className="hidden px-3 lg:block"><p className="mios-eyebrow">navigate</p></div>
      {visible.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/settings/team" && pathname.startsWith("/settings"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors",
              active
                ? "border-accent/20 bg-panel-raised text-accent shadow-[inset_2px_0_0_var(--color-accent)]"
                : "text-muted hover:border-line hover:bg-panel-raised/60 hover:text-fg",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-muted group-hover:text-accent")} />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
