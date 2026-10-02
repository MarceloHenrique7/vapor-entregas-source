import { InvalidCredentialsError } from "./errors";
import { verifyPassword } from "./password";
import { loginEmailSchema, loginSchema, type LoginInput } from "./schemas";
import type { AuthenticatedUser, Role, UserStatus } from "./types";
import { normalizeBrazilPhone } from "@/lib/validators/phone";

const MAX_ACCOUNT_FAILURES = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1_000;
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,p=1,t=2$orwdkC3UBvaoC8tN3wx/yQ$jxg/4yrTcXahaFLUS0iaw1OZfNhphvO3adFd2pPji/Y";

export interface CredentialUserRecord {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  status: UserStatus;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface AuthRepository {
  findUserByIdentifier(identifier: {
    kind: "email" | "phone";
    value: string;
  }): Promise<CredentialUserRecord | null>;
  recordFailedLogin(
    userId: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void>;
  recordSuccessfulLogin(userId: string, occurredAt: Date): Promise<void>;
}

export async function authenticateCredentials(
  input: LoginInput,
  repository: AuthRepository,
  now = new Date(),
): Promise<AuthenticatedUser> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    throw new InvalidCredentialsError();
  }

  const rawIdentifier = parsed.data.identifier ?? parsed.data.email ?? "";
  const parsedEmail = rawIdentifier.includes("@")
    ? loginEmailSchema.safeParse(rawIdentifier)
    : null;
  const email = parsedEmail?.success ? parsedEmail.data : null;
  const phone = email ? null : normalizeBrazilPhone(rawIdentifier);
  if (!email && !phone) throw new InvalidCredentialsError();
  const user = await repository.findUserByIdentifier(
    email ? { kind: "email", value: email } : { kind: "phone", value: phone! },
  );
  const passwordMatches = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    parsed.data.password,
  );

  const accountIsLocked = Boolean(
    user?.lockedUntil && user.lockedUntil.getTime() > now.getTime(),
  );
  const accountIsActive = user?.status === "ACTIVE";

  if (!user || !passwordMatches || accountIsLocked || !accountIsActive) {
    if (user && !passwordMatches && !accountIsLocked) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        failedAttempts >= MAX_ACCOUNT_FAILURES
          ? new Date(now.getTime() + ACCOUNT_LOCK_DURATION_MS)
          : null;

      await repository.recordFailedLogin(user.id, failedAttempts, lockedUntil);
    }

    throw new InvalidCredentialsError();
  }

  await repository.recordSuccessfulLogin(user.id, now);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
