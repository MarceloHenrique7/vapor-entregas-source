"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <EmptyState
        icon="shield"
        title="Algo não saiu como esperado"
        description="Tente carregar esta área novamente. Se o problema continuar, volte ao início."
        action={<Button onClick={reset}>Tentar novamente</Button>}
      />
    </main>
  );
}
