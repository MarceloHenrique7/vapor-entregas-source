export type PrelaunchRegistrationType = "COMPANY" | "MOTOBOY";

interface PrelaunchRegistrationDraft {
  type: PrelaunchRegistrationType;
  name: string;
  phone: string;
  createdAt: number;
}

const STORAGE_KEY = "vapor:prelaunch-registration-draft";
const MAX_AGE_MS = 2 * 60 * 60 * 1_000;

function isDraft(value: unknown): value is PrelaunchRegistrationDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    (draft.type === "COMPANY" || draft.type === "MOTOBOY") &&
    typeof draft.name === "string" &&
    draft.name.length >= 2 &&
    draft.name.length <= 120 &&
    typeof draft.phone === "string" &&
    draft.phone.length <= 24 &&
    typeof draft.createdAt === "number" &&
    Date.now() - draft.createdAt <= MAX_AGE_MS
  );
}

export function savePrelaunchRegistrationDraft(
  type: PrelaunchRegistrationType,
  name: string,
  phone: string,
) {
  const draft: PrelaunchRegistrationDraft = {
    type,
    name: name.trim(),
    phone: phone.trim(),
    createdAt: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function readPrelaunchRegistrationDraft(
  type: PrelaunchRegistrationType,
) {
  const serialized = window.sessionStorage.getItem(STORAGE_KEY);
  if (!serialized) return null;
  try {
    const draft: unknown = JSON.parse(serialized);
    if (!isDraft(draft)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return draft.type === type ? draft : null;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPrelaunchRegistrationDraft() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
