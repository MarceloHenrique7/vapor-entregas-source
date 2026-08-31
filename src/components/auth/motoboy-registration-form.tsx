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

export function MotoboyRegistrationForm() {
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
    const checkbox = (name: string) => form.get(name) === "on";
    const body = {
      name: form.get("name"),
      cpf: form.get("cpf"),
      rg: form.get("rg"),
      phone: form.get("phone"),
      email: form.get("email"),
      birthDate: form.get("birthDate"),
      city: form.get("city"),
      vehiclePlate: form.get("vehiclePlate"),
      password: form.get("password"),
      passwordConfirmation: form.get("passwordConfirmation"),
      termsAccepted: checkbox("legalAccepted"),
      privacyAccepted: checkbox("legalAccepted"),
      legalResponsibilityAccepted: checkbox("legalResponsibilityAccepted"),
      intermediationAccepted: checkbox("intermediationAccepted"),
    };
    try {
      const response = await fetch("/api/auth/register/motoboy", {
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
      router.push("/app/motoboy");
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
          label="Nome completo"
          htmlFor="name"
          error={firstError(fields, "name")}
          required
        >
          <Input id="name" name="name" autoComplete="name" required />
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
          label="CPF"
          htmlFor="cpf"
          error={firstError(fields, "cpf")}
          hint="Dado privado, nunca exibido publicamente."
          required
        >
          <Input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            required
          />
        </FormField>
        <FormField
          label="Número do RG"
          htmlFor="rg"
          error={firstError(fields, "rg")}
          hint="Aceitamos formatos de diferentes estados."
          required
        >
          <Input
            id="rg"
            name="rg"
            autoComplete="off"
            placeholder="Número e órgão, se aplicável"
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
          label="Data de nascimento"
          htmlFor="birthDate"
          error={firstError(fields, "birthDate")}
          required
        >
          <Input id="birthDate" name="birthDate" type="date" required />
        </FormField>
        <FormField
          label="Cidade principal"
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
          label="Placa da moto"
          htmlFor="vehiclePlate"
          error={firstError(fields, "vehiclePlate")}
          hint="Você poderá atualizar essa informação depois."
        >
          <Input
            id="vehiclePlate"
            name="vehiclePlate"
            autoComplete="off"
            placeholder="Ex.: ABC1D23"
            maxLength={10}
          />
        </FormField>
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
        <CheckboxField name="legalResponsibilityAccepted" required>
          Declaro que sou responsável por possuir e manter válidos os
          documentos, habilitações e demais requisitos legalmente exigidos para
          exercer minha atividade.
        </CheckboxField>
        <CheckboxField name="intermediationAccepted" required>
          Compreendo que a plataforma atua como ferramenta tecnológica de
          conexão entre usuários e não realiza diretamente o serviço de entrega.
        </CheckboxField>
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
        {loading ? "Criando cadastro..." : "Criar minha conta de motoboy"}
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
