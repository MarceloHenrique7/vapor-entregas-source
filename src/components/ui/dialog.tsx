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
    if (!open) return;

    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", close);
    };
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end overflow-y-auto overscroll-contain bg-ink/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-soft sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6">
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
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
