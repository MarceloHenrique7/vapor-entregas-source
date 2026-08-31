import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Vapor Entregas — início"
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_rgba(234,29,44,.24)]">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
          <path
            d="M6 8h12a7 7 0 0 1 0 14h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="m12 17 3 5-3 5M6 8l5-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="8" r="2.2" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">
          Vapor <span className="text-brand">Entregas</span>
        </span>
      )}
    </Link>
  );
}
