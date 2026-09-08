import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyForm } from "./VerifyForm";
import { Skeleton } from "@/components/ui/panel";

export const metadata: Metadata = { title: "Enter your code" };

export default function VerifyPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <VerifyForm />
    </Suspense>
  );
}
