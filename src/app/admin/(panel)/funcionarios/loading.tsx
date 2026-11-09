import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="mt-4 rounded-xl border bg-card p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="my-3 flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
