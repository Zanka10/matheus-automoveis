import "server-only";
import type { Prisma, VehicleCondition, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 15;

export type AdminVehicleFilters = {
  q?: string;
  status?: VehicleStatus;
  publicacao?: "publicado" | "rascunho" | "destaque" | "oferta";
  marca?: string;
  condicao?: VehicleCondition;
  pagina?: number;
};

const STATUS = ["AVAILABLE", "RESERVED", "SOLD"] as const;
const CONDITIONS = ["NEW", "USED"] as const;

export function parseAdminVehicleFilters(sp: Record<string, string | string[] | undefined>): AdminVehicleFilters {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const status = get("status");
  const pub = get("publicacao");
  const cond = get("condicao");
  const page = Number(get("pagina"));
  return {
    q: get("q")?.slice(0, 80) || undefined,
    status: STATUS.includes(status as VehicleStatus) ? (status as VehicleStatus) : undefined,
    publicacao: ["publicado", "rascunho", "destaque", "oferta"].includes(pub ?? "") ? (pub as AdminVehicleFilters["publicacao"]) : undefined,
    marca: get("marca")?.slice(0, 40) || undefined,
    condicao: CONDITIONS.includes(cond as VehicleCondition) ? (cond as VehicleCondition) : undefined,
    pagina: Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

export function buildVehicleWhere(f: AdminVehicleFilters): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [];
  if (f.q) {
    const q = f.q;
    const plate = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
    and.push({
      OR: [
        { version: { contains: q, mode: "insensitive" } },
        { internalCode: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { model: { name: { contains: q, mode: "insensitive" } } },
        ...(plate ? [{ plate: { contains: plate } }] : []),
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.marca) and.push({ brandId: f.marca });
  if (f.condicao) and.push({ condition: f.condicao });
  if (f.publicacao === "publicado") and.push({ published: true });
  if (f.publicacao === "rascunho") and.push({ published: false });
  if (f.publicacao === "destaque") and.push({ featured: true });
  if (f.publicacao === "oferta") and.push({ isOffer: true });
  return and.length ? { AND: and } : {};
}

export async function listAdminVehicles(f: AdminVehicleFilters) {
  const where = buildVehicleWhere(f);
  const page = f.pagina ?? 1;
  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        brand: { select: { name: true } },
        model: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        _count: { select: { quotes: true, images: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    rows: rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      internalCode: v.internalCode,
      title: `${v.brand.name} ${v.model.name}`,
      version: v.version,
      years: `${v.manufactureYear}/${v.modelYear}`,
      condition: v.condition,
      mileage: v.mileage,
      plate: v.plate,
      price: toNumber(v.price),
      promoPrice: v.promoPrice === null ? null : toNumber(v.promoPrice),
      status: v.status,
      published: v.published,
      featured: v.featured,
      isOffer: v.isOffer,
      offerLabel: v.offerLabel,
      thumb: v.images[0]?.url ?? null,
      imageCount: v._count.images,
      quoteCount: v._count.quotes,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

export type AdminVehicleRow = Awaited<ReturnType<typeof listAdminVehicles>>["rows"][number];

/** Opções dos selects do formulário: marcas/modelos/categorias cadastrados no painel */
export async function getVehicleFormOptions() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, models: { orderBy: { name: "asc" }, select: { id: true, name: true, categoryId: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { brands, categories };
}

export type VehicleFormOptions = Awaited<ReturnType<typeof getVehicleFormOptions>>;

export async function getActiveStaff() {
  return prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function getVehicleFull(id: string) {
  const v = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true, logoUrl: true } },
      model: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      images: { orderBy: { order: "asc" } },
      soldBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      movements: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { name: true } } },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, protocol: true, name: true, status: true, createdAt: true, assignedToId: true, assignedTo: { select: { name: true } } },
      },
    },
  });
  if (!v) return null;
  return {
    ...v,
    price: toNumber(v.price),
    promoPrice: v.promoPrice === null ? null : toNumber(v.promoPrice),
    soldPrice: v.soldPrice === null ? null : toNumber(v.soldPrice),
  };
}

export type VehicleFull = NonNullable<Awaited<ReturnType<typeof getVehicleFull>>>;

/** Gera o próximo código interno no formato MA-0001 */
export async function nextInternalCode(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await tx.vehicle.findMany({ where: { internalCode: { startsWith: "MA-" } }, select: { internalCode: true } });
  let max = 0;
  for (const r of rows) {
    const n = Number(r.internalCode.slice(3));
    if (Number.isInteger(n) && n > max) max = n;
  }
  for (let n = max + 1; ; n++) {
    const code = `MA-${String(n).padStart(4, "0")}`;
    if (!(await tx.vehicle.findUnique({ where: { internalCode: code }, select: { id: true } }))) return code;
  }
}
