import Link from "next/link";
import { getServerT } from "@/lib/i18n";
import { LangToggle } from "@/components/layout/LangToggle";
import { LangMigration } from "@/components/layout/LangMigration";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();

  return (
    <div className="flex min-h-dvh flex-col">
      <LangMigration />
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-fg">
          {t.brand.name}
        </Link>
        <LangToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
