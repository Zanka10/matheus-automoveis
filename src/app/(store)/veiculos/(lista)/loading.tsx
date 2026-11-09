import { Skeleton } from "@/components/ui/card";

export default function CatalogLoading() {
  return (
    <>
      <div className="bg-graphite pb-16 pt-[120px]">
        <div className="container-page">
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="mt-5 h-12 w-full max-w-xl bg-white/10" />
          <Skeleton className="mt-4 h-5 w-full max-w-md bg-white/10" />
        </div>
      </div>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[290px_1fr] lg:py-14">
        <Skeleton className="hidden h-[640px] rounded-2xl lg:block" />
        <div>
          <div className="mb-6 flex justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-10 w-48 rounded-full" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                <Skeleton className="aspect-[4/3] rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
