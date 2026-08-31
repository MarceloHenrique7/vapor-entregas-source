export const OPPORTUNITY_RADIUS_KM = 20;
export const DELIVERY_OPPORTUNITY_TTL_MINUTES = 60;

export const DIRECT_PAYMENT_NOTICE =
  "O valor informado será combinado e pago diretamente entre empresa e motoboy. A Vapor Entregas não recebe, retém ou repassa o valor da entrega.";

export const PAYMENT_METHOD_LABELS = {
  PIX: "PIX",
  CASH: "Dinheiro",
  COMPANY_SETTLEMENT: "Acerto com o estabelecimento",
  OTHER: "Outro",
} as const;

export const DELIVERY_STATUS_LABELS = {
  SEARCHING_MOTOBOY: "Procurando motoboy",
  ACCEPTED: "Aceita",
  MOTOBOY_TO_PICKUP: "Motoboy a caminho da coleta",
  ARRIVED_AT_PICKUP: "Chegou à coleta",
  PICKED_UP: "Pedido coletado",
  IN_DELIVERY: "Em entrega",
  COMPLETED: "Concluída",
  CANCELLED_BY_COMPANY: "Cancelada pela empresa",
  CANCELLED_BY_MOTOBOY: "Cancelada pelo motoboy",
  EXPIRED: "Expirada",
  DISPUTED: "Em disputa",
} as const;

export const DELIVERY_EXTRA_TYPE_LABELS = {
  WAITING: "Espera prevista",
  RETURN: "Retorno",
  PURCHASE: "Compra de item",
  SPECIAL_WEIGHT_VOLUME: "Peso ou volume especial",
  CANCELLATION_AFTER_DEPARTURE: "Cancelamento após deslocamento",
  OTHER: "Outro adicional",
} as const;

export const DELIVERY_EXTRA_STATUS_LABELS = {
  PENDING: "Aguardando ciência",
  ACKNOWLEDGED: "Ciente",
  REJECTED: "Não aceito",
  CANCELLED: "Cancelado",
} as const;

export const DELIVERY_EXTRAS_NOTICE =
  "Adicionais são condições informativas combinadas diretamente entre empresa e motoboy. A Vapor Entregas não recebe, custodia ou repassa esses valores.";
