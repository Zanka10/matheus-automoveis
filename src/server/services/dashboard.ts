import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/server/auth/permissions";
import type { CurrentUser } from "@/server/auth/session";

const MONTHS = 12;
const OPEN_QUOTE = { notIn: ["FINISHED", "CANCELED"] } as Prisma.EnumQuoteStatusFilter;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(n: number) {
  const now = new Date();
  const out: { key: string; label: string; start: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    out.push({ key: monthKey(d), label: `${label.charAt(0).toUpperCase()}${label.slice(1)}/${String(d.getFullYear()).slice(2)}`, start: d });
  }
  return out;
}

export async function getDashboardData(user: CurrentUser) {
  const allQuotes = can(user, "quotes.viewAll");
  const seesQuotes = allQuotes || can(user, "quotes.view");
  const quoteScope: Prisma.QuoteWhereInput = allQuotes ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] };

  const months = lastMonths(MONTHS);
  const since = months[0].start;
  const last30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    total,
    available,
    sold,
    reserved,
    published,
    staff,
    quotesTotal,
    quotes30,
    quotesPending,
    entered,
    soldRows,
    quoteRows,
    byBrand,
    recentQuotes,
    recentMovements,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "SOLD" } }),
    prisma.vehicle.count({ where: { status: "RESERVED" } }),
    prisma.vehicle.count({ where: { published: true, status: { not: "SOLD" } } }),
    prisma.user.count({ where: { active: true } }),
    seesQuotes ? prisma.quote.count({ where: quoteScope }) : 0,
    seesQuotes ? prisma.quote.count({ where: { ...quoteScope, createdAt: { gte: last30 } } }) : 0,
    seesQuotes ? prisma.quote.count({ where: { ...quoteScope, status: OPEN_QUOTE } }) : 0,
    prisma.vehicle.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.vehicle.findMany({ where: { soldAt: { gte: since } }, select: { soldAt: true } }),
    seesQuotes ? prisma.quote.findMany({ where: { ...quoteScope, createdAt: { gte: since } }, select: { createdAt: true } }) : [],
    prisma.vehicle.groupBy({ by: ["brandId"], where: { status: { not: "SOLD" } }, _count: { _all: true } }),
    seesQuotes
      ? prisma.quote.findMany({
          where: quoteScope,
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { id: true, protocol: true, name: true, vehicleLabel: true, status: true, createdAt: true },
        })
      : [],
    prisma.vehicleMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true } },
        vehicle: { select: { id: true, internalCode: true, version: true, brand: { select: { name: true } }, model: { select: { name: true } } } },
      },
    }),
  ]);

  const flow = months.map((m) => ({ month: m.label, key: m.key, entradas: 0, vendas: 0, orcamentos: 0 }));
  const idx = new Map(flow.map((f, i) => [f.key, i]));
  for (const v of entered) {
    const i = idx.get(monthKey(v.createdAt));
    if (i !== undefined) flow[i].entradas++;
  }
  for (const v of soldRows) {
    const i = v.soldAt ? idx.get(monthKey(v.soldAt)) : undefined;
    if (i !== undefined) flow[i].vendas++;
  }
  for (const q of quoteRows) {
    const i = idx.get(monthKey(q.createdAt));
    if (i !== undefined) flow[i].orcamentos++;
  }

  const brandNames = await prisma.brand.findMany({
    where: { id: { in: byBrand.map((b) => b.brandId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(brandNames.map((b) => [b.id, b.name]));
  const brands = byBrand
    .map((b) => ({ name: nameOf.get(b.brandId) ?? "—", total: b._count._all }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    seesQuotes,
    kpis: { total, available, sold, reserved, published, staff, quotesTotal, quotes30, quotesPending },
    flow: flow.map(({ key: _key, ...rest }) => rest),
    stock: [
      { key: "AVAILABLE", label: "Disponíveis", value: available },
      { key: "RESERVED", label: "Reservados", value: reserved },
      { key: "SOLD", label: "Vendidos", value: sold },
    ],
    brands,
    recentQuotes: recentQuotes.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })),
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      type: m.type,
      note: m.note,
      fromStatus: m.fromStatus,
      toStatus: m.toStatus,
      userName: m.user?.name ?? null,
      createdAt: m.createdAt.toISOString(),
      vehicleId: m.vehicle.id,
      vehicleLabel: `${m.vehicle.brand.name} ${m.vehicle.model.name}`,
      vehicleCode: m.vehicle.internalCode,
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
