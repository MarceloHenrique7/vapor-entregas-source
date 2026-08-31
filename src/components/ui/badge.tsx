import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "success" | "warning" | "info";
}) {
  const variants = {
    neutral: "bg-canvas text-ink-soft",
    success: "bg-brand-light text-brand-dark",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
