import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginação baseada em URL (preserva os demais parâmetros de busca) */
export function Pagination({
  page,
  pages,
  total,
  basePath,
  params,
  pageParam = "pagina",
}: {
  page: number;
  pages: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
  pageParam?: string;
}) {
  if (pages <= 1) return <p className="px-1 text-xs text-muted-foreground">{total} registro(s)</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== pageParam) sp.set(k, v);
    if (p > 1) sp.set(pageParam, String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const btn = "inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-sm transition-colors hover:bg-muted";
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p className="text-xs text-muted-foreground">
        Página {page} de {pages} · {total} registro(s)
      </p>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} className={cn(btn, page <= 1 && "pointer-events-none opacity-40")} href={href(page - 1)}>
          <ChevronLeft className="size-4" /> Anterior
        </Link>
        <Link aria-disabled={page >= pages} className={cn(btn, page >= pages && "pointer-events-none opacity-40")} href={href(page + 1)}>
          Próxima <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
