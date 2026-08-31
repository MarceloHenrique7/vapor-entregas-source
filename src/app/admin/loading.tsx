import { Skeleton } from "@/components/ui/skeleton";
export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
    </div>
  );
}
