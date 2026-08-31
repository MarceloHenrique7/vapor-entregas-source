import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="page-shell py-12" aria-label="Carregando">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-6 h-16 max-w-2xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </main>
  );
}
