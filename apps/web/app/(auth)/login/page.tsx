import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Skeleton } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  // useSearchParams() in the form requires a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <LoginForm />
    </Suspense>
  );
}
