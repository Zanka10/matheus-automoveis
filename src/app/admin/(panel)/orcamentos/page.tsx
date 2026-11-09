import Link from "next/link";
import type { QuoteStatus } from "@prisma/client";
import { ArrowLeftRight, Columns3, Inbox, Landmark, List } from "lucide-react";
import { PageHeader, EmptyState, StatusPill } from "@/components/admin/page-header";
import { Card, Table, TBody, TD, TH, THead, TR } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/primitives";
import { QuoteFilters } from "@/components/admin/quotes/quote-filters";
import { Pagination } from "@/components/admin/quotes/pagination";
import { formatDateTime, formatPhone, relativeTime } from "@/lib/format";
import { quoteStatusLabels, quoteStatusOrder, quoteStatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { listAssignableUsers, listQuotes, listQuotesBoard, type QuoteListFilters } from "@/server/services/quotes-admin";

export const metadata = { title: "Orçamentos" };

type SP = { status?: string; q?: string; responsavel?: string; de?: string; ate?: string; pagina?: string; view?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  if (!can(user, "quotes.view") && !can(user, "quotes.viewAll")) redirect("/admin/acesso-negado");
  const sp = await searchParams;
  const status = quoteStatusOrder.includes(sp.status as QuoteStatus) ? (sp.status as QuoteStatus) : undefined;
  const filters: QuoteListFilters = {
    status,
    q: sp.q?.slice(0, 80),
    responsavel: sp.responsavel?.slice(0, 40),
    de: sp.de,
    ate: sp.ate,
    pagina: Number(sp.pagina) || 1,
  };
  const view = sp.view === "quadro" ? "quadro" : "lista";
  const canSeeAll = can(user, "quotes.viewAll");

  const [data, users, board] = await Promise.all([
    listQuotes(user, filters),
    canSeeAll ? listAssignableUsers() : Promise.resolve([]),
    view === "quadro" ? listQuotesBoard(user, filters) : Promise.resolve([]),
  ]);
  const totalAll = Object.values(data.counts).reduce((a, b) => a + b, 0);

  const linkWith = (patch: Partial<SP>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch, pagina: undefined };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return `/admin/orcamentos${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Central de orçamentos"
        description={
          canSeeAll ? "Todas as solicitações enviadas pelos clientes." : "Seus atendimentos e solicitações ainda sem responsável."
        }
        actions={
          <div className="inline-flex rounded-lg border bg-card p-0.5 shadow-xs">
            <Link
              href={linkWith({ view: undefined })}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "lista" ? "bg-muted font-medium" : "text-muted-foreground")}
            >
              <List className="size-4" /> Lista
            </Link>
            <Link
              href={linkWith({ view: "quadro", status: undefined })}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "quadro" ? "bg-muted font-medium" : "text-muted-foreground")}
            >
              <Columns3 className="size-4" /> Quadro
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        <QuoteFilters users={users.map((u) => ({ id: u.id, name: u.name }))} canFilterUsers={canSeeAll} />

        {view === "lista" ? (
          <>
            <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Filtrar por status">
              <StatusTab href={linkWith({ status: undefined })} active={!status} label="Todos" count={totalAll} />
              {quoteStatusOrder.map((s) => (
                <StatusTab key={s} href={linkWith({ status: s })} active={status === s} label={quoteStatusLabels[s]} count={data.counts[s]} highlight={s === "NEW"} />
              ))}
            </nav>

            {data.items.length === 0 ? (
              <EmptyState icon={<Inbox />} title="Nenhum orçamento encontrado" description="Ajuste os filtros ou aguarde novas solicitações da loja." />
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Protocolo</TH>
                      <TH>Cliente</TH>
                      <TH className="hidden md:table-cell">Veículo</TH>
                      <TH className="hidden lg:table-cell">Data</TH>
                      <TH>Status</TH>
                      <TH className="hidden md:table-cell">Responsável</TH>
                      <TH className="w-16 text-center">Info</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.items.map((q) => (
                      <TR key={q.id} className={cn("relative", q.status === "NEW" && "bg-sky-50/40")}>
                        <TD className="font-mono text-xs">
                          <Link href={`/admin/orcamentos/${q.id}`} className="font-semibold text-foreground after:absolute after:inset-0 hover:text-brand">
                            {q.protocol}
                          </Link>
                        </TD>
                        <TD>
                          <p className="font-medium">{q.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(q.phone)}</p>
                        </TD>
                        <TD className="hidden max-w-[260px] md:table-cell">
                          <p className="truncate text-sm">{q.vehicleLabel ?? <span className="text-muted-foreground">Não informado</span>}</p>
                        </TD>
                        <TD className="hidden whitespace-nowrap lg:table-cell">
                          <p className="text-sm">{formatDateTime(q.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{relativeTime(q.createdAt)}</p>
                        </TD>
                        <TD>
                          <StatusPill tone={quoteStatusTone[q.status]}>{quoteStatusLabels[q.status]}</StatusPill>
                        </TD>
                        <TD className="hidden md:table-cell">
                          {q.assignedTo ? <span className="text-sm">{q.assignedTo.name}</span> : <span className="text-xs text-muted-foreground">Sem responsável</span>}
                        </TD>
                        <TD>
                          <div className="relative z-10 flex items-center justify-center gap-1.5 text-muted-foreground">
                            {q.wantsFinancing && (
                              <Tooltip content="Interesse em financiamento">
                                <Landmark className="size-4" />
                              </Tooltip>
                            )}
                            {q.hasTradeIn && (
                              <Tooltip content="Possui veículo para troca">
                                <ArrowLeftRight className="size-4" />
                              </Tooltip>
                            )}
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </Card>
            )}
            <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/orcamentos" params={sp} />
          </>
        ) : (
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {quoteStatusOrder.map((s) => {
              const col = board.filter((q) => q.status === s);
              return (
                <section key={s} className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/60 p-2">
                  <header className="flex items-center justify-between px-2 py-1.5">
                    <StatusPill tone={quoteStatusTone[s]}>{quoteStatusLabels[s]}</StatusPill>
                    <span className="text-xs font-semibold text-muted-foreground">{col.length}</span>
                  </header>
                  <div className="mt-1 flex flex-col gap-2">
                    {col.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum orçamento</p>}
                    {col.map((q) => (
                      <Link
                        key={q.id}
                        href={`/admin/orcamentos/${q.id}`}
                        className="rounded-lg border bg-card p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{q.protocol}</span>
                          <span className="text-[11px] text-muted-foreground">{relativeTime(q.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{q.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{q.vehicleLabel ?? "Veículo não informado"}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{q.assignedTo?.name ?? "Sem responsável"}</span>
                          <span className="flex gap-1">
                            {q.wantsFinancing && <Landmark className="size-3.5" />}
                            {q.hasTradeIn && <ArrowLeftRight className="size-3.5" />}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function StatusTab({ href, active, label, count, highlight }: { href: string; active: boolean; label: string; count: number; highlight?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-graphite font-medium text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
          active ? "bg-white/15 text-white" : highlight && count > 0 ? "bg-brand text-white" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
