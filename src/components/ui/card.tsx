import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-line/80 bg-white shadow-card",
        className,
      )}
      {...props}
    />
  );
}
