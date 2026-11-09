import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, Fuel, Gauge, MessageCircle, ScanEye, Settings2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { AdminGallery } from "@/components/admin/vehicles/gallery";
import { conditionLabels, fuelLabels, transmissionLabels } from "@/lib/labels";
import { formatKm, formatPrice } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";
import { getVehicleFull } from "@/server/services/vehicles-admin";

export const metadata = { title: "Pré-visualização" };

/**
 * Prévia de como o veículo aparecerá na loja — renderizada dentro do painel autenticado,
 * portanto funciona para veículos não publicados sem expô-los publicamente.
 * Campos privados (placa, observações internas) não são exibidos, como na loja.
 */
export default async function VehiclePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("vehicles.view");
  const { id } = await params;
  const v = await getVehicleFull(id);
  if (!v) notFound();

  const title = `${v.brand.name} ${v.model.name}`;
  const finalPrice = v.promoPrice ?? v.price;
  const thumb = v.images[0]?.url;
  const specs = [
    { icon: <Calendar />, label: "Ano", value: `${v.manufactureYear}/${v.modelYear}` },
    { icon: <Gauge />, label: "Km", value: formatKm(v.mileage) },
    { icon: <Settings2 />, label: "Câmbio", value: transmissionLabels[v.transmission] },
    { icon: <Fuel />, label: "Combustível", value: fuelLabels[v.fuel] },
  ];

  return (
    <>
      <PageHeader
        back={{ href: `/admin/veiculos/${v.id}`, label: "Detalhes do veículo" }}
        title="Pré-visualização"
        description="Como o veículo aparecerá para os clientes na loja (versão salva)."
        actions={
          v.published ? (
            <Button asChild variant="outline">
              <a href={`/veiculos/${v.slug}`} target="_blank" rel="noreferrer">
                Abrir na loja
              </a>
            </Button>
          ) : (
            <Badge variant="muted" className="py-1">
              <ScanEye className="size-3.5" /> Não publicado — visível apenas no painel
            </Badge>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Card no catálogo</p>
          <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative aspect-[4/3] bg-muted">
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={title} className="size-full object-cover" />
              )}
              <div className="absolute left-3 top-3 flex gap-1.5">
                {v.featured && <Badge variant="dark">Destaque</Badge>}
                {v.isOffer && <Badge variant="brand">{v.offerLabel ?? "Oferta"}</Badge>}
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{v.brand.name}</p>
              <h3 className="font-display text-lg font-bold leading-tight">{v.model.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{v.version}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {v.manufactureYear}/{v.modelYear}
                </span>
                <span>{formatKm(v.mileage)}</span>
                <span>{transmissionLabels[v.transmission]}</span>
                <span>{fuelLabels[v.fuel]}</span>
              </div>
              <div className="mt-4 border-t pt-3">
                {v.promoPrice && <p className="text-xs text-muted-foreground line-through">{formatPrice(v.price)}</p>}
                <p className="font-display text-xl font-bold">{formatPrice(finalPrice)}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Página do veículo</p>
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <AdminGallery images={v.images} alt={title} />
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{conditionLabels[v.condition]}</Badge>
                    {v.category && <Badge variant="outline">{v.category.name}</Badge>}
                    {v.isOffer && <Badge variant="brand">{v.offerLabel ?? "Oferta"}</Badge>}
                  </div>
                  <h2 className="font-display text-2xl font-bold">{title}</h2>
                  <p className="text-muted-foreground">{v.version}</p>
                </div>
                <div>
                  {v.promoPrice && <p className="text-sm text-muted-foreground line-through">{formatPrice(v.price)}</p>}
                  <p className="font-display text-3xl font-extrabold">{formatPrice(finalPrice)}</p>
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  {specs.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
                      {s.icon}
                      <div>
                        <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                        <dd className="text-sm font-medium">{s.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col gap-2">
                  <Button variant="brand" size="lg" disabled>
                    Solicitar orçamento
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="whatsapp" disabled>
                      <MessageCircle /> WhatsApp
                    </Button>
                    <Button variant="outline" disabled>
                      <Share2 /> Compartilhar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {v.description && (
              <div className="mt-8">
                <h3 className="mb-2 font-semibold">Descrição</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{v.description}</p>
              </div>
            )}
            {v.highlights.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {v.highlights.map((h) => (
                  <Badge key={h} variant="outline">
                    {h}
                  </Badge>
                ))}
              </div>
            )}
            {v.features.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold">Equipamentos e opcionais</h3>
                <ul className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {v.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {v.conservation && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold">Conservação</h3>
                <p className="text-sm text-foreground/85">{v.conservation}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Botões desativados nesta prévia. <Link href={`/admin/veiculos/${v.id}/editar`} className="underline">Editar veículo</Link>
          </p>
        </section>
      </div>
    </>
  );
}
