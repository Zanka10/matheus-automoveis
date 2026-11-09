import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export type ReportRange = { from: Date; to: Date; label: string };
export type Granularity = "day" | "week" | "month";

const TZ_OFFSET = "-03:00";
const DAY = 86_400_000;

/** Resolve o período a partir dos parâmetros da URL (padrão: últimos 90 dias) */
export function resolveRange(params: { de?: string; ate?: string; periodo?: string }): ReportRange {
  const now = new Date();
  const endToday = new Date(`${now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}T23:59:59.999${TZ_OFFSET}`);
  const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const de = valid(params.de);
  const ate = valid(params.ate);
  if (de || ate) {
    const from = de ? new Date(`${de}T00:00:00${TZ_OFFSET}`) : new Date(endToday.getTime() - 90 * DAY);
    const to = ate ? new Date(`${ate}T23:59:59.999${TZ_OFFSET}`) : endToday;
    if (from <= to) return { from, to, label: "Período personalizado" };
  }
  if (params.periodo === "ano") {
    const year = Number(now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 4));
    return { from: new Date(`${year}-01-01T00:00:00${TZ_OFFSET}`), to: endToday, label: "Este ano" };
  }
  const days = params.periodo === "7" ? 7 : params.periodo === "30" ? 30 : params.periodo === "365" ? 365 : 90;
  return { from: new Date(endToday.getTime() - days * DAY + 1), to: endToday, label: `Últimos ${days} dias` };
}

export function granularityFor(range: ReportRange): Granularity {
  const days = (range.to.getTime() - range.from.getTime()) / DAY;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function localParts(d: Date) {
  const s = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  return s;
}

function bucketKey(d: Date, g: Granularity) {
  const s = localParts(d);
  if (g === "day") return s;
  if (g === "month") return s.slice(0, 7);
  // Semana iniciando na segunda-feira
  const local = new Date(`${s}T12:00:00Z`);
  const dow = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - dow * DAY).toISOString().slice(0, 10);
}

function bucketLabel(key: string, g: Granularity) {
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  if (g === "month") return `${months[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`;
  const [, m, d] = key.split("-");
  return g === "week" ? `sem. ${d}/${m}` : `${d}/${m}`;
}

function buildBuckets(range: ReportRange, g: Granularity) {
  const keys: string[] = [];
  let cursor = new Date(range.from);
  while (cursor <= range.to) {
    const k = bucketKey(cursor, g);
    if (!keys.includes(k)) keys.push(k);
    cursor = new Date(cursor.getTime() + (g === "month" ? 27 : g === "week" ? 7 : 1) * DAY);
  }
  const last = bucketKey(range.to, g);
  if (!keys.includes(last)) keys.push(last);
  return keys;
}

export async function getReport(range: ReportRange) {
  const g = granularityFor(range);
  const inRange = { gte: range.from, lte: range.to };

  const [created, sold, quotes, availableNow, reservedNow, publishedNow, users, popular] = await Promise.all([
    prisma.vehicle.findMany({ where: { createdAt: inRange }, select: { createdAt: true } }),
    prisma.vehicle.findMany({
      where: { status: "SOLD", soldAt: inRange },
      select: { soldAt: true, createdAt: true, soldPrice: true, price: true, soldById: true },
    }),
    prisma.quote.findMany({
      where: { createdAt: inRange },
      select: {
        createdAt: true,
        status: true,
        convertedToSale: true,
        assignedToId: true,
        vehicle: { select: { brand: { select: { name: true } }, model: { select: { name: true } } } },
      },
    }),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "RESERVED" } }),
    prisma.vehicle.count({ where: { status: { not: "SOLD" }, published: true } }),
    prisma.user.findMany({ select: { id: true, name: true, role: true, active: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({
      where: { views: { gt: 0 } },
      orderBy: { views: "desc" },
      take: 200,
      select: { views: true, brand: { select: { name: true } }, model: { select: { name: true } } },
    }),
  ]);

  // Série temporal
  const keys = buildBuckets(range, g);
  const series = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, g), cadastrados: 0, vendidos: 0, orcamentos: 0, convertidos: 0, receita: 0 }]));
  const bump = (d: Date, field: "cadastrados" | "vendidos" | "orcamentos" | "convertidos", inc = 1) => {
    const b = series.get(bucketKey(d, g));
    if (b) b[field] += inc;
  };
  created.forEach((v) => bump(v.createdAt, "cadastrados"));
  sold.forEach((v) => {
    if (!v.soldAt) return;
    bump(v.soldAt, "vendidos");
    const b = series.get(bucketKey(v.soldAt, g));
    if (b) b.receita += toNumber(v.soldPrice ?? v.price);
  });
  quotes.forEach((q) => {
    bump(q.createdAt, "orcamentos");
    if (q.convertedToSale) bump(q.createdAt, "convertidos");
  });

  // Indicadores
  const revenue = sold.reduce((s, v) => s + toNumber(v.soldPrice ?? v.price), 0);
  const converted = quotes.filter((q) => q.convertedToSale).length;
  const finished = quotes.filter((q) => q.status === "FINISHED" || q.status === "CANCELED").length;
  const avgDaysToSell = sold.length
    ? Math.round(sold.reduce((s, v) => s + ((v.soldAt?.getTime() ?? 0) - v.createdAt.getTime()) / DAY, 0) / sold.length)
    : null;

  // Desempenho por funcionário
  const perf = new Map(
    users.map((u) => [u.id, { id: u.id, name: u.name, role: u.role, active: u.active, orcamentos: 0, finalizados: 0, convertidos: 0, vendas: 0, receita: 0 }]),
  );
  quotes.forEach((q) => {
    const p = q.assignedToId ? perf.get(q.assignedToId) : undefined;
    if (!p) return;
    p.orcamentos++;
    if (q.status === "FINISHED") p.finalizados++;
    if (q.convertedToSale) p.convertidos++;
  });
  sold.forEach((v) => {
    const p = v.soldById ? perf.get(v.soldById) : undefined;
    if (!p) return;
    p.vendas++;
    p.receita += toNumber(v.soldPrice ?? v.price);
  });
  const performance = Array.from(perf.values())
    .filter((p) => p.active || p.orcamentos || p.vendas)
    .map((p) => ({ ...p, taxa: p.orcamentos ? p.convertidos / p.orcamentos : 0 }))
    .sort((a, b) => b.receita - a.receita || b.convertidos - a.convertidos || b.orcamentos - a.orcamentos);

  // Marcas e modelos mais procurados
  const brandQuotes = new Map<string, number>();
  const modelQuotes = new Map<string, number>();
  quotes.forEach((q) => {
    if (!q.vehicle) return;
    brandQuotes.set(q.vehicle.brand.name, (brandQuotes.get(q.vehicle.brand.name) ?? 0) + 1);
    const m = `${q.vehicle.brand.name} ${q.vehicle.model.name}`;
    modelQuotes.set(m, (modelQuotes.get(m) ?? 0) + 1);
  });
  const modelViews = new Map<string, number>();
  popular.forEach((v) => {
    const m = `${v.brand.name} ${v.model.name}`;
    modelViews.set(m, (modelViews.get(m) ?? 0) + v.views);
  });
  const top = (m: Map<string, number>, n = 8) =>
    Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);

  return {
    granularity: g,
    series: Array.from(series.values()),
    summary: {
      vehiclesCreated: created.length,
      vehiclesSold: sold.length,
      revenue,
      availableNow,
      reservedNow,
      publishedNow,
      quotesReceived: quotes.length,
      quotesConverted: converted,
      quotesClosed: finished,
      conversionRate: quotes.length ? converted / quotes.length : 0,
      avgDaysToSell,
    },
    performance,
    topBrandsByQuotes: top(brandQuotes),
    topModelsByQuotes: top(modelQuotes),
    topModelsByViews: top(modelViews),
  };
}

export type ReportData = Awaited<ReturnType<typeof getReport>>;

// ───────────── Exportação (CSV) ─────────────

export const EXPORT_TYPES = {
  veiculos: "Veículos cadastrados",
  vendas: "Veículos vendidos",
  orcamentos: "Orçamentos recebidos",
  funcionarios: "Desempenho por funcionário",
} as const;
export type ExportType = keyof typeof EXPORT_TYPES;

const STATUS_PT: Record<string, string> = { AVAILABLE: "Disponível", RESERVED: "Reservado", SOLD: "Vendido" };
const QUOTE_PT: Record<string, string> = {
  NEW: "Novo",
  IN_PROGRESS: "Em atendimento",
  AWAITING_RETURN: "Aguardando retorno",
  PROPOSAL_SENT: "Proposta enviada",
  NEGOTIATION: "Negociação",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado",
};
const ROLE_PT: Record<string, string> = { ADMIN: "Administrador", MANAGER: "Gerente", SELLER: "Vendedor" };

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "";
const fmtMoney = (v: unknown) => (v === null || v === undefined ? "" : toNumber(v).toFixed(2).replace(".", ","));

export async function buildExportRows(type: ExportType, range: ReportRange): Promise<(string | number)[][]> {
  const inRange = { gte: range.from, lte: range.to };
  if (type === "veiculos") {
    const rows = await prisma.vehicle.findMany({
      where: { createdAt: inRange },
      orderBy: { createdAt: "asc" },
      include: { brand: true, model: true, category: true },
    });
    return [
      ["Código", "Marca", "Modelo", "Versão", "Ano fab.", "Ano mod.", "Categoria", "Condição", "Km", "Preço", "Preço promocional", "Status", "Publicado", "Destaque", "Visualizações", "Cadastrado em"],
      ...rows.map((v) => [
        v.internalCode,
        v.brand.name,
        v.model.name,
        v.version,
        v.manufactureYear,
        v.modelYear,
        v.category?.name ?? "",
        v.condition === "NEW" ? "Novo" : "Seminovo",
        v.mileage,
        fmtMoney(v.price),
        fmtMoney(v.promoPrice),
        STATUS_PT[v.status],
        v.published ? "Sim" : "Não",
        v.featured ? "Sim" : "Não",
        v.views,
        fmtDate(v.createdAt),
      ]),
    ];
  }
  if (type === "vendas") {
    const rows = await prisma.vehicle.findMany({
      where: { status: "SOLD", soldAt: inRange },
      orderBy: { soldAt: "asc" },
      include: { brand: true, model: true, soldBy: { select: { name: true } } },
    });
    return [
      ["Código", "Veículo", "Ano", "Preço anunciado", "Valor de venda", "Vendedor", "Cadastrado em", "Vendido em", "Dias em estoque"],
      ...rows.map((v) => [
        v.internalCode,
        `${v.brand.name} ${v.model.name} ${v.version}`,
        `${v.manufactureYear}/${v.modelYear}`,
        fmtMoney(v.price),
        fmtMoney(v.soldPrice ?? v.price),
        v.soldBy?.name ?? "",
        fmtDate(v.createdAt),
        fmtDate(v.soldAt),
        v.soldAt ? Math.round((v.soldAt.getTime() - v.createdAt.getTime()) / DAY) : "",
      ]),
    ];
  }
  if (type === "orcamentos") {
    const rows = await prisma.quote.findMany({
      where: { createdAt: inRange },
      orderBy: { createdAt: "asc" },
      include: { assignedTo: { select: { name: true } } },
    });
    return [
      ["Protocolo", "Data", "Cliente", "Telefone", "E-mail", "Veículo", "Financiamento", "Troca", "Status", "Convertido em venda", "Responsável", "Encerrado em"],
      ...rows.map((q) => [
        q.protocol,
        fmtDate(q.createdAt),
        q.name,
        q.phone,
        q.email,
        q.vehicleLabel ?? "",
        q.wantsFinancing ? "Sim" : "Não",
        q.hasTradeIn ? [q.tradeInBrand, q.tradeInModel, q.tradeInYear].filter(Boolean).join(" ") || "Sim" : "Não",
        QUOTE_PT[q.status],
        q.convertedToSale ? "Sim" : "Não",
        q.assignedTo?.name ?? "",
        fmtDate(q.closedAt),
      ]),
    ];
  }
  const report = await getReport(range);
  return [
    ["Funcionário", "Perfil", "Orçamentos atribuídos", "Finalizados", "Convertidos", "Taxa de conversão (%)", "Veículos vendidos", "Receita"],
    ...report.performance.map((p) => [
      p.name,
      ROLE_PT[p.role],
      p.orcamentos,
      p.finalizados,
      p.convertidos,
      (p.taxa * 100).toFixed(1).replace(".", ","),
      p.vendas,
      fmtMoney(p.receita),
    ]),
  ];
}

/** CSV compatível com Excel pt-BR: separador ";" e BOM UTF-8. Neutraliza injeção de fórmulas. */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}
