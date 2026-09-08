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
    <nav aria-label={t.a11y.mainNavigation} className="flex gap-1 lg:flex-col">
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
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-panel-raised text-accent"
                : "text-muted hover:bg-panel-raised/60 hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
