"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/useT";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { t } = useT();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{t.common.signOut}</span>
    </Button>
  );
}
