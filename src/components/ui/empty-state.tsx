import type { IconName } from "@/components/icons/icon";
import { Icon } from "@/components/icons/icon";
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-light text-brand">
        <Icon name={icon} className="size-7" />
      </span>
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
