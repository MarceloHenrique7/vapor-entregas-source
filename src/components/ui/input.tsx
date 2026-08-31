import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink shadow-sm transition placeholder:text-muted/65 hover:border-brand/35 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-canvas",
        className,
      )}
      {...props}
    />
  );
}
