"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

export function SettingsNav({
  role,
  showAuditLog,
}: {
  role: UserRole;
  showAuditLog: boolean;
}) {
  const { t } = useT();
  const pathname = usePathname();

  const items = [
    { href: "/settings/team", label: t.nav.team },
    { href: "/settings/guest-access", label: t.nav.guestAccess },
    { href: "/settings/connectors", label: t.nav.connectors },
    ...(role === "owner" ? [{ href: "/settings/billing", label: t.nav.billing }] : []),
    ...(showAuditLog ? [{ href: "/settings/audit-log", label: t.nav.auditLog }] : []),
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
            pathname === item.href
              ? "bg-panel-raised text-accent"
              : "text-muted hover:text-fg",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
