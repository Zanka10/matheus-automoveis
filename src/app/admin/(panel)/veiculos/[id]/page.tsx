import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock, MessagesSquare, MoreHorizontal, Pencil, ScanEye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatusPill } from "@/components/admin/page-header";
import { AdminGallery } from "@/components/admin/vehicles/gallery";
import { QuickControls } from "@/components/admin/vehicles/quick-controls";
import { MovementTimeline } from "@/components/admin/vehicles/movement-timeline";
import { VehicleActionsMenu, type VehiclePerms } from "@/components/admin/vehicles/vehicle-actions";
import {
  conditionLabels,
  fuelLabels,
  quoteStatusLabels,
  quoteStatusTone,
  transmissionLabels,
  vehicleStatusLabels,
  vehicleStatusTone,
} from "@/lib/labels";
import { formatDate, formatDateTime, formatKm, formatPrice } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getVehicleFull } from "@/server/services/vehicles-admin";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVehicleFull(id);
  return { title: v ? `${v.brand.name} ${v.model.name} (${v.internalCode})` : "Veículo" };
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("vehicles.view");
  const { id } = await params;
  const v = await getVehicleFull(id);
  if (!v) notFound();

  const perms: VehiclePerms = {
    edit: can(user, "vehicles.edit"),
    create: can(user, "vehicles.create"),
    delete: can(user, "vehicles.delete"),
    publish: can(user, "vehicles.publish"),
    stock: can(user, "vehicles.stock"),
  };
  const seesQuotes = can(user, "quotes.view") || can(user, "quotes.viewAll");
  const visibleQuotes = can(user, "quotes.viewAll")
    ? v.quotes
    : v.quotes.filter((q) => !q.assignedToId || q.assignedToId === user.id);
  const label = `${v.brand.name} ${v.model.name} ${v.version}`;
  const daysInStock = Math.floor(((v.soldAt?.getTime() ?? Date.now()) - v.createdAt.getTime()) / 86_400_000);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/veiculos", label: "Veículos" }}
        title={`${v.brand.name} ${v.model.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{v.internalCode}</span>
            <span>·</span>
            <span>{v.version}</span>
            <StatusPill tone={vehicleStatusTone[v.status]}>{vehicleStatusLabels[v.status]}</StatusPill>
            {v.published && <Badge variant="outline">Publicado</Badge>}
            {v.featured && <Badge variant="outline">Destaque</Badge>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/veiculos/${v.id}/previa`}>
                <ScanEye /> Prévia
              </Link>
            </Button>
            {perms.edit && (
              <Button asChild variant="brand">
                <Link href={`/admin/veiculos/${v.id}/editar`}>
                  <Pencil /> Editar
                </Link>
              </Button>
            )}
            <VehicleActionsMenu
              perms={perms}
              showView={false}
              vehicle={{ id: v.id, slug: v.slug, label, status: v.status, published: v.published, featured: v.featured }}
              trigger={
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal />
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-3">
            <AdminGallery images={v.images} alt={label} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ficha técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <Spec label="Ano" value={`${v.manufactureYear}/${v.modelYear}`} />
                <Spec label="Condição" value={conditionLabels[v.condition]} />
                <Spec label="Quilometragem" value={formatKm(v.mileage)} />
                <Spec label="Categoria" value={v.category?.name} />
                <Spec label="Motor" value={v.engine} />
                <Spec label="Potência" value={v.power} />
                <Spec label="Combustível" value={fuelLabels[v.fuel]} />
                <Spec label="Câmbio" value={transmissionLabels[v.transmission]} />
                <Spec label="Direção" value={v.steering} />
                <Spec label="Tração" value={v.drivetrain} />
                <Spec label="Portas" value={v.doors} />
                <Spec label="Passageiros" value={v.seats} />
                <Spec label="Cor" value={v.color} />
                <Spec label="Consumo" value={v.consumption} />
              </dl>
              {v.features.length > 0 && (
                <>
                  <h3 className="mb-2 mt-6 text-sm font-semibold">Itens e opcionais</h3>
                  <ul className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                    {v.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descrição e conservação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <p className="whitespace-pre-line leading-relaxed text-foreground/85">{v.description || "Sem descrição comercial."}</p>
              {v.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {v.highlights.map((h) => (
                    <Badge key={h} variant="outline">
                      {h}
                    </Badge>
                  ))}
                </div>
              )}
              {v.conservation && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conservação</p>
                  <p className="whitespace-pre-line">{v.conservation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <MovementTimeline items={v.movements} />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preço de venda</p>
              {v.promoPrice ? (
                <>
                  <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(v.promoPrice)}</p>
                  <p className="text-sm text-muted-foreground line-through tabular-nums">{formatPrice(v.price)}</p>
                </>
              ) : (
                <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(v.price)}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={v.acceptsTrade ? "default" : "muted"}>{v.acceptsTrade ? "Aceita troca" : "Não aceita troca"}</Badge>
                <Badge variant={v.financingAvailable ? "default" : "muted"}>{v.financingAvailable ? "Financia" : "Sem financiamento"}</Badge>
                {v.isOffer && <Badge variant="brand">{v.offerLabel ?? "Oferta"}</Badge>}
              </div>
              {v.status === "SOLD" && (
                <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  Vendido em {formatDate(v.soldAt)} por <strong>{formatPrice(v.soldPrice)}</strong>
                  {v.soldBy ? ` · ${v.soldBy.name}` : ""}
                </div>
              )}
            </CardContent>
          </Card>

          {(perms.publish || perms.stock) && (
            <Card>
              <CardHeader>
                <CardTitle>Publicação e estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickControls
                  perms={perms}
                  vehicle={{
                    id: v.id,
                    label,
                    status: v.status,
                    published: v.published,
                    featured: v.featured,
                    isOffer: v.isOffer,
                    offerLabel: v.offerLabel,
                    imageCount: v.images.length,
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-amber-200/70 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4 text-amber-700" /> Dados internos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Placa</dt>
                  <dd className="font-mono font-medium">{v.plate ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Código</dt>
                  <dd className="font-mono font-medium">{v.internalCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cadastrado em</dt>
                  <dd className="font-medium">{formatDate(v.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{v.status === "SOLD" ? "Dias até a venda" : "Dias em estoque"}</dt>
                  <dd className="font-medium">{daysInStock}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cadastrado por</dt>
                  <dd className="font-medium">{v.createdBy?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Visualizações</dt>
                  <dd className="font-medium">{v.views}</dd>
                </div>
              </dl>
              {v.internalNotes && (
                <p className="mt-4 whitespace-pre-line rounded-lg bg-card px-3 py-2.5 text-sm">{v.internalNotes}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Atualizado em {formatDateTime(v.updatedAt)}</p>
            </CardContent>
          </Card>

          {seesQuotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessagesSquare className="size-4" /> Orçamentos vinculados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {visibleQuotes.length === 0 ? (
                  <p className="px-3 pb-3 text-sm text-muted-foreground">Nenhum orçamento para este veículo.</p>
                ) : (
                  <ul className="divide-y">
                    {visibleQuotes.map((q) => (
                      <li key={q.id}>
                        <Link href={`/admin/orcamentos/${q.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{q.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {q.protocol} · {formatDate(q.createdAt)}
                            </p>
                          </div>
                          <StatusPill tone={quoteStatusTone[q.status]}>{quoteStatusLabels[q.status]}</StatusPill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
