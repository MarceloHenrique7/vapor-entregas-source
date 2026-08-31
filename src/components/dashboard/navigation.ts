import type { IconName } from "@/components/icons/icon";

export interface NavigationItem {
  href: string;
  label: string;
  icon: IconName;
  mobile?: boolean;
}
export const motoboyNavigation: NavigationItem[] = [
  { href: "/app/motoboy", label: "Início", icon: "home", mobile: true },
  {
    href: "/app/motoboy/oportunidades",
    label: "Oportunidades",
    icon: "package",
    mobile: true,
  },
  {
    href: "/app/motoboy/corrida",
    label: "Corrida atual",
    icon: "route",
    mobile: true,
  },
  {
    href: "/app/motoboy/historico",
    label: "Histórico",
    icon: "history",
    mobile: true,
  },
  { href: "/app/motoboy/denuncias", label: "Minhas denúncias", icon: "shield" },
  { href: "/app/motoboy/notificacoes", label: "Notificações", icon: "bell" },
  { href: "/app/motoboy/assinatura", label: "Assinatura", icon: "wallet" },
  { href: "/app/motoboy/perfil", label: "Perfil", icon: "user" },
  {
    href: "/app/motoboy/configuracoes",
    label: "Configurações",
    icon: "settings",
    mobile: true,
  },
];
export const companyNavigation: NavigationItem[] = [
  { href: "/app/empresa", label: "Início", icon: "home", mobile: true },
  {
    href: "/app/empresa/entregas/nova",
    label: "Nova entrega",
    icon: "plus",
    mobile: true,
  },
  {
    href: "/app/empresa/entregas",
    label: "Entregas",
    icon: "package",
    mobile: true,
  },
  {
    href: "/app/empresa/motoboys",
    label: "Motoboys",
    icon: "users",
    mobile: true,
  },
  {
    href: "/app/empresa/configuracoes/localizacao",
    label: "Localização",
    icon: "map",
    mobile: true,
  },
  { href: "/app/empresa/historico", label: "Histórico", icon: "history" },
  { href: "/app/empresa/favoritos", label: "Favoritos", icon: "heart" },
  { href: "/app/empresa/denuncias", label: "Minhas denúncias", icon: "shield" },
  { href: "/app/empresa/notificacoes", label: "Notificações", icon: "bell" },
  { href: "/app/empresa/assinatura", label: "Assinatura", icon: "wallet" },
  { href: "/app/empresa/perfil", label: "Perfil", icon: "user" },
  {
    href: "/app/empresa/configuracoes",
    label: "Configurações",
    icon: "settings",
    mobile: true,
  },
];

export const adminNavigation: NavigationItem[] = [
  { href: "/admin", label: "Visão geral", icon: "home", mobile: true },
  {
    href: "/admin/pre-cadastros",
    label: "Pré-cadastros",
    icon: "users",
    mobile: true,
  },
  { href: "/admin/usuarios", label: "Usuários", icon: "users", mobile: true },
  { href: "/admin/entregas", label: "Entregas", icon: "package", mobile: true },
  {
    href: "/admin/denuncias",
    label: "Denúncias",
    icon: "shield",
    mobile: true,
  },
  {
    href: "/admin/auditoria",
    label: "Auditoria",
    icon: "history",
    mobile: true,
  },
  {
    href: "/admin/precificacao",
    label: "Preço sugerido",
    icon: "settings",
  },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: "wallet" },
  { href: "/", label: "Voltar ao sistema", icon: "arrow-right" },
];
