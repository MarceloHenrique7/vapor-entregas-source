import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-brand text-white shadow-[0_8px_20px_rgba(234,29,44,.2)] hover:bg-brand-hover",
    secondary: "bg-sun text-ink hover:bg-[#f0ad32]",
    outline:
      "border border-line bg-white text-ink hover:border-brand/35 hover:bg-brand-light/40",
    ghost: "text-ink-soft hover:bg-brand-light/55 hover:text-brand-dark",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<Size, string> = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-sm",
    lg: "h-14 px-6 text-base",
  };
  return cn(
    "inline-flex transform-gpu items-center justify-center gap-2 rounded-2xl font-bold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}
export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
