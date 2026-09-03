"use client";

import { useState } from "react";

import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

import { usePwaInstall } from "./use-pwa-install";

export function InstallAppButton({ className }: { className?: string }) {
  const { ready, installed, isIos, canPrompt, install } = usePwaInstall();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (!ready || installed) return null;

  const handleInstall = async () => {
    if (canPrompt) {
      await install();
      return;
    }
    setInstructionsOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        className={cn("primary-action-attention", className)}
        onClick={handleInstall}
      >
        <Icon name="smartphone" className="size-5" />
        Instalar Vapor
      </Button>
      <Dialog
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        title="Instalar Vapor no celular"
        description="A Vapor é um aplicativo web e não precisa ser baixada em uma loja."
      >
        {isIos ? (
          <ol className="space-y-4 text-sm leading-6 text-ink-soft">
            <li>
              <strong className="text-ink">1.</strong> Abra esta página no
              Safari e toque no botão Compartilhar.
            </li>
            <li>
              <strong className="text-ink">2.</strong> Escolha “Adicionar à Tela
              de Início”.
            </li>
            <li>
              <strong className="text-ink">3.</strong> Confirme em “Adicionar”.
            </li>
          </ol>
        ) : (
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              Abra o menu do navegador e escolha “Instalar aplicativo” ou
              “Adicionar à tela inicial”.
            </p>
            <p>
              No Android, prefira o Chrome atualizado. A opção aparece quando o
              navegador confirma os requisitos de instalação.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
