"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

/**
 * Route-scoped error boundary. Never show internal exception messages to
 * customers; only display the opaque digest for support correlation.
 */
export default function ComplianceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server errors arrive with an opaque digest. No tenant records are logged here.
    console.error("Compliance route failed", error.digest ?? "unavailable");
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 py-12">
      <div role="alert" className="w-full rounded-2xl border border-border bg-panel p-7 shadow-xl">
        <AlertTriangle aria-hidden="true" className="size-8 text-warn" />
        <h1 className="mt-5 text-xl font-semibold text-fg">Compliance is temporarily unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The page could not be displayed. Please try again.
          If the problem continues, share the reference below with your administrator.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-lg border border-border bg-bg/70 p-3 font-mono text-xs text-muted">
            Error reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-dark">
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-fg hover:border-accent/50">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
