import Link from "next/link";
import { CarFront, Globe, ImageOff, Plus, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/primitives";
import { EmptyState, PageHeader, StatusPill } from "@/components/admin/page-header";
import { VehicleFilters } from "@/components/admin/vehicles/vehicle-filters";
import { VehicleActionsMenu, type VehiclePerms } from "@/components/admin/vehicles/vehicle-actions";
import { Pagination } from "@/components/admin/vehicles/pagination";
import { VehicleThumb } from "@/components/admin/vehicles/vehicle-thumb";
import { prisma } from "@/lib/prisma";
import { conditionLabels, vehicleStatusLabels, vehicleStatusTone } from "@/lib/labels";
import { formatKm, formatPrice } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listAdminVehicles, parseAdminVehicleFilters, type AdminVehicleRow } from "@/server/services/vehicles-admin";

export const metadata = { title: "Veículos" };

function PriceCell({ v }: { v: AdminVehicleRow }) {
  return v.promoPrice ? (
    <div className="leading-tight">
      <p className="font-semibold tabular-nums">{formatPrice(v.promoPrice)}</p>
      <p className="text-xs text-muted-foreground line-through tabular-nums">{formatPrice(v.price)}</p>
    </div>
  ) : (
    <p className="font-semibold tabular-nums">{formatPrice(v.price)}</p>
  );
}

function Flags({ v }: { v: AdminVehicleRow }) {
  return (
    <div className="flex items-center gap-1.5">
      {v.published ? (
        <Tooltip content="Publicado na loja">
          <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <Globe className="size-3.5" />
          </span>
        </Tooltip>
      ) : (
        <Badge variant="muted">Rascunho</Badge>
      )}
      {v.featured && (
        <Tooltip content="Destaque na página inicial">
          <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600">
            <Star className="size-3.5 fill-current" />
          </span>
        </Tooltip>
      )}
      {v.isOffer && (
        <Tooltip content={v.offerLabel ?? "Em oferta"}>
          <span className="grid size-6 place-items-center rounded-md bg-brand-soft text-brand">
            <Tag className="size-3.5" />
          </span>
        </Tooltip>
      )}
      {v.imageCount === 0 && (
        <Tooltip content="Sem fotos">
          <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
            <ImageOff className="size-3.5" />
          </span>
        </Tooltip>
      )}
    </div>
  );
}

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("vehicles.view");
  const sp = await searchParams;
  const filters = parseAdminVehicleFilters(sp);
  const [result, brands] = await Promise.all([
    listAdminVehicles(filters),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const perms: VehiclePerms = {
    edit: can(user, "vehicles.edit"),
    create: can(user, "vehicles.create"),
    delete: can(user, "vehicles.delete"),
    publish: can(user, "vehicles.publish"),
    stock: can(user, "vehicles.stock"),
  };
  const filtered = Object.keys(sp).some((k) => k !== "pagina" && sp[k]);

  return (
    <>
      <PageHeader
        title="Veículos"
        description="Cadastro, fichas técnicas, fotos e publicação dos veículos."
        actions={
          perms.create && (
            <Button asChild variant="brand">
              <Link href="/admin/veiculos/novo">
                <Plus /> Novo veículo
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4">
        <VehicleFilters brands={brands} />
      </div>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<CarFront />}
          title={filtered ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
          description={filtered ? "Ajuste os filtros ou a busca para ver outros resultados." : "Cadastre o primeiro veículo para começar a montar o estoque."}
          action={
            !filtered &&
            perms.create && (
              <Button asChild variant="brand">
                <Link href="/admin/veiculos/novo">
                  <Plus /> Cadastrar veículo
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Veículo</TH>
                  <TH>Código</TH>
                  <TH>Ano / Km</TH>
                  <TH>Preço</TH>
                  <TH>Status</TH>
                  <TH>Site</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {result.rows.map((v) => (
                  <TR key={v.id}>
                    <TD>
                      <Link href={`/admin/veiculos/${v.id}`} className="group flex items-center gap-3">
                        <VehicleThumb src={v.thumb} alt={v.title} className="w-16" />
                        <div className="min-w-0">
                          <p className="font-semibold group-hover:text-brand">{v.title}</p>
                          <p className="max-w-[280px] truncate text-xs text-muted-foreground">{v.version}</p>
                        </div>
                      </Link>
                    </TD>
                    <TD>
                      <p className="font-mono text-xs">{v.internalCode}</p>
                      {v.plate && <p className="font-mono text-[11px] text-muted-foreground">{v.plate}</p>}
                    </TD>
                    <TD>
                      <p className="tabular-nums">{v.years}</p>
                      <p className="text-xs text-muted-foreground">
                        {conditionLabels[v.condition]} · {formatKm(v.mileage)}
                      </p>
                    </TD>
                    <TD>
                      <PriceCell v={v} />
                    </TD>
                    <TD>
                      <StatusPill tone={vehicleStatusTone[v.status]}>{vehicleStatusLabels[v.status]}</StatusPill>
                    </TD>
                    <TD>
                      <Flags v={v} />
                    </TD>
                    <TD>
                      <VehicleActionsMenu
                        perms={perms}
                        vehicle={{ id: v.id, slug: v.slug, label: `${v.title} ${v.version}`, status: v.status, published: v.published, featured: v.featured }}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {result.rows.map((v) => (
              <li key={v.id} className="rounded-xl border bg-card p-3 shadow-xs">
                <div className="flex gap-3">
                  <Link href={`/admin/veiculos/${v.id}`}>
                    <VehicleThumb src={v.thumb} alt={v.title} className="w-24" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/veiculos/${v.id}`} className="min-w-0">
                        <p className="truncate font-semibold">{v.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{v.version}</p>
                      </Link>
                      <VehicleActionsMenu
                        perms={perms}
                        vehicle={{ id: v.id, slug: v.slug, label: `${v.title} ${v.version}`, status: v.status, published: v.published, featured: v.featured }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.internalCode} · {v.years} · {formatKm(v.mileage)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                  <PriceCell v={v} />
                  <div className="flex items-center gap-2">
                    <Flags v={v} />
                    <StatusPill tone={vehicleStatusTone[v.status]}>{vehicleStatusLabels[v.status]}</StatusPill>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Pagination page={result.page} pageCount={result.pageCount} total={result.total} searchParams={sp} basePath="/admin/veiculos" />
          </div>
        </>
      )}
    </>
  );
}
