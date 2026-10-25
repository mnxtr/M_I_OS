import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n";
import { CopyrightFooter } from "@/components/layout/CopyrightFooter";

export const metadata: Metadata = {
  title: "Shared documents",
  // Belt and braces with the X-Robots-Tag header in vercel.json.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Guest portal shell.
 *
 * Deliberately has NO Supabase client, no tenant navigation and no app chrome: an auditor
 * holding a link must not be able to reach anything except the documents in its scope.
 */
export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <span className="text-base font-semibold text-fg">{t.brand.name}</span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
            {t.guest.readOnly}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
      <CopyrightFooter />
    </div>
  );
}
