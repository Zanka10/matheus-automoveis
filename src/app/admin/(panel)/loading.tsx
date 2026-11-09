import { Skeleton } from "@/components/ui/card";

/** Esqueleto genérico do painel (cabeçalho + indicadores + conteúdo) */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-80 rounded-xl" />
    </div>
  );
}
