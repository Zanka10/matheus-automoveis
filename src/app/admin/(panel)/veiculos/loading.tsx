import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando veículos">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-6 h-4 w-96 max-w-full" />
      <Skeleton className="mb-4 h-10 w-full" />
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="aspect-[4/3] w-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
