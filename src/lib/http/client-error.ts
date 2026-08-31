export function apiErrorMessage(
  status: number,
  serverMessage: string | undefined,
  fallback: string,
) {
  if (serverMessage) return serverMessage;
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 402)
    return "Ative sua assinatura para iniciar novas operações.";
  if (status === 403) return "Você não tem permissão para esta operação.";
  if (status === 404) return "O recurso solicitado não foi encontrado.";
  if (status === 409)
    return "A informação mudou. Atualize a tela e tente novamente.";
  if (status === 422) return "Revise os dados informados.";
  if (status === 429)
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (status >= 500)
    return "O servidor encontrou um problema. Tente novamente em instantes.";
  return fallback;
}

export const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
