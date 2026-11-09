import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginação baseada em URL (mantém os demais filtros) */
export function Pagination({
  page,
  pageCount,
  total,
  searchParams,
  basePath,
  param = "pagina",
}: {
  page: number;
  pageCount: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  param?: string;
}) {
  if (pageCount <= 1) return <p className="text-sm text-muted-foreground">{total} registro(s)</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== param) sp.set(k, v);
    if (p > 1) sp.set(param, String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const btn = "inline-flex h-9 items-center gap-1 rounded-lg border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted";
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Paginação">
      <p className="text-sm text-muted-foreground">
        Página <span className="font-medium text-foreground">{page}</span> de {pageCount} · {total} registro(s)
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={btn} href={href(page - 1)} scroll={false}>
            <ChevronLeft className="size-4" /> Anterior
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" /> Anterior
          </span>
        )}
        {page < pageCount ? (
          <Link className={btn} href={href(page + 1)} scroll={false}>
            Próxima <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-40")}>
            Próxima <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
