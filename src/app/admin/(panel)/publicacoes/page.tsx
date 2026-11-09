import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PublicationsTabs, type PubTab } from "@/components/admin/content/publications-tabs";
import { VehiclesPublication } from "@/components/admin/content/vehicles-publication";
import { BannersManager } from "@/components/admin/content/banners-manager";
import { TestimonialsManager } from "@/components/admin/content/testimonials-manager";
import { SiteContentForm } from "@/components/admin/content/site-content-form";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { getSiteSettings } from "@/server/services/settings";

export const metadata = { title: "Publicações" };

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const user = await requireUser();
  const canVehicles = can(user, "vehicles.publish");
  const canContent = can(user, "content.manage");
  if (!canVehicles && !canContent) redirect("/admin/acesso-negado");

  const tabs: PubTab[] = [
    ...(canVehicles ? (["veiculos"] as const) : []),
    ...(canContent ? (["banners", "textos", "depoimentos"] as const) : []),
  ];
  const { aba } = await searchParams;
  const active: PubTab = tabs.includes(aba as PubTab) ? (aba as PubTab) : tabs[0];

  const [vehicles, banners, testimonials, settings] = await Promise.all([
    canVehicles || canContent
      ? prisma.vehicle.findMany({
          where: canVehicles ? undefined : { status: { not: "SOLD" } },
          orderBy: [{ published: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            internalCode: true,
            version: true,
            manufactureYear: true,
            modelYear: true,
            price: true,
            promoPrice: true,
            status: true,
            published: true,
            featured: true,
            isOffer: true,
            offerLabel: true,
            displayOrder: true,
            brand: { select: { name: true } },
            model: { select: { name: true } },
            images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
          },
        })
      : Promise.resolve([]),
    canContent
      ? prisma.banner.findMany({
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
          include: { vehicle: { select: { version: true, brand: { select: { name: true } }, model: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
    canContent ? prisma.testimonial.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] }) : Promise.resolve([]),
    canContent ? getSiteSettings() : Promise.resolve(null),
  ]);

  const vehicleItems = vehicles.map((v) => ({
    id: v.id,
    title: `${v.brand.name} ${v.model.name}`,
    subtitle: `${v.version} · ${v.manufactureYear}/${v.modelYear}`,
    code: v.internalCode,
    image: v.images[0]?.url ?? null,
    price: toNumber(v.price),
    promoPrice: v.promoPrice ? toNumber(v.promoPrice) : null,
    status: v.status,
    published: v.published,
    featured: v.featured,
    isOffer: v.isOffer,
    offerLabel: v.offerLabel,
    displayOrder: v.displayOrder,
  }));

  return (
    <>
      <PageHeader title="Publicações" description="Controle o que aparece na loja pública. As alterações são refletidas no site imediatamente." />
      <PublicationsTabs
        tabs={tabs}
        active={active}
        panels={{
          veiculos: canVehicles ? <VehiclesPublication vehicles={vehicleItems} /> : null,
          banners: canContent ? (
            <BannersManager
              banners={banners.map((b) => ({
                id: b.id,
                title: b.title,
                subtitle: b.subtitle,
                imageUrl: b.imageUrl,
                ctaLabel: b.ctaLabel,
                ctaHref: b.ctaHref,
                vehicleId: b.vehicleId,
                vehicleTitle: b.vehicle ? `${b.vehicle.brand.name} ${b.vehicle.model.name} ${b.vehicle.version}` : null,
                active: b.active,
                order: b.order,
                startsAt: b.startsAt?.toISOString() ?? null,
                endsAt: b.endsAt?.toISOString() ?? null,
              }))}
              vehicles={vehicleItems.filter((v) => v.status !== "SOLD").map((v) => ({ id: v.id, title: `${v.title} ${v.subtitle} (${v.code})` }))}
            />
          ) : null,
          textos: settings ? (
            <SiteContentForm
              initial={{
                heroTitle: settings.heroTitle ?? "",
                heroSubtitle: settings.heroSubtitle ?? "",
                heroImageUrl: settings.heroImageUrl ?? "",
                aboutTitle: settings.aboutTitle ?? "",
                aboutText: settings.aboutText ?? "",
                aboutImageUrl: settings.aboutImageUrl ?? "",
                featuredTitle: settings.featuredTitle ?? "",
                latestTitle: settings.latestTitle ?? "",
                offersTitle: settings.offersTitle ?? "",
                offersSubtitle: settings.offersSubtitle ?? "",
                differentials: settings.differentials,
              }}
            />
          ) : null,
          depoimentos: canContent ? (
            <TestimonialsManager
              items={testimonials.map((t) => ({
                id: t.id,
                name: t.name,
                city: t.city,
                vehicle: t.vehicle,
                text: t.text,
                rating: t.rating,
                active: t.active,
                order: t.order,
              }))}
            />
          ) : null,
        }}
      />
    </>
  );
}
