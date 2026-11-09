import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronRight,
  Cog,
  Fuel,
  Gauge,
  Landmark,
  Palette,
  Repeat,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SectionHeading } from "@/components/store/section";
import { VehicleActions, ViewTracker } from "@/components/store/vehicle-actions";
import { VehicleCard } from "@/components/store/vehicle-card";
import { VehicleGallery } from "@/components/store/vehicle-gallery";
import { formatKm, formatPrice } from "@/lib/format";
import { conditionLabels, fuelLabels, transmissionLabels, vehicleStatusLabels } from "@/lib/labels";
import { cn, siteUrl } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { getRelatedVehicles, getVehicleBySlug } from "@/server/services/catalog";
import { getSiteSettings } from "@/server/services/settings";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVehicleBySlug(slug);
  if (!v) return { title: "Veículo não encontrado" };
  const title = `${v.brand.name} ${v.model.name} ${v.version} ${v.manufactureYear}/${v.modelYear}`;
  const price = formatPrice(v.promoPrice ?? v.price);
  const description = `${title} · ${formatKm(v.mileage)} · ${transmissionLabels[v.transmission]} · ${fuelLabels[v.fuel]} · ${price}. ${
    v.description?.slice(0, 120) ?? ""
  }`;
  const image = v.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/veiculos/${v.slug}` },
    openGraph: {
      title: `${title} — ${price}`,
      description,
      url: `/veiculos/${v.slug}`,
      images: image ? [{ url: image.startsWith("/") ? siteUrl(image) : image, alt: title }] : undefined,
    },
  };
}

export default async function VehiclePage({ params }: { params: Params }) {
  const { slug } = await params;
  const v = await getVehicleBySlug(slug);
  if (!v) notFound();

  const [settings, related] = await Promise.all([
    getSiteSettings(),
    getRelatedVehicles({ id: v.id, brandId: v.brandId, categoryId: v.categoryId }),
  ]);

  const title = `${v.brand.name} ${v.model.name}`;
  const fullTitle = `${title} ${v.version} ${v.manufactureYear}/${v.modelYear}`;
  const hasPromo = v.promoPrice !== null && v.promoPrice < v.price;
  const effective = hasPromo ? v.promoPrice! : v.price;
  const url = siteUrl(`/veiculos/${v.slug}`);
  const available = v.status === "AVAILABLE";
  const wa = whatsappLink(settings.whatsapp, `Olá! Tenho interesse no ${fullTitle} (cód. ${v.internalCode}) anunciado por ${formatPrice(effective)}.\n${url}`);

  const specs: [string, string | number | null | undefined][] = [
    ["Marca", v.brand.name],
    ["Modelo", v.model.name],
    ["Versão", v.version],
    ["Ano fabricação / modelo", `${v.manufactureYear} / ${v.modelYear}`],
    ["Condição", conditionLabels[v.condition]],
    ["Categoria", v.category?.name],
    ["Quilometragem", formatKm(v.mileage)],
    ["Motor", v.engine],
    ["Potência", v.power],
    ["Combustível", fuelLabels[v.fuel]],
    ["Câmbio", transmissionLabels[v.transmission]],
    ["Direção", v.steering],
    ["Tração", v.drivetrain],
    ["Portas", v.doors],
    ["Passageiros", v.seats],
    ["Cor", v.color],
    ["Consumo", v.consumption],
    ["Código", v.internalCode],
  ];

  const statusTone = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    RESERVED: "bg-amber-50 text-amber-700 ring-amber-600/20",
    SOLD: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  }[v.status];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: fullTitle,
    brand: { "@type": "Brand", name: v.brand.name },
    model: v.model.name,
    vehicleModelDate: String(v.modelYear),
    productionDate: String(v.manufactureYear),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage, unitCode: "KMT" },
    fuelType: fuelLabels[v.fuel],
    vehicleTransmission: transmissionLabels[v.transmission],
    color: v.color ?? undefined,
    itemCondition: v.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    image: v.images.map((i) => (i.url.startsWith("/") ? siteUrl(i.url) : i.url)),
    offers: {
      "@type": "Offer",
      price: effective,
      priceCurrency: "BRL",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      url,
    },
  };

  return (
    <>
      <ViewTracker vehicleId={v.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="container-page pb-28 pt-[96px] lg:pb-20">
        <nav aria-label="Trilha de navegação" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Início</Link></li>
            <li aria-hidden><ChevronRight className="size-3" /></li>
            <li><Link href="/veiculos" className="hover:text-foreground">Veículos</Link></li>
            <li aria-hidden><ChevronRight className="size-3" /></li>
            <li><Link href={`/veiculos?marca=${v.brand.slug}`} className="hover:text-foreground">{v.brand.name}</Link></li>
            <li aria-hidden><ChevronRight className="size-3" /></li>
            <li className="text-foreground">{v.model.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-12">
          {/* Coluna principal */}
          <div className="min-w-0">
            <VehicleGallery
              images={v.images}
              title={fullTitle}
              badges={
                <>
                  {v.featured && <span className="rounded-full bg-graphite px-3 py-1 text-xs font-semibold text-white">Destaque</span>}
                  {(v.isOffer || hasPromo) && <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">{v.offerLabel || "Oferta"}</span>}
                  {v.condition === "NEW" && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-graphite">0 km</span>}
                </>
              }
            />

            {/* Resumo rápido */}
            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
              {[
                { icon: Calendar, label: "Ano", value: `${v.manufactureYear}/${v.modelYear}` },
                { icon: Gauge, label: "Quilometragem", value: formatKm(v.mileage) },
                { icon: Cog, label: "Câmbio", value: transmissionLabels[v.transmission] },
                { icon: Fuel, label: "Combustível", value: fuelLabels[v.fuel] },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-card p-5">
                  <Icon className="size-5 text-brand" aria-hidden />
                  <dt className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-display text-lg font-bold">{value}</dd>
                </div>
              ))}
            </dl>

            {v.highlights.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {v.highlights.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-medium text-brand">
                    <Sparkles className="size-3.5" /> {h}
                  </span>
                ))}
              </div>
            )}

            {v.description && (
              <section className="mt-12" aria-labelledby="sobre-veiculo">
                <h2 id="sobre-veiculo" className="text-2xl font-extrabold">Sobre este veículo</h2>
                <div className="mt-4 space-y-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{v.description}</div>
              </section>
            )}

            <section className="mt-12" aria-labelledby="ficha-tecnica">
              <h2 id="ficha-tecnica" className="text-2xl font-extrabold">Ficha técnica</h2>
              <dl className="mt-5 grid overflow-hidden rounded-2xl border bg-card sm:grid-cols-2">
                {specs
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 border-b px-5 py-3.5 text-sm sm:odd:border-r">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            {v.features.length > 0 && (
              <section className="mt-12" aria-labelledby="opcionais">
                <h2 id="opcionais" className="text-2xl font-extrabold">Equipamentos e opcionais</h2>
                <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {v.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {v.conservation && (
              <section className="mt-12 rounded-2xl border bg-card p-6" aria-labelledby="conservacao">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h2 id="conservacao" className="text-lg font-bold">Estado de conservação</h2>
                    <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{v.conservation}</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Coluna lateral: preço e conversão */}
          <aside className="lg:row-start-1 lg:col-start-2">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-3xl border bg-card p-6 shadow-[0_24px_50px_-30px_rgba(20,20,30,0.35)] sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{v.brand.name}</p>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", statusTone)}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {vehicleStatusLabels[v.status]}
                  </span>
                </div>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight">{title}</h1>
                <p className="mt-1 text-muted-foreground">{v.version}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {v.manufactureYear}/{v.modelYear} · {formatKm(v.mileage)} · {conditionLabels[v.condition]}
                </p>

                <div className="mt-6 border-t pt-6">
                  {hasPromo && <p className="text-sm text-muted-foreground line-through">{formatPrice(v.price)}</p>}
                  <p className={cn("font-display text-4xl font-extrabold tracking-tight", hasPromo && "text-brand")}>{formatPrice(effective)}</p>
                  {hasPromo && (
                    <p className="mt-1 text-sm font-semibold text-emerald-600">Economia de {formatPrice(v.price - effective)}</p>
                  )}
                </div>

                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {v.financingAvailable && (
                    <li className="flex items-center gap-2"><Landmark className="size-4 text-foreground/60" /> Financiamento disponível</li>
                  )}
                  {v.acceptsTrade && (
                    <li className="flex items-center gap-2"><Repeat className="size-4 text-foreground/60" /> Aceita seu usado na troca</li>
                  )}
                  <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-foreground/60" /> Laudo cautelar e procedência verificada</li>
                  {v.color && <li className="flex items-center gap-2"><Palette className="size-4 text-foreground/60" /> {v.color}</li>}
                </ul>

                {v.status === "RESERVED" && (
                  <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Este veículo está reservado. Deixe seu contato para ser avisado caso ele volte a ficar disponível.
                  </p>
                )}
                {v.status === "SOLD" && (
                  <p className="mt-5 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    Este veículo já foi vendido. Veja opções semelhantes abaixo ou fale com um consultor.
                  </p>
                )}

                <div className="mt-6">
                  <VehicleActions vehicleId={v.id} title={fullTitle} url={url} whatsappHref={wa} available={v.status !== "SOLD"} />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <SectionHeading eyebrow="Você também pode gostar" title="Veículos semelhantes" href="/veiculos" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <VehicleCard key={r.id} vehicle={r} />
              ))}
            </div>
          </section>
        )}
      </div>

      <VehicleActions layout="bar" vehicleId={v.id} title={fullTitle} url={url} whatsappHref={wa} available={v.status !== "SOLD"} />
    </>
  );
}
