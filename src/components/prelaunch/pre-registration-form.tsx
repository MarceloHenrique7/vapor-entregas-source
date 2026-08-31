"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type AccountType = "MOTOBOY" | "COMPANY";

export function PreRegistrationForm() {
  const [type, setType] = useState<AccountType>("MOTOBOY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"created" | "existing" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/pre-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          type,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        status?: "created" | "existing";
        error?: string;
      };
      if (!response.ok || !body.status) {
        throw new Error(body.error ?? "Não foi possível enviar agora.");
      }
      setResult(body.status);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div
        className="rounded-3xl bg-brand-light/70 p-6 text-center"
        role="status"
      >
        <p className="font-display text-2xl font-extrabold text-brand-dark">
          {result === "created"
            ? "Pronto! Seu interesse foi registrado. ⚡"
            : "Seu interesse já está registrado. ⚡"}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Nos vemos no lançamento da Vapor. Entraremos em contato pelo WhatsApp
          quando houver novidades.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Nome" htmlFor="pre-name" required>
        <Input
          id="pre-name"
          name="name"
          autoComplete="name"
          maxLength={120}
          placeholder="Como podemos chamar você?"
          required
        />
      </FormField>
      <FormField label="WhatsApp" htmlFor="pre-phone" required>
        <Input
          id="pre-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          placeholder="(87) 99999-9999"
          required
        />
      </FormField>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">
          Como você quer participar?
        </legend>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5">
          {(["MOTOBOY", "COMPANY"] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl px-3 py-3 text-center text-sm font-bold transition ${
                type === value
                  ? "bg-white text-brand shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              <span className="block">
                {value === "MOTOBOY" ? "Sou Motoboy" : "Sou Empresa"}
              </span>
              <span className="mt-1 block text-[10px] font-semibold leading-4 opacity-75">
                {value === "MOTOBOY"
                  ? "Quero fazer parte da Vapor"
                  : "Quero colocar meu negócio a todo Vapor"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "ENVIANDO…" : "QUERO PARTICIPAR"}
      </Button>
      <p className="text-center text-xs font-bold text-brand-dark">
        Pré-cadastro gratuito • Sem compromisso
      </p>
      <p className="text-center text-[11px] leading-5 text-muted">
        Ao enviar, você autoriza a Vapor Entregas a usar seu nome e WhatsApp
        para entrar em contato sobre o pré-lançamento e lançamento da
        plataforma.
      </p>
    </form>
  );
}
