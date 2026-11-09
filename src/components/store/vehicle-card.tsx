import Link from "next/link";
import { ArrowUpRight, Cog, Fuel, Gauge } from "lucide-react";
import { formatKm, formatPrice } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { VehicleCard as VehicleCardData } from "@/server/services/catalog";
import { CarImage } from "./car-image";

export function VehicleCard({ vehicle: v, priority, className }: { vehicle: VehicleCardData; priority?: boolean; className?: string }) {
  const hasPromo = v.promoPrice !== null && v.promoPrice < v.price;
  const title = `${v.brand} ${v.model}`;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_18px_40px_-18px_rgba(20,20,30,0.28)]",
        className,
      )}
    >
      <Link href={`/veiculos/${v.slug}`} className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
        <span className="sr-only">
          Ver detalhes de {title} {v.version}
        </span>
      </Link>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <CarImage
          src={v.image}
          alt={`${title} ${v.version}`}
          fill
          priority={priority}
          sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, (min-width:640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {v.status === "RESERVED" && <Tag className="bg-amber-500 text-white">Reservado</Tag>}
          {v.featured && <Tag className="bg-graphite text-white">Destaque</Tag>}
          {(v.isOffer || hasPromo) && <Tag className="bg-brand text-white">{v.offerLabel || "Oferta"}</Tag>}
          {v.condition === "NEW" && <Tag className="bg-white text-graphite">0 km</Tag>}
        </div>
        <span className="absolute bottom-3 right-3 grid size-9 translate-y-2 place-items-center rounded-full bg-white/95 text-graphite opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{v.brand}</p>
        <h3 className="mt-1 font-display text-lg font-bold leading-tight text-foreground">{v.model}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{v.version}</p>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border/60 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Ano</dt>
            <span className="font-medium text-foreground">
              {v.manufactureYear}/{v.modelYear}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Quilometragem</dt>
            <dd className="truncate">{formatKm(v.mileage)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Cog className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Câmbio</dt>
            <dd className="truncate">{transmissionLabels[v.transmission]}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {hasPromo && <p className="text-xs text-muted-foreground line-through">{formatPrice(v.price)}</p>}
            <p className={cn("font-display text-xl font-extrabold tracking-tight", hasPromo ? "text-brand" : "text-foreground")}>
              {formatPrice(hasPromo ? v.promoPrice : v.price)}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Fuel className="size-3.5" aria-hidden />
            {fuelLabels[v.fuel]}
          </span>
        </div>
      </div>
    </article>
  );
}

function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm", className)}>{children}</span>;
}

export function VehicleGrid({ vehicles, className }: { vehicles: VehicleCardData[]; className?: string }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {vehicles.map((v, i) => (
        <VehicleCard key={v.id} vehicle={v} priority={i < 2} />
      ))}
    </div>
  );
}
