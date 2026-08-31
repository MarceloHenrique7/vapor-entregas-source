export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) {
    return false;
  }

  for (let digitIndex = 9; digitIndex < 11; digitIndex += 1) {
    let sum = 0;
    for (let index = 0; index < digitIndex; index += 1) {
      sum += Number(cpf[index]) * (digitIndex + 1 - index);
    }
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(cpf[digitIndex])) {
      return false;
    }
  }

  return true;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) {
    return false;
  }

  const calculateDigit = (length: number) => {
    let factor = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cnpj[index]) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calculateDigit(12) === Number(cnpj[12]) &&
    calculateDigit(13) === Number(cnpj[13])
  );
}

export function getBrazilianDocumentType(value: string): "CPF" | "CNPJ" | null {
  const digits = onlyDigits(value);
  if (digits.length === 11 && isValidCpf(digits)) return "CPF";
  if (digits.length === 14 && isValidCnpj(digits)) return "CNPJ";
  return null;
}
