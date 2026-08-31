import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyLocationLoading() {
  return (
    <div className="space-y-7" aria-label="Carregando localização da empresa">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-5 w-[32rem] max-w-full" />
      </div>
      <Card className="space-y-5 p-6">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <Skeleton className="h-28 w-full rounded-none" />
        <Skeleton className="h-[26rem] w-full rounded-none" />
      </Card>
    </div>
  );
}
