import type { InputHTMLAttributes, ReactNode } from "react";
export function CheckboxField({
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas/60 p-4 text-sm leading-6 text-ink-soft transition hover:border-brand/30">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-brand"
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}
