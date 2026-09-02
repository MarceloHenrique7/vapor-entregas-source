import Link from "next/link";
import type { Metadata } from "next";

import { Icon, type IconName } from "@/components/icons/icon";
import { Footer } from "@/components/marketing/footer";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { Navbar } from "@/components/marketing/navbar";
import { PublicPlans } from "@/components/subscriptions/public-plans";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrelaunchLanding } from "@/components/prelaunch/prelaunch-landing";
import { getPrelaunchEnv } from "@/server/config/env";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  if (!getPrelaunchEnv().enabled) return {};
  const title = "Vapor Entregas | Lançamento em 25 de setembro";
  const description =
    "O App da Vapor chega a Petrolina e Juazeiro em 25 de setembro para conectar empresas e motoboys independentes.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

const steps = [
  {
    number: "01",
    title: "Publique",
    description:
      "Informa coleta, destino, valor oferecido e forma de pagamento.",
  },
  {
    number: "02",
    title: "Conecte",
    description:
      "Visualiza os dados essenciais e aceita livremente a oportunidade.",
  },
  {
    number: "03",
    title: "Acompanhe",
    description: "O fluxo e o histórico ficam organizados em um único lugar.",
  },
];

const benefits: Array<{ icon: IconName; title: string; description: string }> =
  [
    {
      icon: "building",
      title: "Encontre disponibilidade",
      description:
        "Publique oportunidades para motoboys disponíveis na plataforma.",
    },
    {
      icon: "heart",
      title: "Mantenha bons contatos por perto",
      description:
        "Use avaliações, favoritos e histórico para organizar suas próprias referências.",
    },
    {
      icon: "history",
      title: "Pare de depender da memória",
      description:
        "Registros ajudam empresa e motoboy a acompanhar o que aconteceu em cada entrega.",
    },
    {
      icon: "smartphone",
      title: "Tudo pelo celular",
      description:
        "Tenha a Vapor no seu aparelho e acompanhe a operação de onde estiver.",
    },
  ];

const faqs = [
  [
    "A Vapor Entregas faz as entregas?",
    "Não. A Vapor Entregas é uma ferramenta tecnológica que aproxima empresas e motoboys independentes.",
  ],
  [
    "Quem paga o valor da corrida?",
    "O pagamento é combinado e realizado diretamente entre empresa e motoboy. A plataforma não movimenta esse valor.",
  ],
  [
    "O motoboy é obrigado a aceitar oportunidades?",
    "Não. Cada motoboy decide livremente quando ficar disponível e quais oportunidades deseja aceitar.",
  ],
  [
    "Vocês solicitam CNH ou fotos no cadastro?",
    "Nesta versão inicial não solicitamos número ou foto de CNH, selfie, foto de RG ou documentos do veículo.",
  ],
  [
    "Onde a Vapor Entregas começa?",
    "A operação inicial foi pensada para Petrolina/PE e Juazeiro/BA.",
  ],
  [
    "Preciso instalar alguma coisa?",
    "Não é obrigatório. A Vapor funciona pelo navegador do celular e também pode ser instalada no aparelho como App.",
  ],
];

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand">
        {eyebrow}
      </p>
      <h2 className="text-balance mt-3 font-display text-3xl font-extrabold tracking-[-.035em] text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  if (getPrelaunchEnv().enabled) return <PrelaunchLanding />;
  return (
    <>
      <Navbar />
      <main>
        <section className="relative overflow-hidden pb-20 pt-12 sm:pt-18 lg:pb-28 lg:pt-22">
          <div className="absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_12%_15%,rgba(255,77,90,.12),transparent_30%),radial-gradient(circle_at_78%_16%,rgba(234,29,44,.1),transparent_36%)]" />
          <div className="page-shell grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            <div>
              <Badge variant="success">
                <span className="size-2 rounded-full bg-brand" /> Feita para o
                Vale
              </Badge>
              <h1 className="text-balance mt-6 max-w-3xl font-display text-[2.8rem] font-extrabold leading-[1.04] tracking-[-.05em] text-ink sm:text-6xl lg:text-[4.25rem]">
                Pedido pronto. Entrega sem complicação.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Encontre motoboys disponíveis para as entregas da sua empresa em
                Petrolina e Juazeiro através do App da Vapor.
              </p>
              <p className="mt-4 font-display text-xl font-extrabold text-brand sm:text-2xl">
                Sua empresa a todo Vapor. ⚡
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro/empresa"
                  className={buttonStyles({ size: "lg" })}
                >
                  Começar com a Vapor
                  <Icon name="arrow-right" className="size-5" />
                </Link>
                <Link
                  href="/cadastro/motoboy"
                  className={buttonStyles({ variant: "outline", size: "lg" })}
                >
                  Sou motoboy
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-soft">
                <span className="flex items-center gap-2">
                  <Icon name="smartphone" className="size-4 text-brand" /> App
                  para celular
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="map-pin" className="size-4 text-brand" />
                  Petrolina + Juazeiro
                </span>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section id="como-funciona" className="bg-white py-20 sm:py-28">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Como funciona"
              title="Da sua empresa para a rua em poucos passos."
              description="Abra o App, publique sua entrega e conecte sua empresa a motoboys independentes disponíveis na plataforma."
              centered
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <Card
                  key={step.number}
                  className="relative overflow-hidden p-7"
                >
                  <span className="font-display text-5xl font-extrabold text-brand-light">
                    {step.number}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-extrabold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {step.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="py-20 sm:py-28">
          <div className="page-shell">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <SectionHeading
                  eyebrow="Benefícios para empresas"
                  title="Mais controle para quem precisa entregar todos os dias."
                  description="Uma experiência local para publicar, acompanhar e manter seu histórico organizado pelo App."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <Card
                    key={benefit.title}
                    className="group p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-soft"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand-light text-brand transition group-hover:bg-brand group-hover:text-white">
                      <Icon name={benefit.icon} className="size-6" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-extrabold">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {benefit.description}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-white sm:py-28">
          <div className="page-shell grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#ffb4ba]">
                Do pedido ao histórico
              </p>
              <h2 className="text-balance mt-3 font-display text-3xl font-extrabold tracking-[-.035em] sm:text-4xl">
                Cada etapa visível. Cada responsabilidade bem definida.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/65">
                A empresa informa os dados da oportunidade. O motoboy avalia e
                decide se deseja aceitar. Depois, ambos atualizam e consultam o
                andamento.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "Valor e forma de pagamento informados antes do aceite",
                  "Pagamento direto entre empresa e motoboy",
                  "Cancelamentos e mudanças registrados",
                  "Histórico disponível para consulta",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80"
                  >
                    <Icon
                      name="check"
                      className="mt-0.5 size-5 shrink-0 text-[#ffb4ba]"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[28rem] overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/5 p-5 soft-grid">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,29,44,.24),transparent_55%)]" />
              <div className="relative space-y-3">
                {[
                  {
                    icon: "building" as const,
                    label: "Oportunidade publicada",
                    meta: "Coleta no Centro · destino informado",
                  },
                  {
                    icon: "bike" as const,
                    label: "Aceite livre",
                    meta: "Dados essenciais visíveis antes da escolha",
                  },
                  {
                    icon: "route" as const,
                    label: "Fluxo acompanhado",
                    meta: "Etapas atualizadas pelos participantes",
                  },
                  {
                    icon: "history" as const,
                    label: "Registro concluído",
                    meta: "Histórico acessível para os dois lados",
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#2b2021]/90 p-4"
                    style={{ marginLeft: `${index * 5}%` }}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#ffb4ba]">
                      <Icon name={item.icon} className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="mt-1 text-xs text-white/55">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="page-shell grid items-center gap-12 lg:grid-cols-2">
            <div className="soft-grid relative min-h-[25rem] overflow-hidden rounded-[2.25rem] border border-line bg-canvas">
              <div className="absolute left-[18%] top-[25%] size-5 rounded-full border-4 border-white bg-brand shadow-card" />
              <div className="absolute bottom-[25%] right-[20%] size-5 rounded-full border-4 border-white bg-sun shadow-card" />
              <svg
                viewBox="0 0 500 400"
                className="absolute inset-0 size-full"
                aria-hidden="true"
              >
                <path
                  d="M100 110c85 40 85 125 170 120s65 65 135 70"
                  fill="none"
                  stroke="#ea1d2c"
                  strokeWidth="5"
                  strokeDasharray="7 10"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white p-4 shadow-card">
                <Badge variant="info">Feita para o Vale</Badge>
                <p className="mt-2 font-display text-lg font-extrabold">
                  Coleta e destino organizados
                </p>
                <p className="mt-1 text-sm text-muted">
                  Confirme pontos no mapa e mantenha as informações da entrega
                  reunidas.
                </p>
              </div>
            </div>
            <SectionHeading
              eyebrow="Feita para o Vale"
              title="Petrolina e Juazeiro a todo Vapor. ⚡"
              description="A Vapor nasce no Vale do São Francisco para aproximar empresas e motoboys independentes em uma plataforma pensada para a rotina das entregas locais."
            />
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Confiança construída com contexto"
              title="Avaliações e histórico para decisões mais informadas."
              description="Avaliações, favoritos e entregas concluídas ajudam sua empresa a consultar experiências anteriores e manter bons contatos organizados."
              centered
            />
            <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
              <Card className="p-7">
                <div className="flex gap-1 text-sun">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Icon
                      key={index}
                      name="star"
                      className="size-5 fill-current"
                    />
                  ))}
                </div>
                <p className="mt-5 font-display text-xl font-extrabold">
                  Experiências dos dois lados
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Empresa avalia motoboy e motoboy avalia empresa após a
                  conclusão.
                </p>
              </Card>
              <Card className="p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-light text-brand">
                    <Icon name="history" className="size-5" />
                  </span>
                  <Badge>Organização</Badge>
                </div>
                <p className="mt-5 font-display text-xl font-extrabold">
                  Histórico organizado
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Status, horários e ocorrências reunidos para consulta
                  responsável.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section id="precos" className="bg-white py-20 sm:py-28">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Preços provisórios"
              title="Acesso simples, sem comissão sobre a corrida."
              description="Os valores abaixo liberam 30 dias de acesso à plataforma. O valor de cada entrega continua sendo pago diretamente entre empresa e motoboy."
              centered
            />
            <div className="mx-auto mt-12 max-w-3xl">
              <PublicPlans />
            </div>
            <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-muted">
              Planos provisórios e sujeitos a alteração. Eventuais períodos de
              teste são exibidos somente quando estiverem ativos no plano.
            </p>
          </div>
        </section>

        <section id="faq" className="py-20 sm:py-28">
          <div className="page-shell grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <SectionHeading
              eyebrow="Perguntas frequentes"
              title="Transparência desde o primeiro acesso."
              description="A Vapor Entregas começa pequena, com funções claras e poucos dados."
            />
            <div className="space-y-3">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-line bg-white p-5 shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    <span>{question}</span>
                    <Icon
                      name="chevron-down"
                      className="size-5 shrink-0 text-brand transition group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-4 pr-8 text-sm leading-6 text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:pb-28">
          <div className="page-shell overflow-hidden rounded-[2.5rem] bg-brand px-6 py-12 text-center text-white shadow-soft sm:px-12 sm:py-16">
            <Icon name="sparkles" className="mx-auto size-8 text-[#ffb4ba]" />
            <h2 className="text-balance mx-auto mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
              Sua próxima entrega pode começar de um jeito mais simples.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/75">
              Coloque sua empresa a todo Vapor em Petrolina e Juazeiro.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/cadastro/empresa"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                Criar conta de empresa
              </Link>
              <Link
                href="/cadastro/motoboy"
                className={buttonStyles({
                  variant: "outline",
                  size: "lg",
                  className:
                    "border-white/30 bg-white/10 text-white hover:bg-white/20",
                })}
              >
                Sou motoboy
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
