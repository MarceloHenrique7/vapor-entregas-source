import { Icon, type IconName } from "@/components/icons/icon";
import { Card } from "@/components/ui/card";
export function DashboardHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: IconName;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
          <p className="mt-2 text-xs text-muted">{note}</p>
        </div>
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-light text-brand">
          <Icon name={icon} className="size-5" />
        </span>
      </div>
    </Card>
  );
}
