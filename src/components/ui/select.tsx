import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full appearance-none rounded-2xl border border-line bg-white px-4 text-[15px] text-ink shadow-sm transition hover:border-brand/35 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
