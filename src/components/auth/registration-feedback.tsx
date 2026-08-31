import { Icon } from "@/components/icons/icon";
export type FieldErrors = Record<string, string[] | undefined>;
export function firstError(errors: FieldErrors, field: string) {
  return errors[field]?.[0];
}
export function RegistrationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <Icon name="shield" className="size-5 shrink-0" />
      {message}
    </div>
  );
}
