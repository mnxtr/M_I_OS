import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table primitives. The wrapper owns `overflow-x-auto` so a wide analytics result
 * scrolls inside its own container and the page body never scrolls horizontally.
 */
export function TableWrapper({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-md border border-border", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-panel-raised", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border last:border-0 hover:bg-panel-raised/60", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-top text-fg", className)} {...props} />;
}
