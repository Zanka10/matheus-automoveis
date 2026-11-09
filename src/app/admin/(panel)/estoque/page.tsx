import Link from "next/link";
import type { MovementType, Prisma, VehicleStatus } from "@prisma/client";
import { History, Warehouse } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from "@/components/ui/card";
import { EmptyState, PageHeader, StatusPill } from "@/components/admin/page-header";
import { VehicleActionsMenu, type VehiclePerms } from "@/components/admin/vehicles/vehicle-actions";
import { VehicleThumb } from "@/components/admin/vehicles/vehicle-thumb";
import { Pagination } from "@/components/admin/vehicles/pagination";
import { MovementFilters } from "@/components/admin/vehicles/movement-filters";
import { prisma } from "@/lib/prisma";
import { movementLabels, vehicleStatusLabels, vehicleStatusTone } from "@/lib/labels";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { cn, toNumber } from "@/lib/utils";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

export const metadata = { title: "Estoque" };

const PAGE = 20;
const MOV_PAGE = 25;
const STATUSES: VehicleStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];

function parseDate(v: unknown, endOfDay = false) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00"}-03:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function StockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("vehicles.view");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as VehicleStatus) ? (sp.status as VehicleStatus) : undefined;
  const page = Math.max(1, Math.min(500, Number(sp.pagina) || 1));
  const movPage = Math.max(1, Math.min(500, Number(sp.mpagina) || 1));
  const tipo = typeof sp.tipo === "string" && sp.tipo in movementLabels ? (sp.tipo as MovementType) : undefined;
  const from = parseDate(sp.de);
  const to = parseDate(sp.ate, true);

  const movWhere: Prisma.VehicleMovementWhereInput = {
    ...(tipo ? { type: tipo } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [counts, total, vehicles, movTotal, movements] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true }, _sum: { price: true } }),
    prisma.vehicle.count({ where: status ? { status } : {} }),
    prisma.vehicle.findMany({
      where: status ? { status } : {},
      orderBy: status === "SOLD" ? { soldAt: "desc" } : { createdAt: "asc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        brand: { select: { name: true } },
        model: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        soldBy: { select: { name: true } },
      },
    }),
    prisma.vehicleMovement.count({ where: movWhere }),
    prisma.vehicleMovement.findMany({
      where: movWhere,
      orderBy: { createdAt: "desc" },
      skip: (movPage - 1) * MOV_PAGE,
      take: MOV_PAGE,
      include: {
        user: { select: { name: true } },
        vehicle: { select: { id: true, internalCode: true, brand: { select: { name: true } }, model: { select: { name: true } }, version: true } },
      },
    }),
  ]);

  const countOf = (s: VehicleStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const valueOf = (s: VehicleStatus) => toNumber(counts.find((c) => c.status === s)?._sum.price);
  const all = counts.reduce((s, c) => s + c._count._all, 0);
  const perms: VehiclePerms = {
    edit: can(user, "vehicles.edit"),
    create: can(user, "vehicles.create"),
    delete: can(user, "vehicles.delete"),
    publish: can(user, "vehicles.publish"),
    stock: can(user, "vehicles.stock"),
  };
  const tabHref = (s?: VehicleStatus) => (s ? `/admin/estoque?status=${s}` : "/admin/estoque");
  const now = Date.now();

  return (
    <>
      <PageHeader title="Controle de estoque" description="Situação dos veículos por status e histórico completo de movimentações." />

      <section className="grid gap-3 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-xs transition hover:border-foreground/15 hover:shadow-md",
              status === s && "border-brand ring-2 ring-brand/15",
            )}
          >
            <div className="flex items-center justify-between">
              <StatusPill tone={vehicleStatusTone[s]}>{vehicleStatusLabels[s]}</StatusPill>
              <span className="font-display text-2xl font-bold tabular-nums">{countOf(s)}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {s === "SOLD" ? "Valor de tabela vendido" : "Valor em estoque"}:{" "}
              <span className="font-semibold text-foreground">{formatPrice(valueOf(s))}</span>
            </p>
          </Link>
        ))}
      </section>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b" aria-label="Filtrar por status">
        {[undefined, ...STATUSES].map((s) => {
          const active = status === s;
          return (
            <Link
              key={s ?? "all"}
              href={tabHref(s)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s ? vehicleStatusLabels[s] : "Todos"}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{s ? countOf(s) : all}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        {vehicles.length === 0 ? (
          <EmptyState icon={<Warehouse />} title="Nenhum veículo neste status" />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Veículo</TH>
                  <TH>Status</TH>
                  <TH>Entrada</TH>
                  <TH>{status === "SOLD" ? "Venda" : "Dias em estoque"}</TH>
                  <TH className="text-right">Preço</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {vehicles.map((v) => {
                  const days = Math.floor(((v.soldAt?.getTime() ?? now) - v.createdAt.getTime()) / 86_400_000);
                  const label = `${v.brand.name} ${v.model.name}`;
                  return (
                    <TR key={v.id}>
                      <TD>
                        <Link href={`/admin/veiculos/${v.id}`} className="group flex items-center gap-3">
                          <VehicleThumb src={v.images[0]?.url ?? null} alt={label} className="w-14" />
                          <div className="min-w-0">
                            <p className="font-medium group-hover:text-brand">{label}</p>
                            <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                              {v.internalCode} · {v.version}
                            </p>
                          </div>
                        </Link>
                      </TD>
                      <TD>
                        <StatusPill tone={vehicleStatusTone[v.status]}>{vehicleStatusLabels[v.status]}</StatusPill>
                      </TD>
                      <TD className="whitespace-nowrap text-sm">{formatDate(v.createdAt)}</TD>
                      <TD className="whitespace-nowrap text-sm">
                        {v.status === "SOLD" ? (
                          <>
                            {formatDate(v.soldAt)}
                            <span className="block text-xs text-muted-foreground">
                              {days} dias{v.soldBy ? ` · ${v.soldBy.name}` : ""}
                            </span>
                          </>
                        ) : (
                          <span className={cn("font-medium tabular-nums", days > 90 ? "text-destructive" : days > 60 ? "text-amber-600" : "")}>{days} dias</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatPrice(toNumber(v.status === "SOLD" ? (v.soldPrice ?? v.price) : (v.promoPrice ?? v.price)))}
                      </TD>
                      <TD>
                        <VehicleActionsMenu
                          perms={perms}
                          vehicle={{ id: v.id, slug: v.slug, label: `${label} ${v.version}`, status: v.status, published: v.published, featured: v.featured }}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
        <div className="mt-4">
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} total={total} searchParams={sp} basePath="/admin/estoque" />
        </div>
      </div>

      <Card id="movimentacoes" className="mt-8 scroll-mt-24">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" /> Movimentações
            </CardTitle>
            <CardDescription>Entradas, alterações de status, preços e publicações de todos os veículos.</CardDescription>
          </div>
          <MovementFilters />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {movements.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Data</TH>
                  <TH>Movimentação</TH>
                  <TH>Veículo</TH>
                  <TH>Responsável</TH>
                  <TH>Observação</TH>
                </TR>
              </THead>
              <TBody>
                {movements.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(m.createdAt)}</TD>
                    <TD className="whitespace-nowrap text-sm font-medium">
                      {movementLabels[m.type]}
                      {m.fromStatus && m.toStatus && m.fromStatus !== m.toStatus && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {vehicleStatusLabels[m.fromStatus]} → {vehicleStatusLabels[m.toStatus]}
                        </span>
                      )}
                    </TD>
                    <TD className="text-sm">
                      <Link href={`/admin/veiculos/${m.vehicle.id}`} className="hover:text-brand">
                        {m.vehicle.brand.name} {m.vehicle.model.name}
                        <span className="block text-xs text-muted-foreground">{m.vehicle.internalCode}</span>
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap text-sm">{m.user?.name ?? "—"}</TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">{m.note ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="border-t px-5 py-3">
            <Pagination
              page={movPage}
              pageCount={Math.max(1, Math.ceil(movTotal / MOV_PAGE))}
              total={movTotal}
              searchParams={sp}
              basePath="/admin/estoque"
              param="mpagina"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
