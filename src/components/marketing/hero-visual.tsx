import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
      <div className="soft-grid relative aspect-[1/1.03] overflow-hidden rounded-[2.5rem] border border-brand/15 bg-brand-soft shadow-soft">
        <div className="absolute -right-14 -top-16 size-56 rounded-full bg-sun/35 blur-2xl" />
        <div className="absolute -bottom-16 -left-14 size-64 rounded-full bg-brand/20 blur-3xl" />
        <svg
          viewBox="0 0 500 510"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <path
            d="M35 130c110 35 95 95 180 105s100-75 245-18M40 380c105-55 150 15 230-25s100-95 190-65"
            fill="none"
            stroke="#f4b9bf"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M80 70c70 55 120 30 160 75s18 115 105 135 95 90 110 165"
            fill="none"
            stroke="#fadadd"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute left-[14%] top-[18%] grid size-14 place-items-center rounded-2xl bg-white text-brand shadow-card">
          <Icon name="building" className="size-7" />
        </div>
        <div className="absolute bottom-[18%] right-[14%] grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-card">
          <Icon name="package" className="size-7" />
        </div>
        <div className="absolute left-[24%] top-[30%] h-[42%] w-[50%]">
          <svg viewBox="0 0 240 220" className="size-full" aria-hidden="true">
            <path
              d="M12 14c95 10 20 100 118 105s55 75 99 90"
              fill="none"
              stroke="#ea1d2c"
              strokeWidth="5"
              strokeDasharray="7 9"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="animate-float absolute left-[47%] top-[46%] grid size-16 place-items-center rounded-[1.4rem] border-4 border-white bg-ink text-white shadow-soft">
          <Icon name="bike" className="size-8" />
        </div>
        <div className="absolute bottom-6 left-6 right-6 rounded-[1.5rem] border border-line bg-white/95 p-4 shadow-card backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">
                Visão organizada
              </p>
              <p className="mt-1 font-display text-lg font-extrabold">
                Entrega local em um só fluxo
              </p>
            </div>
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-brand" /> Local
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-canvas p-2">
              <b className="block text-sm">Publicar</b>
              <span className="text-[11px] text-muted">empresa</span>
            </div>
            <div className="rounded-xl bg-canvas p-2">
              <b className="block text-sm">Escolher</b>
              <span className="text-[11px] text-muted">motoboy</span>
            </div>
            <div className="rounded-xl bg-canvas p-2">
              <b className="block text-sm">Acompanhar</b>
              <span className="text-[11px] text-muted">ambos</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-3 top-[11%] hidden rounded-2xl bg-white px-4 py-3 shadow-card sm:block">
        <p className="text-xs font-semibold text-muted">Feito para o Vale</p>
        <p className="mt-0.5 text-sm font-extrabold">Petrolina ↔ Juazeiro</p>
      </div>
    </div>
  );
}
