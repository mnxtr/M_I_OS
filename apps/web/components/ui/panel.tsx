import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mios-panel rounded-panel p-5", className)}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)} {...props} />;
}

export function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold tracking-[-0.02em] text-fg", className)} {...props} />;
}

export function PanelDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
  {
    variants: {
      tone: {
        neutral: "border-border text-muted",
        ok: "border-ok/50 bg-ok/10 text-ok",
        warn: "border-warn/50 bg-warn/10 text-warn",
        danger: "border-danger/50 bg-danger/10 text-danger",
        accent: "border-accent/50 bg-accent/10 text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-panel-raised", className)}
      {...props}
    />
  );
}

/** Inline error banner. `role="alert"` so it is announced when it appears. */
export function ErrorBanner({ className, children, ...props }: React.ComponentProps<"div">) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { badgeVariants };
