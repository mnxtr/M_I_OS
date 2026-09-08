"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Live ingestion status.
 *
 * Subscribes to Postgres changes on `documents` and refreshes the RSC tree when a row
 * moves processing → ready | failed. RLS scopes the subscription to this tenant.
 *
 * Falls back to polling when the socket does not connect within a few seconds — factory
 * networks and corporate proxies block websockets often enough that a silent stall would
 * look like broken ingestion.
 */
export function DocumentRealtime({ hasProcessing }: { hasProcessing: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasProcessing) return;

    const supabase = createClient();
    let connected = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const channel = supabase
      .channel("documents-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "documents" },
        () => router.refresh(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") connected = true;
      });

    const fallback = setTimeout(() => {
      if (!connected) pollTimer = setInterval(() => router.refresh(), 5000);
    }, 4000);

    return () => {
      clearTimeout(fallback);
      if (pollTimer) clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [hasProcessing, router]);

  return null;
}
