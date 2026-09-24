import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/icons/icon";
import { buttonStyles } from "@/components/ui/button";

const navigation = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#gestao-pro", label: "Gestão Pro" },
  { href: "#para-empresas", label: "Para empresas" },
  { href: "#duvidas", label: "Dúvidas" },
] as const;

const painPoints: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: "clock",
    title: "Pedido pronto e ninguém para levar?",
    description:
      "A busca de última hora toma tempo justamente quando sua equipe mais precisa de agilidade.",
  },
  {
    icon: "smartphone",
    title: "Conversas espalhadas em vários lugares?",
    description:
      "Detalhes da entrega, aceite e andamento acabam divididos entre mensagens e ligações.",
  },
  {
    icon: "map-pin",
    title: "Cliente perguntando: “cadê meu pedido?”",
    description:
      "Sem um acompanhamento compartilhável, a equipe precisa interromper a rotina para responder.",
  },
  {
    icon: "file",
    title: "Difícil saber quanto gastou no mês?",
    description:
      "Sem histórico organizado, conferir entregas e valores registrados vira trabalho manual.",
  },
];

const steps: Array<{
  number: string;
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    number: "01",
    icon: "building",
    title: "Crie a conta da empresa",
    description:
      "Cadastre sua operação e deixe os dados básicos prontos para publicar.",
  },
  {
    number: "02",
    icon: "plus",
    title: "Publique a entrega",
    description:
      "Informe coleta, destino, valor oferecido e confirme o ponto no mapa.",
  },
  {
    number: "03",
    icon: "bike",
    title: "Conecte-se a um motoboy",
    description:
      "Motoboys disponíveis visualizam a oportunidade e decidem livremente se querem aceitar.",
  },
  {
    number: "04",
    icon: "route",
    title: "Acompanhe e organize",
    description:
      "Consulte o andamento, compartilhe o link com o cliente e mantenha o histórico reunido.",
  },
];

const resources: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: "users",
    title: "Disponibilidade",
    description:
      "Publique oportunidades para motoboys disponíveis na plataforma.",
  },
  {
    icon: "route",
    title: "Acompanhamento",
    description: "Visualize as etapas atualizadas durante a entrega.",
  },
  {
    icon: "map-pin",
    title: "Link para o cliente",
    description:
      "Compartilhe um link temporário de acompanhamento quando a entrega permitir.",
  },
  {
    icon: "history",
    title: "Histórico",
    description:
      "Consulte entregas anteriores, status e informações registradas.",
  },
  {
    icon: "star",
    title: "Avaliações",
    description:
      "Registre e consulte experiências depois de entregas concluídas.",
  },
  {
    icon: "heart",
    title: "Favoritos",
    description: "Mantenha bons contatos organizados para consultas futuras.",
  },
  {
    icon: "wallet",
    title: "VaporPay",
    description:
      "Registre de forma declaratória a situação do pagamento da corrida.",
  },
  {
    icon: "map",
    title: "PIN no mapa",
    description: "Confirme visualmente os pontos informados antes de publicar.",
  },
];

const faqs = [
  [
    "A empresa paga para usar a Vapor?",
    "Não. As funções essenciais para empresas são gratuitas: sem mensalidade, sem taxa de cadastro e sem taxa da Vapor para publicar entregas. O Gestão Pro é um upgrade opcional.",
  ],
  [
    "Quem define e paga o valor da corrida?",
    "A empresa define o valor oferecido antes da publicação. O pagamento da entrega é combinado e realizado diretamente entre empresa e motoboy; a Vapor não recebe nem repassa esse dinheiro.",
  ],
  [
    "A Vapor garante que haverá motoboy disponível?",
    "Não. A Vapor aproxima empresas e motoboys independentes. Cada motoboy decide quando ficar disponível e quais oportunidades deseja aceitar.",
  ],
  [
    "Posso continuar trabalhando com os motoboys que já conheço?",
    "Sim. A Vapor não exige exclusividade. Para acompanhar uma entrega dentro da plataforma, o motoboy precisa ter uma conta e participar daquele fluxo.",
  ],
  [
    "Como funciona o link de acompanhamento?",
    "Depois que um motoboy aceita uma entrega elegível, a empresa pode ativar e compartilhar um link temporário. Ele mostra somente os dados necessários e pode ser revogado ou expirar automaticamente.",
  ],
  [
    "O que é o VaporPay?",
    "É um registro declaratório da situação do pagamento combinado entre as partes. Não é carteira, conta digital, gateway, split, escrow ou meio de transferência de dinheiro.",
  ],
  [
    "Preciso contratar o Gestão Pro?",
    "Não. O plano gratuito da empresa continua disponível sem o Gestão Pro. O upgrade é opcional e adiciona métricas e relatórios quando o acesso estiver habilitado.",
  ],
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p
        className={`text-xs font-extrabold uppercase tracking-[.2em] ${
          inverse ? "text-[#ffb4ba]" : "text-brand"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`text-balance mt-3 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl lg:text-5xl ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-4 text-base leading-7 sm:text-lg ${
          inverse ? "text-white/65" : "text-muted"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-white/90 backdrop-blur-xl">
      <div className="page-shell flex min-h-18 items-center justify-between gap-4 py-3">
        <Logo />
        <nav
          className="hidden items-center gap-6 xl:flex"
          aria-label="Navegação principal"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-ink-soft transition hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/entrar"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro/empresa"
            className={buttonStyles({ size: "sm" })}
          >
            Criar conta grátis
          </Link>
        </div>
        <details className="group relative md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-2xl border border-line bg-white text-ink [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Abrir ou fechar menu</span>
            <Icon name="menu" className="size-5 group-open:hidden" />
            <Icon name="x" className="hidden size-5 group-open:block" />
          </summary>
          <nav
            className="absolute right-0 top-14 w-[min(19rem,calc(100vw-2rem))] rounded-3xl border border-line bg-white p-3 shadow-soft"
            aria-label="Navegação móvel"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-bold text-ink-soft hover:bg-brand-light hover:text-brand-dark"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-line pt-3">
              <Link
                href="/entrar"
                className={buttonStyles({ variant: "outline" })}
              >
                Entrar
              </Link>
              <Link href="/cadastro/empresa" className={buttonStyles()}>
                Criar conta grátis
              </Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[36rem]">
      <div className="soft-grid relative overflow-hidden rounded-[2rem] border border-brand/15 bg-white p-4 shadow-[0_30px_90px_rgba(31,31,31,.14)] sm:p-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-brand">
              Nova entrega
            </p>
            <p className="mt-1 font-display text-lg font-extrabold">
              Publique uma oportunidade
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white">
            <Icon name="plus" className="size-5" />
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Coleta", "Informe o ponto de retirada"],
            ["Destino", "Informe o local de entrega"],
          ].map(([label, placeholder]) => (
            <div key={label} className="rounded-2xl border border-line p-3.5">
              <p className="text-xs font-bold text-ink">{label}</p>
              <p className="mt-1 text-xs text-muted">{placeholder}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-3 h-40 overflow-hidden rounded-2xl border border-line bg-brand-soft soft-grid sm:h-48">
          <svg
            viewBox="0 0 500 220"
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
            <path
              d="M-20 170c115-15 125-120 235-86s120 68 305-15"
              fill="none"
              stroke="#ea1d2c"
              strokeWidth="5"
              strokeDasharray="8 10"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute left-[24%] top-[52%] grid size-10 place-items-center rounded-full border-4 border-white bg-ink text-white shadow-card">
            <Icon name="building" className="size-4" />
          </span>
          <span className="absolute right-[20%] top-[28%] grid size-11 place-items-center rounded-full border-4 border-white bg-brand text-white shadow-card">
            <Icon name="map-pin" className="size-5" />
          </span>
          <span className="absolute bottom-3 left-3 rounded-xl bg-white px-3 py-2 text-[11px] font-bold shadow-card">
            Confirme o PIN no mapa
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold sm:text-xs">
          <span className="rounded-xl bg-brand-light px-2 py-3 text-brand-dark">
            Publicada
          </span>
          <span className="rounded-xl bg-canvas px-2 py-3 text-ink-soft">
            Em andamento
          </span>
          <span className="rounded-xl bg-canvas px-2 py-3 text-ink-soft">
            Concluída
          </span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden max-w-[13rem] rounded-2xl border border-line bg-white p-3 shadow-card sm:block">
        <p className="text-xs font-extrabold text-ink">
          Link de acompanhamento
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          Compartilhe com o cliente quando estiver disponível.
        </p>
      </div>
    </div>
  );
}

export function PrelaunchLanding() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <LandingHeader />
      <main className="overflow-x-hidden pb-24 md:pb-0">
        <section className="relative overflow-hidden px-4 pb-18 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_8%,rgba(255,77,90,.16),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(246,185,74,.16),transparent_30%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-brand-dark shadow-sm sm:px-4 sm:text-xs sm:tracking-[.18em]">
                <Icon name="map-pin" className="size-4" />
                Petrolina • Juazeiro • Vale do São Francisco
              </p>
              <h1 className="text-balance mt-6 max-w-3xl font-display text-[2.75rem] font-extrabold leading-[1.01] tracking-[-.06em] sm:text-6xl lg:text-[4.7rem]">
                Precisou de motoboy?
                <span className="block text-brand">Coloca na Vapor. ⚡</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Publique sua entrega, conecte-se a motoboys disponíveis e
                acompanhe tudo em um só lugar.
              </p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-card sm:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-extrabold">
                  R$0
                </span>
                <strong className="font-display text-base tracking-[-.02em] sm:text-lg">
                  GRÁTIS PARA EMPRESAS
                </strong>
              </div>
              <p className="mt-5 text-sm font-bold leading-6 text-ink-soft">
                Sem mensalidade • Sem taxa de cadastro • Sem taxa para publicar
                entregas
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                Você define o valor da corrida e paga diretamente ao motoboy.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro/empresa"
                  className={buttonStyles({ size: "lg" })}
                >
                  Criar conta grátis
                  <Icon name="arrow-right" className="size-5" />
                </Link>
                <Link
                  href="#como-funciona"
                  className={buttonStyles({ variant: "outline", size: "lg" })}
                >
                  Ver como funciona
                </Link>
              </div>
              <p className="mt-4 text-xs font-semibold text-muted sm:text-sm">
                Cadastro da empresa sem cobrança • Comece pelo navegador do
                celular
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section
          id="para-empresas"
          className="scroll-mt-24 border-y border-line bg-white px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="O essencial custa zero"
              title="Sua empresa publica e organiza entregas sem pagar à Vapor."
              description="As funções essenciais da plataforma continuam gratuitas para empresas. O valor de cada corrida é definido pela própria empresa e pago diretamente ao motoboy."
              centered
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["R$ 0", "de mensalidade"],
                ["R$ 0", "de taxa de cadastro"],
                ["R$ 0", "para publicar entregas"],
              ].map(([value, label]) => (
                <article
                  key={label}
                  className="rounded-3xl border border-line bg-canvas p-6 text-center"
                >
                  <p className="font-display text-4xl font-extrabold tracking-[-.05em] text-brand">
                    {value}
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink-soft">
                    {label}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="max-w-3xl text-sm leading-6 text-ink-soft">
                <strong className="text-ink">
                  Pagamento direto entre as partes.
                </strong>{" "}
                A Vapor não cobra comissão sobre a corrida e não movimenta o
                valor da entrega.
              </p>
              <span className="shrink-0 rounded-full border border-brand/20 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                Gestão Pro é opcional
              </span>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="A correria é real"
              title="O problema não é vender. É fazer a entrega caber no dia."
              description="A Vapor organiza a parte operacional que costuma ficar espalhada, sem mudar a forma como sua empresa atende os clientes."
              centered
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {painPoints.map((point) => (
                <article
                  key={point.title}
                  className="rounded-3xl border border-line bg-white p-6 shadow-sm"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Icon name={point.icon} className="size-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-extrabold leading-6">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {point.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Como funciona"
              title="Da conta criada à entrega acompanhada."
              description="Um fluxo direto para publicar a oportunidade, encontrar disponibilidade e manter as informações organizadas."
              centered
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="relative overflow-hidden rounded-3xl border border-line bg-canvas p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white">
                      <Icon name={step.icon} className="size-6" />
                    </span>
                    <span className="font-display text-4xl font-extrabold text-brand/15">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-lg font-extrabold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-9 text-center">
              <Link
                href="/cadastro/empresa"
                className={buttonStyles({ size: "lg" })}
              >
                Publicar minha primeira entrega
                <Icon name="arrow-right" className="size-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-ink px-4 py-16 text-white sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <SectionHeading
                eyebrow="Acompanhamento para o cliente"
                title="Compartilhe a entrega sem compartilhar sua operação."
                description="Quando o acompanhamento estiver disponível, a empresa gera um link temporário para o cliente consultar o andamento. O link não expõe telefone, e-mail, pagamento ou identificadores internos."
                inverse
              />
              <ul className="mt-8 space-y-3 text-sm text-white/75">
                {[
                  "Ative depois que um motoboy aceitar a entrega",
                  "Copie ou compartilhe pelo WhatsApp",
                  "Revogue o acesso quando precisar",
                  "O link expira automaticamente",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Icon
                      name="check"
                      className="mt-0.5 size-5 shrink-0 text-[#ffb4ba]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 soft-grid sm:p-8">
              <div className="rounded-3xl bg-white p-5 text-ink shadow-soft sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand">
                      Acompanhar entrega
                    </p>
                    <p className="mt-1 font-display text-xl font-extrabold">
                      Andamento compartilhado
                    </p>
                  </div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Icon name="map" className="size-6" />
                  </span>
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    ["check", "Entrega aceita"],
                    ["bike", "Deslocamento em andamento"],
                    ["map-pin", "Destino informado"],
                  ].map(([icon, label], index) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-2xl bg-canvas p-3.5"
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-xl ${
                          index === 1
                            ? "bg-brand text-white"
                            : "bg-white text-brand"
                        }`}
                      >
                        <Icon name={icon as IconName} className="size-4" />
                      </span>
                      <span className="text-sm font-bold">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-5 text-muted">
                  A posição depende do compartilhamento ativo do entregador e
                  das condições do aparelho e da rede.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Recursos reais da plataforma"
              title="O que sua empresa encontra na Vapor."
              description="Ferramentas já presentes no produto para publicar, acompanhar e consultar a operação sem promessas de disponibilidade garantida."
              centered
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {resources.map((resource) => (
                <article
                  key={resource.title}
                  className="rounded-3xl border border-line bg-white p-6 transition motion-safe:hover:-translate-y-1 hover:border-brand/25 hover:shadow-card"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Icon name={resource.icon} className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-extrabold">
                    {resource.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {resource.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-brand-soft px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.9fr]">
            <div>
              <SectionHeading
                eyebrow="Sua rede continua sendo sua"
                title="Já tem motoboys de confiança? Ótimo."
                description="Você não precisa abandonar os contatos que já funcionam. Use a Vapor para organizar oportunidades, acompanhar etapas e manter o histórico da operação. Não exigimos exclusividade de empresas nem de motoboys."
              />
              <Link
                href="/cadastro/empresa"
                className={buttonStyles({ size: "lg", className: "mt-8" })}
              >
                Criar conta da empresa
                <Icon name="arrow-right" className="size-5" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                ["users", "Mantenha seus bons contatos por perto"],
                ["heart", "Organize favoritos para consultas futuras"],
                ["history", "Consulte o histórico quando precisar"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-sm"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Icon name={icon as IconName} className="size-5" />
                  </span>
                  <p className="font-display text-base font-extrabold">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="gestao-pro"
          className="scroll-mt-24 bg-[#171313] px-4 py-16 text-white sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-[#ffb4ba]/25 bg-brand/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#ffb4ba]">
                Upgrade opcional
              </span>
              <h2 className="text-balance mt-5 font-display text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                Vapor Gestão Pro
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/65">
                Uma camada extra de métricas e relatórios para empresas que
                querem analisar a operação com mais profundidade.
              </p>
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold leading-6 text-white/85">
                O plano básico gratuito não exige Gestão Pro e não depende dele
                para publicar entregas.
              </p>
              <Link
                href="/cadastro/empresa"
                className={buttonStyles({ className: "mt-7" })}
              >
                Começar no plano grátis
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  "wallet",
                  "Gastos por período",
                  "Soma e custo médio das entregas concluídas no período escolhido.",
                ],
                [
                  "package",
                  "Volume de entregas",
                  "Totais, status e comparação com o período anterior.",
                ],
                [
                  "users",
                  "Gastos por motoboy",
                  "Motoboys mais utilizados e valores registrados na operação.",
                ],
                [
                  "file",
                  "Relatórios e CSV",
                  "Filtros por período e exportação dos dados disponíveis.",
                ],
              ].map(([icon, title, description]) => (
                <article
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand text-white">
                    <Icon name={icon as IconName} className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-extrabold">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="VaporPay"
              title="Registro do pagamento, sem intermediar o dinheiro."
              description="O VaporPay ajuda as partes a registrar a situação do pagamento combinado. A Vapor não recebe, guarda, transfere ou repassa o valor da corrida."
              centered
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                [
                  "01",
                  "Empresa e motoboy combinam",
                  "Valor e forma de pagamento são informados no fluxo da entrega.",
                ],
                [
                  "02",
                  "Pagamento acontece diretamente",
                  "A transação é realizada fora da Vapor, entre as próprias partes.",
                ],
                [
                  "03",
                  "Situação fica registrada",
                  "O histórico declaratório ajuda na organização e na conferência posterior.",
                ],
              ].map(([number, title, description]) => (
                <article
                  key={number}
                  className="rounded-3xl border border-line bg-canvas p-6"
                >
                  <span className="font-display text-4xl font-extrabold text-brand/20">
                    {number}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-extrabold">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {description}
                  </p>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-muted">
              VaporPay não é carteira digital, gateway, split de pagamentos,
              escrow nem conta bancária.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div className="soft-grid relative min-h-80 overflow-hidden rounded-[2rem] border border-brand/15 bg-brand-soft">
              <svg
                viewBox="0 0 500 320"
                className="absolute inset-0 size-full"
                aria-hidden="true"
              >
                <path
                  d="M55 80c105 25 80 120 190 112s105-75 205 22"
                  fill="none"
                  stroke="#ea1d2c"
                  strokeWidth="5"
                  strokeDasharray="8 10"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute left-[14%] top-[19%] rounded-2xl bg-white px-4 py-3 font-display text-sm font-extrabold shadow-card">
                Petrolina/PE
              </span>
              <span className="absolute bottom-[21%] right-[12%] rounded-2xl bg-brand px-4 py-3 font-display text-sm font-extrabold text-white shadow-card">
                Juazeiro/BA
              </span>
              <span className="absolute left-[47%] top-[48%] grid size-14 place-items-center rounded-2xl border-4 border-white bg-ink text-white shadow-soft">
                <Icon name="bike" className="size-7" />
              </span>
            </div>
            <SectionHeading
              eyebrow="Feita para o Vale"
              title="Petrolina e Juazeiro a todo Vapor. ⚡"
              description="A Vapor nasce no Vale do São Francisco para aproximar empresas e motoboys independentes em uma experiência pensada para a rotina das entregas locais."
            />
          </div>
        </section>

        <section className="bg-brand-soft px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <SectionHeading
                eyebrow="Também é motoboy?"
                title="Encontre oportunidades e organize sua rotina."
                description="Crie sua conta, informe quando estiver disponível e escolha livremente as oportunidades que fizerem sentido para você. O plano de acesso do motoboy é apresentado separadamente."
              />
              <Link
                href="/cadastro/motoboy"
                className={buttonStyles({
                  variant: "outline",
                  size: "lg",
                  className: "mt-8",
                })}
              >
                Criar conta de motoboy
                <Icon name="arrow-right" className="size-5" />
              </Link>
            </div>
            <div className="rounded-[2rem] bg-ink p-7 text-white shadow-soft sm:p-9">
              <Icon name="bike" className="size-10 text-[#ffb4ba]" />
              <p className="mt-7 font-display text-2xl font-extrabold">
                Você decide quando e o que aceitar.
              </p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Sem exclusividade, sem vínculo empregatício com a Vapor e com os
                dados essenciais da oportunidade disponíveis antes da escolha.
              </p>
            </div>
          </div>
        </section>

        <section
          id="duvidas"
          className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <SectionHeading
              eyebrow="Perguntas frequentes"
              title="Tudo claro antes de começar."
              description="Respostas diretas sobre gratuidade, pagamentos, disponibilidade e recursos opcionais."
            />
            <div className="space-y-3">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-line bg-canvas p-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                    <span>{question}</span>
                    <Icon
                      name="chevron-down"
                      className="size-5 shrink-0 text-brand transition group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-4 pr-6 text-sm leading-6 text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand px-6 py-12 text-center text-white shadow-soft sm:px-12 sm:py-16">
            <Icon name="sparkles" className="mx-auto size-8 text-[#ffb4ba]" />
            <h2 className="text-balance mx-auto mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">
              Sua próxima entrega pode começar de um jeito mais simples.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              Crie a conta da empresa gratuitamente e deixe a Vapor pronta para
              quando a correria chegar.
            </p>
            <Link
              href="/cadastro/empresa"
              className={buttonStyles({
                variant: "secondary",
                size: "lg",
                className: "mt-8",
              })}
            >
              Criar conta grátis
              <Icon name="arrow-right" className="size-5" />
            </Link>
            <p className="mt-4 text-xs font-semibold text-white/70">
              Sem mensalidade • Sem taxa de cadastro • Sem taxa para publicar
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white px-4 pb-28 pt-12 sm:px-6 md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-10 pb-10 md:grid-cols-[1.35fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
              Tecnologia local para aproximar empresas e motoboys independentes
              em Petrolina e Juazeiro.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Produto</h2>
            <nav
              className="mt-4 flex flex-col gap-3 text-sm text-muted"
              aria-label="Links do produto"
            >
              <Link href="#como-funciona">Como funciona</Link>
              <Link href="#recursos">Recursos</Link>
              <Link href="#gestao-pro">Gestão Pro</Link>
              <Link href="/entrar">Entrar</Link>
            </nav>
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Transparência</h2>
            <nav
              className="mt-4 flex flex-col gap-3 text-sm text-muted"
              aria-label="Links legais"
            >
              <Link href="/termos">Termos de Uso</Link>
              <Link href="/privacidade">Política de Privacidade</Link>
              <Link href="/regras">Regras operacionais</Link>
              <Link href="/cadastro/motoboy">Sou motoboy</Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-line py-5 text-xs text-muted">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© Vapor Entregas.</p>
            <p>Petrolina/PE · Juazeiro/BA</p>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 shadow-[0_-12px_35px_rgba(31,31,31,.1)] backdrop-blur md:hidden">
        <Link
          href="/cadastro/empresa"
          className={buttonStyles({ className: "w-full" })}
        >
          Criar conta grátis
          <Icon name="arrow-right" className="size-5" />
        </Link>
      </div>
    </div>
  );
}
