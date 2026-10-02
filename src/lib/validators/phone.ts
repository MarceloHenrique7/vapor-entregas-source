const BRAZIL_COUNTRY_CODE = "55";

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBrazilPhone(value: string): string | null {
  let digits = phoneDigits(value.trim());
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12) {
    digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (!/^[1-9]{2}[2-9]\d{7,8}$/.test(digits)) return null;
  return `+${BRAZIL_COUNTRY_CODE}${digits}`;
}

export function formatBrazilPhoneInput(value: string) {
  let digits = phoneDigits(value).slice(0, 13);
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${area}) ${local}`;
  const prefixLength = local.length > 8 ? 5 : 4;
  return `(${area}) ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
}
