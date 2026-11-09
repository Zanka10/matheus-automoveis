import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import type { CatalogFilters } from "@/validations/vehicle";

// Consultas da loja pública. SEMPRE com `select` explícito:
// placa, observações internas, preço de venda real e dados de funcionários nunca saem daqui.

export const PAGE_SIZE = 12;

/** Somente veículos publicados e não vendidos aparecem na loja */
const PUBLIC_WHERE: Prisma.VehicleWhereInput = { published: true, status: { not: "SOLD" } };

const cardSelect = {
  id: true,
  slug: true,
  version: true,
  manufactureYear: true,
  modelYear: true,
  mileage: true,
  condition: true,
  fuel: true,
  transmission: true,
  price: true,
  promoPrice: true,
  status: true,
  featured: true,
  isOffer: true,
  offerLabel: true,
  createdAt: true,
  brand: { select: { name: true, slug: true } },
  model: { select: { name: true, slug: true } },
  images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
} satisfies Prisma.VehicleSelect;

type CardRow = Prisma.VehicleGetPayload<{ select: typeof cardSelect }>;

function toCard(v: CardRow) {
  return {
    id: v.id,
    slug: v.slug,
    brand: v.brand.name,
    model: v.model.name,
    version: v.version,
    manufactureYear: v.manufactureYear,
    modelYear: v.modelYear,
    mileage: v.mileage,
    condition: v.condition,
    fuel: v.fuel,
    transmission: v.transmission,
    price: toNumber(v.price),
    promoPrice: v.promoPrice === null ? null : toNumber(v.promoPrice),
    status: v.status,
    featured: v.featured,
    isOffer: v.isOffer,
    offerLabel: v.offerLabel,
    image: v.images[0]?.url ?? null,
  };
}

export type VehicleCard = ReturnType<typeof toCard>;

const defaultOrder: Prisma.VehicleOrderByWithRelationInput[] = [{ displayOrder: "asc" }, { createdAt: "desc" }];

export const getFeaturedVehicles = cache(async (take = 8) => {
  const rows = await prisma.vehicle.findMany({
    where: { ...PUBLIC_WHERE, featured: true },
    select: cardSelect,
    orderBy: defaultOrder,
    take,
  });
  return rows.map(toCard);
});

export const getLatestVehicles = cache(async (take = 8) => {
  const rows = await prisma.vehicle.findMany({
    where: PUBLIC_WHERE,
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toCard);
});

export const getOfferVehicles = cache(async (take = 6) => {
  const rows = await prisma.vehicle.findMany({
    where: { ...PUBLIC_WHERE, OR: [{ isOffer: true }, { promoPrice: { not: null } }] },
    select: cardSelect,
    orderBy: defaultOrder,
    take,
  });
  return rows.map(toCard);
});

export const getActiveBanners = cache(async () => {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    select: { id: true, title: true, subtitle: true, imageUrl: true, ctaLabel: true, ctaHref: true, vehicle: { select: { slug: true, published: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
});

export const getTestimonials = cache(async () =>
  prisma.testimonial.findMany({
    where: { active: true },
    select: { id: true, name: true, city: true, vehicle: true, text: true, rating: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: 9,
  }),
);

/** Marcas / modelos / categorias que possuem veículos publicados (para filtros) */
export const getFilterOptions = cache(async () => {
  const [brands, categories, years, prices] = await Promise.all([
    prisma.brand.findMany({
      where: { vehicles: { some: PUBLIC_WHERE } },
      select: {
        name: true,
        slug: true,
        models: {
          where: { vehicles: { some: PUBLIC_WHERE } },
          select: { name: true, slug: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { vehicles: { where: PUBLIC_WHERE } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { vehicles: { some: PUBLIC_WHERE } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.aggregate({ where: PUBLIC_WHERE, _min: { modelYear: true }, _max: { modelYear: true } }),
    prisma.vehicle.aggregate({ where: PUBLIC_WHERE, _max: { price: true } }),
  ]);
  return {
    brands: brands.map((b) => ({ name: b.name, slug: b.slug, count: b._count.vehicles, models: b.models })),
    categories,
    minYear: years._min.modelYear ?? new Date().getFullYear() - 10,
    maxYear: years._max.modelYear ?? new Date().getFullYear() + 1,
    maxPrice: toNumber(prices._max.price),
  };
});

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;

function buildWhere(f: CatalogFilters): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [PUBLIC_WHERE];
  if (f.marca) and.push({ brand: { slug: f.marca } });
  if (f.modelo) and.push({ model: { slug: f.modelo } });
  if (f.categoria) and.push({ category: { slug: f.categoria } });
  if (f.anoMin) and.push({ modelYear: { gte: f.anoMin } });
  if (f.anoMax) and.push({ modelYear: { lte: f.anoMax } });
  if (f.kmMax !== undefined) and.push({ mileage: { lte: f.kmMax } });
  if (f.combustivel) and.push({ fuel: f.combustivel });
  if (f.cambio) and.push({ transmission: f.cambio });
  if (f.condicao) and.push({ condition: f.condicao === "novo" ? "NEW" : "USED" });
  if (f.ofertas) and.push({ OR: [{ isOffer: true }, { promoPrice: { not: null } }] });
  // Preço efetivo = promocional quando existir
  if (f.precoMin !== undefined) {
    and.push({
      OR: [
        { promoPrice: { gte: f.precoMin } },
        { promoPrice: null, price: { gte: f.precoMin } },
      ],
    });
  }
  if (f.precoMax !== undefined) {
    and.push({
      OR: [
        { promoPrice: { lte: f.precoMax } },
        { promoPrice: null, price: { lte: f.precoMax } },
      ],
    });
  }
  if (f.q) {
    const terms = f.q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const t of terms) {
      and.push({
        OR: [
          { version: { contains: t, mode: "insensitive" } },
          { brand: { name: { contains: t, mode: "insensitive" } } },
          { model: { name: { contains: t, mode: "insensitive" } } },
          { color: { contains: t, mode: "insensitive" } },
          { category: { name: { contains: t, mode: "insensitive" } } },
        ],
      });
    }
  }
  return { AND: and };
}

export async function searchVehicles(f: CatalogFilters) {
  const where = buildWhere(f);
  const page = f.pagina ?? 1;
  const sortByEffectivePrice = f.ordem === "menor-preco" || f.ordem === "maior-preco";

  if (sortByEffectivePrice) {
    // Ordenação por preço efetivo (promocional quando houver) é feita em memória sobre ids leves.
    const light = await prisma.vehicle.findMany({ where, select: { id: true, price: true, promoPrice: true } });
    const dir = f.ordem === "menor-preco" ? 1 : -1;
    const sorted = light
      .map((v) => ({ id: v.id, p: toNumber(v.promoPrice ?? v.price) }))
      .sort((a, b) => (a.p - b.p) * dir);
    const total = sorted.length;
    const ids = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((v) => v.id);
    const rows = await prisma.vehicle.findMany({ where: { id: { in: ids } }, select: cardSelect });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean).map((r) => toCard(r as CardRow));
    return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  }

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] =
    f.ordem === "menor-km"
      ? [{ mileage: "asc" }, { createdAt: "desc" }]
      : f.ordem === "recentes"
        ? [{ publishedAt: "desc" }, { createdAt: "desc" }]
        : defaultOrder;

  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({ where, select: cardSelect, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { items: rows.map(toCard), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getVehicleBySlug = cache(async (slug: string) => {
  const v = await prisma.vehicle.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      version: true,
      manufactureYear: true,
      modelYear: true,
      condition: true,
      mileage: true,
      price: true,
      promoPrice: true,
      acceptsTrade: true,
      financingAvailable: true,
      status: true,
      engine: true,
      power: true,
      fuel: true,
      transmission: true,
      steering: true,
      drivetrain: true,
      doors: true,
      seats: true,
      color: true,
      consumption: true,
      features: true,
      description: true,
      highlights: true,
      conservation: true,
      featured: true,
      isOffer: true,
      offerLabel: true,
      internalCode: true,
      brandId: true,
      categoryId: true,
      brand: { select: { name: true, slug: true, logoUrl: true } },
      model: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      images: { select: { id: true, url: true, width: true, height: true }, orderBy: { order: "asc" } },
    },
  });
  if (!v) return null;
  return {
    ...v,
    price: toNumber(v.price),
    promoPrice: v.promoPrice === null ? null : toNumber(v.promoPrice),
  };
});

export type VehicleDetail = NonNullable<Awaited<ReturnType<typeof getVehicleBySlug>>>;

export async function getRelatedVehicles(v: { id: string; brandId: string; categoryId: string | null }, take = 4) {
  const rows = await prisma.vehicle.findMany({
    where: {
      ...PUBLIC_WHERE,
      id: { not: v.id },
      OR: [{ brandId: v.brandId }, ...(v.categoryId ? [{ categoryId: v.categoryId }] : [])],
    },
    select: cardSelect,
    orderBy: defaultOrder,
    take,
  });
  if (rows.length < take) {
    const extra = await prisma.vehicle.findMany({
      where: { ...PUBLIC_WHERE, id: { notIn: [v.id, ...rows.map((r) => r.id)] } },
      select: cardSelect,
      orderBy: defaultOrder,
      take: take - rows.length,
    });
    rows.push(...extra);
  }
  return rows.map(toCard);
}

/** Lista leve para o select do formulário de orçamento */
export const getQuoteVehicleOptions = cache(async () => {
  const rows = await prisma.vehicle.findMany({
    where: { published: true, status: "AVAILABLE" },
    select: { id: true, version: true, modelYear: true, brand: { select: { name: true } }, model: { select: { name: true } } },
    orderBy: [{ brand: { name: "asc" } }, { model: { name: "asc" } }],
  });
  return rows.map((r) => ({ id: r.id, label: `${r.brand.name} ${r.model.name} ${r.version} ${r.modelYear}` }));
});

/** Veículo pré-selecionado no formulário de orçamento (?veiculo=id) */
export async function getQuoteSelectedVehicle(id: string | undefined) {
  if (!id || id.length > 40) return null;
  const v = await prisma.vehicle.findFirst({
    where: { id, published: true, status: { not: "SOLD" } },
    select: {
      id: true,
      version: true,
      modelYear: true,
      manufactureYear: true,
      price: true,
      promoPrice: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
      images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
    },
  });
  if (!v) return null;
  return {
    id: v.id,
    title: `${v.brand.name} ${v.model.name}`,
    subtitle: `${v.version} · ${v.manufactureYear}/${v.modelYear}`,
    price: toNumber(v.promoPrice ?? v.price),
    image: v.images[0]?.url ?? null,
  };
}

export async function getPublicStats() {
  const [available, brands] = await Promise.all([
    prisma.vehicle.count({ where: PUBLIC_WHERE }),
    prisma.brand.count({ where: { vehicles: { some: PUBLIC_WHERE } } }),
  ]);
  return { available, brands };
}

export async function getSitemapVehicles() {
  return prisma.vehicle.findMany({ where: PUBLIC_WHERE, select: { slug: true, updatedAt: true } });
}

export async function incrementVehicleViews(id: string) {
  await prisma.vehicle.updateMany({ where: { id, published: true }, data: { views: { increment: 1 } } });
}
