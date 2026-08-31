"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const roleDestination = {
  MOTOBOY: "/app/motoboy",
  COMPANY: "/app/empresa",
  ADMIN: "/admin",
} as const;

export function LoginForm({
  restricted = false,
  endpoint = "/api/auth/login",
}: {
  restricted?: boolean;
  endpoint?:
    | "/api/auth/login"
    | "/api/prelaunch/login/admin"
    | "/api/prelaunch/login/test";
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.push(
        roleDestination[data.user.role as keyof typeof roleDestination],
      );
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormField label="E-mail" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </FormField>
      <FormField label="Senha" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          required
        />
      </FormField>
      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <Icon name="shield" className="size-5 shrink-0" />
          {error}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar na Vapor"}
        <Icon name="arrow-right" className="size-5" />
      </Button>
      {!restricted && (
        <p className="text-center text-sm text-muted">
          Ainda não tem uma conta?{" "}
          <Link
            href="/cadastro/empresa"
            className="font-bold text-brand hover:underline"
          >
            Criar conta de empresa
          </Link>{" "}
          <span aria-hidden="true">·</span>{" "}
          <Link
            href="/cadastro/motoboy"
            className="font-bold text-brand hover:underline"
          >
            Criar conta de motoboy
          </Link>
        </p>
      )}
    </form>
  );
}
