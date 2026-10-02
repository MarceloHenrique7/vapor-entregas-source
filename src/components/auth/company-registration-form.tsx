"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  firstError,
  RegistrationError,
  type FieldErrors,
} from "./registration-feedback";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  trackMetaCustomEventOnce,
  trackMetaEventOnce,
} from "@/lib/analytics/meta-pixel";
import {
  clearPrelaunchRegistrationDraft,
  readPrelaunchRegistrationDraft,
} from "@/lib/registration/prelaunch-draft";
import { formatBrazilPhoneInput } from "@/lib/validators/phone";

export function CompanyRegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});
  const [fantasyName, setFantasyName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const draft = readPrelaunchRegistrationDraft("COMPANY");
      if (draft) {
        setFantasyName(draft.name);
        setPhone(formatBrazilPhoneInput(draft.phone));
      }
    }, 0);
    trackMetaCustomEventOnce(
      "registration-form-viewed:company",
      "CompanySignupStarted",
    );
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(undefined);
    setFields({});
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyName: form.get("fantasyName"),
          phone: form.get("phone"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        setFields(data.fields ?? {});
        return;
      }
      const registrationId =
        typeof data?.user?.id === "string" ? data.user.id : "session";
      trackMetaEventOnce(
        `registration:company:${registrationId}`,
        "CompleteRegistration",
        { registration_type: "company", platform: "vapor" },
      );
      trackMetaCustomEventOnce(
        `registration:company-custom:${registrationId}`,
        "CompanyRegistrationCompleted",
      );
      trackMetaCustomEventOnce(
        `registration:company-signup:${registrationId}`,
        "CompanySignupCompleted",
      );
      clearPrelaunchRegistrationDraft();
      router.push("/app/empresa/configuracoes/localizacao");
      router.refresh();
    } catch {
      setError("Não foi possível criar sua conta agora. Tente novamente.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.16em] text-brand">
        <span className="grid size-7 place-items-center rounded-full bg-brand text-white">
          1
        </span>
        <span>Passo 1 de 2 · Conta</span>
      </div>
      <FormField
        label="Nome da empresa"
        htmlFor="fantasyName"
        error={firstError(fields, "fantasyName")}
        required
      >
        <Input
          id="fantasyName"
          name="fantasyName"
          autoComplete="organization"
          placeholder="Ex.: Encanto do Vale"
          value={fantasyName}
          onChange={(event) => setFantasyName(event.target.value)}
          maxLength={120}
          required
        />
      </FormField>
      <FormField
        label="WhatsApp"
        htmlFor="phone"
        error={firstError(fields, "phone")}
        required
      >
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(87) 99999-9999"
          value={phone}
          onChange={(event) =>
            setPhone(formatBrazilPhoneInput(event.target.value))
          }
          maxLength={16}
          required
        />
      </FormField>
      <FormField
        label="Senha"
        htmlFor="password"
        error={firstError(fields, "password")}
        hint="Use pelo menos 8 caracteres."
        required
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Crie uma senha"
            minLength={8}
            maxLength={128}
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
      <p className="rounded-2xl bg-canvas p-4 text-xs leading-5 text-muted">
        Ao criar sua conta, você declara que leu e aceita os{" "}
        <Link
          href="/termos"
          target="_blank"
          className="font-bold text-brand underline"
        >
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          href="/privacidade"
          target="_blank"
          className="font-bold text-brand underline"
        >
          Política de Privacidade
        </Link>
        .
      </p>
      <RegistrationError message={error} />
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Criando sua conta..." : "Criar minha conta"}
      </Button>
      <p className="text-center text-sm text-muted">
        Já possui uma conta?{" "}
        <Link href="/entrar" className="font-bold text-brand">
          Entrar
        </Link>
      </p>
    </form>
  );
}
