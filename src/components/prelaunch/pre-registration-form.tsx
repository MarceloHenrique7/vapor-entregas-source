"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  trackMetaCustomEventOnce,
  trackMetaEventOnce,
} from "@/lib/analytics/meta-pixel";
import { savePrelaunchRegistrationDraft } from "@/lib/registration/prelaunch-draft";

type AccountType = "MOTOBOY" | "COMPANY";

export function PreRegistrationForm() {
  const router = useRouter();
  const [type, setType] = useState<AccountType>("COMPANY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const leadType = type === "COMPANY" ? "company" : "motoboy";
      if (body.status === "created") {
        trackMetaEventOnce(`pre-registration:${leadType}`, "Lead", {
          lead_type: leadType,
          source: "prelaunch_form",
        });
      }
      const name = String(form.get("name") ?? "");
      const phone = String(form.get("phone") ?? "");
      savePrelaunchRegistrationDraft(type, name, phone);
      trackMetaCustomEventOnce(
        `registration-started:${leadType}`,
        "RegistrationStarted",
        { registration_type: leadType, source: "prelaunch_form" },
      );
      router.push(
        type === "COMPANY" ? "/cadastro/empresa" : "/cadastro/motoboy",
      );
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

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="sr-only">Como você quer participar?</legend>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5">
          {(["COMPANY", "MOTOBOY"] as const).map((value) => (
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
                onChange={() => {
                  setType(value);
                  trackMetaCustomEventOnce(
                    `prelaunch-type:${value.toLowerCase()}`,
                    "RegistrationTypeSelected",
                    { registration_type: value.toLowerCase() },
                  );
                }}
              />
              <span className="block">
                {value === "MOTOBOY" ? "Sou Motoboy" : "Sou Empresa"}
              </span>
              <span className="mt-1 block text-[10px] font-semibold leading-4 opacity-75">
                {value === "MOTOBOY"
                  ? "Quero realizar entregas pela Vapor"
                  : "Quero solicitar entregas pela Vapor"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormField
        label={type === "COMPANY" ? "Nome da empresa" : "Seu nome"}
        htmlFor="pre-name"
        required
      >
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
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "CONTINUANDO…" : "CONTINUAR CADASTRO →"}
      </Button>
      <p className="text-center text-xs font-bold text-brand-dark">
        Cadastro gratuito • Sem compromisso • Vale do São Francisco
      </p>
      <p className="text-center text-[11px] leading-5 text-muted">
        Ao enviar, você autoriza a Vapor Entregas a usar seu nome e WhatsApp
        para entrar em contato sobre o pré-lançamento e lançamento da
        plataforma.
      </p>
    </form>
  );
}
