"use client";
import { useEffect } from "react";
import { Icon } from "@/components/icons/icon";
import { Button } from "./button";
export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-soft sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="dialog-title"
              className="font-display text-xl font-extrabold"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <Icon name="x" className="size-5" />
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
