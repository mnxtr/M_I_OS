import { redirect } from "next/navigation";

import AuthForm from "@/components/AuthForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) redirect("/workspace");
  }

  return <AuthForm reason={reason} />;
}
