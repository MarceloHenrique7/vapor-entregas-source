import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/config/product";
import { onlyDigits } from "@/lib/validators/br-documents";
import { hashPassword } from "@/server/auth/password";
import type { AuthenticatedUser } from "@/server/auth/types";
import {
  encryptPrivateField,
  fingerprintPrivateField,
} from "@/server/security/private-fields";

import {
  companyRegistrationSchema,
  motoboyRegistrationSchema,
  type CompanyRegistrationInput,
  type MotoboyRegistrationInput,
} from "./schemas";

export interface NewMotoboyAccount {
  role: "MOTOBOY";
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  termsVersion: string;
  privacyVersion: string;
  registeredAt: Date;
  profile: {
    cpfEncrypted: string;
    cpfHash: string;
    cpfLastDigits: string;
    rgEncrypted: string;
    rgHash: string;
    birthDate: Date;
    city: "PETROLINA_PE" | "JUAZEIRO_BA";
    vehiclePlate: string | null;
    acceptedAt: Date;
  };
}

export interface NewCompanyAccount {
  role: "COMPANY";
  name: string;
  email: null;
  phone: string;
  passwordHash: string;
  termsVersion: string;
  privacyVersion: string;
  registeredAt: Date;
  profile: {
    fantasyName: string;
    documentType: null;
    legalDocumentEncrypted: null;
    legalDocumentHash: null;
    legalDocumentLastDigits: null;
    city: null;
  };
}

export interface RegistrationRepository {
  createMotoboy(data: NewMotoboyAccount): Promise<AuthenticatedUser>;
  createCompany(data: NewCompanyAccount): Promise<AuthenticatedUser>;
}

export async function registerMotoboy(
  input: MotoboyRegistrationInput,
  repository: RegistrationRepository,
  encryptionKey: string,
  now = new Date(),
) {
  const data = motoboyRegistrationSchema.parse(input);
  const cpf = onlyDigits(data.cpf);
  const rg = data.rg.toUpperCase().replace(/\s+/g, " ");

  return repository.createMotoboy({
    role: "MOTOBOY",
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: await hashPassword(data.password),
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
    registeredAt: now,
    profile: {
      cpfEncrypted: encryptPrivateField(cpf, encryptionKey),
      cpfHash: fingerprintPrivateField(cpf, encryptionKey),
      cpfLastDigits: cpf.slice(-2),
      rgEncrypted: encryptPrivateField(rg, encryptionKey),
      rgHash: fingerprintPrivateField(rg, encryptionKey),
      birthDate: new Date(`${data.birthDate}T00:00:00.000Z`),
      city: data.city,
      vehiclePlate: data.vehiclePlate ?? null,
      acceptedAt: now,
    },
  });
}

export async function registerCompany(
  input: CompanyRegistrationInput,
  repository: RegistrationRepository,
  now = new Date(),
) {
  const data = companyRegistrationSchema.parse(input);

  return repository.createCompany({
    role: "COMPANY",
    name: data.fantasyName,
    email: null,
    phone: data.phone,
    passwordHash: await hashPassword(data.password),
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
    registeredAt: now,
    profile: {
      fantasyName: data.fantasyName,
      documentType: null,
      legalDocumentEncrypted: null,
      legalDocumentHash: null,
      legalDocumentLastDigits: null,
      city: null,
    },
  });
}
