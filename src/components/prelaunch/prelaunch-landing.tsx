import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/icons/icon";
import { PreRegistrationForm } from "@/components/prelaunch/pre-registration-form";
import { buttonStyles } from "@/components/ui/button";

const painPoints = [
  "Pedido pronto e nenhum motoboy disponível?",
  "Perde tempo procurando alguém para fazer uma entrega?",
  "Precisa conversar em vários lugares até encontrar quem possa ir?",
  "No fim do dia, fica difícil acompanhar quem realizou cada entrega?",
];

const steps: Array<{
  number: string;
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    number: "01",
    icon: "package",
    title: "Publique",
    description: "Informe retirada, destino, valor e os detalhes da entrega.",
  },
  {
    number: "02",
    icon: "bike",
    title: "Conecte",
    description:
      "Motoboys disponíveis na plataforma podem visualizar a oportunidade.",
  },
  {
    number: "03",
    icon: "history",
    title: "Acompanhe",
    description:
      "Gerencie a entrega e mantenha seu histórico organizado pelo App.",
  },
];

const benefits: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: "users",
    title: "Encontre disponibilidade",
    description:
      "Surgiu uma entrega? Publique a oportunidade para motoboys disponíveis na plataforma.",
  },
  {
    icon: "user",
    title: "Saiba com quem está entregando",
    description:
      "Consulte as informações disponíveis e construa sua própria rede de contatos.",
  },
  {
    icon: "heart",
    title: "Gostou do serviço? Mantenha por perto",
    description:
      "Use favoritos e histórico para manter bons contatos organizados.",
  },
  {
    icon: "history",
    title: "Pare de depender da memória",
    description:
      "Consulte seu histórico e mantenha as entregas anteriores organizadas.",
  },
  {
    icon: "smartphone",
    title: "Tudo pelo celular",
    description:
      "Tenha a Vapor no seu aparelho e acesse a plataforma de onde estiver.",
  },
];

const comparison = [
  ["Procurar quem está disponível", "Publicar uma oportunidade"],
  ["Conversas espalhadas", "Informações centralizadas"],
  ["Tentar lembrar entregas anteriores", "Consultar histórico"],
  ["Encontrar novamente um bom contato", "Manter favoritos organizados"],
  ["Organizar informações manualmente", "Acompanhar pelo sistema"],
];

const faqs = [
  [
    "A Vapor é uma empresa de motoboys?",
    "Não. A Vapor é uma plataforma que facilita a conexão entre empresas e motoboys independentes.",
  ],
  [
    "Vou precisar instalar alguma coisa?",
    "Não é obrigatório. A Vapor funciona pelo navegador do celular e também pode ser instalada no aparelho como App.",
  ],
  [
    "Preciso mudar a forma como minha empresa trabalha?",
    "Não. Você usa a Vapor quando precisar publicar, acompanhar e organizar uma entrega.",
  ],
  [
    "A Vapor já está funcionando?",
    "Estamos em pré-lançamento. A abertura está marcada para 25 de setembro de 2026.",
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
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand">
        {eyebrow}
      </p>
      <h2 className="text-balance mt-3 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export function PrelaunchLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <section className="relative overflow-hidden px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,rgba(255,77,90,.14),transparent_28%),radial-gradient(circle_at_90%_5%,rgba(234,29,44,.12),transparent_34%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="hidden items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-2 text-xs font-bold text-ink-soft shadow-sm sm:inline-flex">
              <Icon name="map-pin" className="size-4 text-brand" /> Vale do São
              Francisco
            </span>
          </div>

          <div className="grid items-center gap-9 py-9 lg:grid-cols-[1.08fr_.92fr] lg:gap-14 lg:py-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-light px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-brand-dark sm:px-4 sm:text-xs">
                <Icon name="calendar" className="size-4" /> Lançamento • 25 de
                setembro
              </span>
              <h1 className="text-balance mt-5 max-w-3xl font-display text-[2.65rem] font-extrabold leading-[1.01] tracking-[-.055em] sm:text-6xl lg:text-[4.5rem]">
                Pedido pronto. Entrega sem complicação.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
                Encontre motoboys disponíveis para as entregas da sua empresa em
                Petrolina e Juazeiro através do App da Vapor.
              </p>
              <p className="mt-4 font-display text-xl font-extrabold text-brand sm:text-2xl">
                Sua empresa a todo Vapor. ⚡
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="#pre-cadastro"
                  className={buttonStyles({ size: "lg" })}
                >
                  Quero participar do lançamento
                  <Icon name="arrow-right" className="size-5" />
                </Link>
                <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink-soft">
                  <Icon name="smartphone" className="size-5 text-brand" /> App
                  para celular
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold text-muted sm:text-sm">
                Pré-cadastro gratuito • Sem compromisso • Vale do São Francisco
              </p>
            </div>

            <div
              id="pre-cadastro"
              className="scroll-mt-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgba(31,31,31,.12)] sm:p-7"
            >
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
                Entre para o lançamento
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
                Conheça a Vapor desde o começo.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Deixe seus dados para receber novidades da abertura em 25 de
                setembro.
              </p>
              <div className="mt-5">
                <PreRegistrationForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="A rotina real"
            title="Sua empresa já passou por isso?"
            description="Entregar faz parte da operação. Encontrar disponibilidade e manter as informações organizadas não precisa consumir seu dia."
            centered
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {painPoints.map((pain, index) => (
              <article
                key={pain}
                className="rounded-3xl border border-line bg-canvas p-5 sm:p-6"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-brand-light font-display text-sm font-extrabold text-brand">
                  0{index + 1}
                </span>
                <p className="mt-5 font-display text-lg font-extrabold leading-6">
                  {pain}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-base font-bold text-brand-dark sm:text-lg">
            É justamente essa parte da operação que a Vapor quer simplificar.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-[2rem] bg-ink p-6 text-white shadow-soft sm:p-8">
            <span className="grid size-13 place-items-center rounded-2xl bg-brand text-white">
              <Icon name="sparkles" className="size-6" />
            </span>
            <p className="mt-8 text-sm font-extrabold uppercase tracking-[.18em] text-[#ffb4ba]">
              Precisou entregar?
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
              Coloca na Vapor. ⚡
            </p>
            <p className="mt-5 text-base leading-7 text-white/65">
              Abra o App, publique sua entrega e conecte sua empresa a motoboys
              independentes disponíveis na plataforma.
            </p>
          </div>
          <div>
            <SectionHeading
              eyebrow="Como funciona"
              title="Da sua empresa para a rua em poucos passos."
              description="Uma forma simples de organizar suas entregas sem tirar o foco do que realmente importa: vender e atender seus clientes."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-3xl border border-line bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-light text-brand">
                      <Icon name={step.icon} className="size-5" />
                    </span>
                    <span className="font-display text-2xl font-extrabold text-brand/20">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-extrabold uppercase">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-6 font-display text-xl font-extrabold text-ink">
              Menos tempo procurando. Mais tempo cuidando do seu negócio.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand-soft px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="App da Vapor"
              title="A Vapor vai com sua empresa. 📱"
              description="Acesse a plataforma pelo celular e tenha a experiência da Vapor sempre à mão para publicar e acompanhar suas entregas."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Use pelo celular",
                "Instale a Vapor no seu aparelho",
                "Publique entregas onde estiver",
                "Acompanhe sua operação pelo App",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-bold shadow-sm"
                >
                  <Icon name="check" className="size-5 shrink-0 text-brand" />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-7 font-display text-xl font-extrabold text-brand-dark">
              Seu negócio não fica parado. Seu App de entregas também não.
            </p>
          </div>
          <div className="soft-grid relative mx-auto flex min-h-[28rem] w-full max-w-md items-center justify-center overflow-hidden rounded-[2.5rem] border border-brand/15 bg-white p-8 shadow-soft">
            <div className="absolute -right-16 -top-16 size-52 rounded-full bg-brand/15 blur-3xl" />
            <div className="relative w-64 rounded-[2.5rem] border-[8px] border-ink bg-white p-4 shadow-[0_28px_80px_rgba(31,31,31,.2)]">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-ink/15" />
              <div className="mt-5 rounded-3xl bg-brand p-5 text-white">
                <Icon name="package" className="size-7" />
                <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-white/70">
                  Sua empresa
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold">
                  A todo Vapor.
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["plus", "Publicar entrega"],
                  ["route", "Acompanhar operação"],
                  ["history", "Consultar histórico"],
                ].map(([icon, label]) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-line p-3 text-xs font-bold"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-brand-light text-brand">
                      <Icon name={icon as IconName} className="size-4" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Benefícios para empresas"
            title="Mais controle para quem precisa entregar todos os dias."
            description="Recursos que já existem na plataforma para organizar sua rotina e manter boas conexões por perto."
            centered
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-3xl border border-line bg-canvas p-6 transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-light text-brand">
                  <Icon name={benefit.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-extrabold">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <SectionHeading
            eyebrow="Sem mudar o que funciona"
            title="A Vapor não quer mudar seu negócio. Quer facilitar uma parte dele."
            description="Você continua vendendo do seu jeito, atendendo seus clientes e decidindo quando precisa de uma entrega. A Vapor entra quando sua empresa precisa encontrar quem possa entregar."
          />
          <div className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft">
            <div className="grid grid-cols-2 border-b border-line bg-ink px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[.14em] text-white sm:px-6">
              <span className="text-white/55">Na correria</span>
              <span className="text-[#ffb4ba]">Com a Vapor</span>
            </div>
            {comparison.map(([before, after]) => (
              <div
                key={before}
                className="grid grid-cols-2 border-b border-line px-4 py-4 text-sm last:border-0 sm:px-6"
              >
                <span className="pr-4 text-muted">{before}</span>
                <span className="flex gap-2 font-bold text-ink">
                  <Icon
                    name="check"
                    className="mt-0.5 size-4 shrink-0 text-brand"
                  />
                  {after}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#ffb4ba]">
              Feita para o Vale
            </p>
            <h2 className="text-balance mt-3 font-display text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
              Petrolina e Juazeiro a todo Vapor. ⚡
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
              A Vapor nasce no Vale do São Francisco para aproximar empresas e
              motoboys independentes em uma plataforma pensada para a rotina das
              entregas locais.
            </p>
            <p className="mt-4 max-w-3xl font-bold text-white/85">
              Começamos por Petrolina e Juazeiro. É daqui que a Vapor começa a
              se movimentar.
            </p>
          </div>
          <div className="soft-grid relative min-h-64 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
            <Icon
              name="map"
              className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 text-white/10"
            />
            <span className="absolute left-[24%] top-[34%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-ink shadow-card">
              <Icon name="map-pin" className="size-4 text-brand" /> Petrolina
            </span>
            <span className="absolute bottom-[28%] right-[16%] flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-xs font-extrabold text-white shadow-card">
              <Icon name="map-pin" className="size-4" /> Juazeiro
            </span>
            <svg
              viewBox="0 0 500 260"
              className="absolute inset-0 size-full"
              aria-hidden="true"
            >
              <path
                d="M150 95c70 10 105 70 205 75"
                fill="none"
                stroke="#ffb4ba"
                strokeWidth="4"
                strokeDasharray="8 10"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-brand/15 bg-brand-soft p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white">
              <Icon name="bike" className="size-6" />
            </span>
            <h2 className="mt-6 font-display text-3xl font-extrabold tracking-[-.04em]">
              Também é motoboy? A Vapor é para você.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Faça parte da plataforma, fique disponível quando quiser e
              visualize oportunidades de entrega de empresas da região.
            </p>
            <p className="mt-3 font-bold text-ink-soft">
              Você escolhe quando ficar disponível e quais oportunidades fazem
              sentido para você.
            </p>
            <Link
              href="#pre-cadastro"
              className={buttonStyles({
                variant: "outline",
                className: "mt-6 bg-white",
              })}
            >
              Sou motoboy e quero participar
            </Link>
          </div>
          <div>
            <SectionHeading
              eyebrow="Perguntas frequentes"
              title="Entenda antes de entrar."
              description="Sem promessas exageradas: uma plataforma local para conectar e organizar."
            />
            <div className="mt-7 space-y-3">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-line bg-canvas p-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {question}
                    <Icon
                      name="chevron-down"
                      className="size-5 shrink-0 text-brand transition group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-4 pr-7 text-sm leading-6 text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand px-6 py-12 text-center text-white shadow-soft sm:px-12 sm:py-16">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-white/70">
            25 de setembro de 2026
          </p>
          <h2 className="text-balance mx-auto mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">
            Sua próxima entrega pode começar de um jeito mais simples.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Faça seu pré-cadastro e coloque sua empresa entre as primeiras a
            conhecer o App da Vapor em Petrolina e Juazeiro.
          </p>
          <p className="mt-5 font-display text-xl font-extrabold">
            Sua empresa a todo Vapor. ⚡
          </p>
          <Link
            href="#pre-cadastro"
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "mt-8",
            })}
          >
            Quero participar do lançamento
          </Link>
          <p className="mt-4 text-xs font-semibold text-white/70">
            Pré-cadastro gratuito • Sem compromisso
          </p>
        </div>
      </section>

      <footer className="border-t border-line bg-white px-4 py-8 text-center text-xs text-muted">
        <p>© Vapor Entregas • Petrolina-PE e Juazeiro-BA</p>
        <div className="mt-3 flex justify-center gap-5">
          <Link href="/termos" className="font-bold hover:text-brand">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="font-bold hover:text-brand">
            Política de Privacidade
          </Link>
        </div>
      </footer>
    </main>
  );
}
