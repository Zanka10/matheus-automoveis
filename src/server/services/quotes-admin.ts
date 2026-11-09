import "server-only";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/server/auth/permissions";
import type { CurrentUser } from "@/server/auth/session";
import { quoteStatusOrder } from "@/lib/labels";

/** Restringe orçamentos ao que o usuário pode ver: todos, ou atribuídos a ele / sem responsável */
export function quoteVisibilityWhere(user: CurrentUser): Prisma.QuoteWhereInput {
  if (can(user, "quotes.viewAll")) return {};
  return { OR: [{ assignedToId: user.id }, { assignedToId: null }] };
}

export type QuoteListFilters = {
  status?: QuoteStatus;
  q?: string;
  responsavel?: string; // userId | "none" | "me"
  de?: string;
  ate?: string;
  pagina?: number;
};

export const QUOTES_PAGE_SIZE = 20;

function parseDate(v?: string, endOfDay = false) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00"}-03:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildQuoteWhere(user: CurrentUser, f: QuoteListFilters, includeStatus = true): Prisma.QuoteWhereInput {
  const and: Prisma.QuoteWhereInput[] = [quoteVisibilityWhere(user)];
  if (includeStatus && f.status) and.push({ status: f.status });
  if (f.q) {
    const q = f.q.trim();
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { protocol: { contains: q, mode: "insensitive" } },
        { vehicleLabel: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  if (f.responsavel === "none") and.push({ assignedToId: null });
  else if (f.responsavel === "me") and.push({ assignedToId: user.id });
  else if (f.responsavel) and.push({ assignedToId: f.responsavel });
  const from = parseDate(f.de);
  const to = parseDate(f.ate, true);
  if (from || to) and.push({ createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } });
  return { AND: and };
}

export async function listQuotes(user: CurrentUser, f: QuoteListFilters) {
  const page = Math.max(1, f.pagina ?? 1);
  const where = buildQuoteWhere(user, f);
  const [items, total, grouped] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * QUOTES_PAGE_SIZE,
      take: QUOTES_PAGE_SIZE,
      select: {
        id: true,
        protocol: true,
        name: true,
        phone: true,
        email: true,
        vehicleLabel: true,
        vehicleId: true,
        createdAt: true,
        status: true,
        wantsFinancing: true,
        hasTradeIn: true,
        source: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.quote.count({ where }),
    prisma.quote.groupBy({ by: ["status"], where: buildQuoteWhere(user, f, false), _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(quoteStatusOrder.map((s) => [s, 0])) as Record<QuoteStatus, number>;
  for (const g of grouped) counts[g.status] = g._count._all;
  return { items, total, page, pages: Math.max(1, Math.ceil(total / QUOTES_PAGE_SIZE)), counts };
}

/** Lista para o quadro Kanban (limite por coluna) */
export async function listQuotesBoard(user: CurrentUser, f: QuoteListFilters) {
  const where = buildQuoteWhere(user, f, false);
  const items = await prisma.quote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: {
      id: true,
      protocol: true,
      name: true,
      vehicleLabel: true,
      createdAt: true,
      status: true,
      wantsFinancing: true,
      hasTradeIn: true,
      assignedTo: { select: { name: true } },
    },
  });
  return items;
}

export async function getQuoteForUser(user: CurrentUser, id: string) {
  return prisma.quote.findFirst({
    where: { AND: [{ id }, quoteVisibilityWhere(user)] },
    include: {
      vehicle: {
        select: {
          id: true,
          slug: true,
          internalCode: true,
          version: true,
          modelYear: true,
          manufactureYear: true,
          price: true,
          promoPrice: true,
          status: true,
          published: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
}

export async function listAssignableUsers() {
  return prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
