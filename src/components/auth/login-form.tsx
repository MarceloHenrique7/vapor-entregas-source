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
  const [showPassword, setShowPassword] = useState(false);

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
          identifier: form.get("identifier"),
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
      <FormField
        label={restricted ? "E-mail" : "WhatsApp ou e-mail"}
        htmlFor="identifier"
        required
      >
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder={restricted ? "voce@exemplo.com" : "(87) 99999-9999"}
          required
        />
      </FormField>
      <FormField label="Senha" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Sua senha"
            className="pr-24"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-3 my-auto h-fit rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-brand-light"
            aria-controls="password"
            aria-pressed={showPassword}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
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
        <div className="space-y-3 text-center text-sm text-muted">
          <p>
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
          <p className="text-xs leading-5">
            Contas antigas continuam entrando com e-mail. Para contas sem
            e-mail, a recuperação por WhatsApp ainda não está disponível sem
            verificação de posse.
          </p>
        </div>
      )}
    </form>
  );
}
