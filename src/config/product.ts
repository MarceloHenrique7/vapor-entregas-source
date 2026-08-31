export const PRODUCT_NAME = "Vapor Entregas";

export const SUBSCRIPTION_PLANS = {
  motoboy: {
    name: "Motoboy",
    monthlyPriceInCents: 2_000,
    description: "Acesso às oportunidades e organização do seu histórico.",
  },
  company: {
    name: "Empresa",
    monthlyPriceInCents: 2_500,
    description: "Publicação e acompanhamento organizado das entregas locais.",
  },
} as const;

export const CURRENT_TERMS_VERSION = "1.1";
export const CURRENT_PRIVACY_VERSION = "1.1";

export function formatPrice(priceInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(priceInCents / 100);
}
