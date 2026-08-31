"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckboxField } from "./checkbox-field";
import {
  firstError,
  RegistrationError,
  type FieldErrors,
} from "./registration-feedback";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CompanyRegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    setFields({});
    const form = new FormData(event.currentTarget);
    const body = {
      responsibleName: form.get("responsibleName"),
      fantasyName: form.get("fantasyName"),
      legalDocument: form.get("legalDocument"),
      phone: form.get("phone"),
      email: form.get("email"),
      city: form.get("city"),
      address: form.get("address"),
      addressNumber: form.get("addressNumber"),
      neighborhood: form.get("neighborhood"),
      complement: form.get("complement"),
      referencePoint: form.get("referencePoint"),
      password: form.get("password"),
      passwordConfirmation: form.get("passwordConfirmation"),
      termsAccepted: form.get("legalAccepted") === "on",
      privacyAccepted: form.get("legalAccepted") === "on",
    };
    try {
      const response = await fetch("/api/auth/register/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        setFields(data.fields ?? {});
        return;
      }
      router.push("/app/empresa");
      router.refresh();
    } catch {
      setError("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Nome do responsável"
          htmlFor="responsibleName"
          error={firstError(fields, "responsibleName")}
          required
        >
          <Input
            id="responsibleName"
            name="responsibleName"
            autoComplete="name"
            required
          />
        </FormField>
        <FormField
          label="Nome fantasia"
          htmlFor="fantasyName"
          error={firstError(fields, "fantasyName")}
          required
        >
          <Input
            id="fantasyName"
            name="fantasyName"
            autoComplete="organization"
            required
          />
        </FormField>
        <FormField
          label="CPF ou CNPJ"
          htmlFor="legalDocument"
          error={firstError(fields, "legalDocument")}
          hint="Dado privado, protegido e não exibido a motoboys."
          required
        >
          <Input
            id="legalDocument"
            name="legalDocument"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </FormField>
        <FormField
          label="Telefone / WhatsApp"
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
            required
          />
        </FormField>
        <FormField
          label="E-mail"
          htmlFor="email"
          error={firstError(fields, "email")}
          required
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </FormField>
        <FormField
          label="Cidade"
          htmlFor="city"
          error={firstError(fields, "city")}
          required
        >
          <Select id="city" name="city" defaultValue="" required>
            <option value="" disabled>
              Selecione
            </option>
            <option value="PETROLINA_PE">Petrolina/PE</option>
            <option value="JUAZEIRO_BA">Juazeiro/BA</option>
          </Select>
        </FormField>
        <FormField
          label="Endereço"
          htmlFor="address"
          error={firstError(fields, "address")}
          required
        >
          <Input
            id="address"
            name="address"
            autoComplete="street-address"
            required
          />
        </FormField>
        <FormField
          label="Número"
          htmlFor="addressNumber"
          error={firstError(fields, "addressNumber")}
          required
        >
          <Input id="addressNumber" name="addressNumber" required />
        </FormField>
        <FormField
          label="Bairro"
          htmlFor="neighborhood"
          error={firstError(fields, "neighborhood")}
          required
        >
          <Input id="neighborhood" name="neighborhood" required />
        </FormField>
        <FormField
          label="Complemento"
          htmlFor="complement"
          error={firstError(fields, "complement")}
        >
          <Input id="complement" name="complement" />
        </FormField>
        <div className="sm:col-span-2">
          <FormField
            label="Ponto de referência"
            htmlFor="referencePoint"
            error={firstError(fields, "referencePoint")}
          >
            <Input id="referencePoint" name="referencePoint" />
          </FormField>
        </div>
      </div>
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
        Após o cadastro, confirme no mapa o ponto exato de coleta nas
        configurações de localização da empresa.
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Senha"
          htmlFor="password"
          error={firstError(fields, "password")}
          hint="12+ caracteres, com maiúscula, minúscula e número."
          required
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </FormField>
        <FormField
          label="Confirmar senha"
          htmlFor="passwordConfirmation"
          error={firstError(fields, "passwordConfirmation")}
          required
        >
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </FormField>
      </div>
      <div className="space-y-3">
        <CheckboxField name="legalAccepted" required>
          Li e aceito os{" "}
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
        </CheckboxField>
      </div>
      <RegistrationError message={error} />
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Criando cadastro..." : "Criar minha conta de empresa"}
      </Button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-bold text-brand">
          Entrar
        </Link>
      </p>
    </form>
  );
}
