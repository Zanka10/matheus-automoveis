import { CarFront, CircleDollarSign, Clock, Handshake, MessagesSquare, Percent, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, Table, TBody, TD, TH, THead, TR, Badge } from "@/components/ui/card";
import { PeriodFilter } from "@/components/admin/reports/period-filter";
import { QuotesChart, RankingChart, RevenueChart, StockChart } from "@/components/admin/reports/report-charts";
import { formatNumber, formatPrice } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { requirePermission } from "@/server/auth/session";
import { getReport, resolveRange } from "@/server/services/reports";

export const metadata = { title: "Relatórios" };

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; periodo?: string }> }) {
  await requirePermission("reports.view");
  const sp = await searchParams;
  const range = resolveRange(sp);
  const report = await getReport(range);
  const s = report.summary;
  const granularity = { day: "por dia", week: "por semana", month: "por mês" }[report.granularity];

  const kpis = [
    { label: "Veículos cadastrados", value: formatNumber(s.vehiclesCreated), icon: CarFront },
    { label: "Veículos vendidos", value: formatNumber(s.vehiclesSold), icon: Handshake },
    { label: "Receita de vendas", value: formatPrice(s.revenue), icon: CircleDollarSign },
    { label: "Disponíveis agora", value: formatNumber(s.availableNow), icon: Warehouse, hint: `${s.reservedNow} reservado(s) · ${s.publishedNow} no site` },
    { label: "Orçamentos recebidos", value: formatNumber(s.quotesReceived), icon: MessagesSquare },
    { label: "Convertidos em venda", value: formatNumber(s.quotesConverted), icon: Percent, hint: `Taxa de conversão ${pct(s.conversionRate)}` },
    { label: "Tempo médio de venda", value: s.avgDaysToSell === null ? "—" : `${s.avgDaysToSell} dias`, icon: Clock, hint: "Do cadastro à venda" },
  ];

  return (
    <>
      <PageHeader
        title="Relatórios e indicadores"
        description={`${range.label}: ${range.from.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} a ${range.to.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · agrupado ${granularity}`}
      />
      <div className="flex flex-col gap-6">
        <PeriodFilter from={ymd(range.from)} to={ymd(range.to)} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <k.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight">{k.value}</p>
              {k.hint && <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <StockChart data={report.series} />
          <QuotesChart data={report.series} />
        </div>
        <RevenueChart data={report.series} />

        <Card className="overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-base font-semibold">Desempenho por funcionário</h3>
            <p className="text-sm text-muted-foreground">Orçamentos recebidos no período e vendas concluídas no período.</p>
          </div>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Funcionário</TH>
                <TH className="text-right">Orçamentos</TH>
                <TH className="text-right">Finalizados</TH>
                <TH className="text-right">Convertidos</TH>
                <TH className="text-right">Conversão</TH>
                <TH className="text-right">Vendas</TH>
                <TH className="text-right">Receita</TH>
              </TR>
            </THead>
            <TBody>
              {report.performance.length === 0 && (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Sem atendimentos no período.
                  </TD>
                </TR>
              )}
              {report.performance.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="muted" className="mt-0.5">
                      {roleLabels[p.role]}
                    </Badge>
                  </TD>
                  <TD className="text-right tabular-nums">{p.orcamentos}</TD>
                  <TD className="text-right tabular-nums">{p.finalizados}</TD>
                  <TD className="text-right tabular-nums">{p.convertidos}</TD>
                  <TD className="text-right tabular-nums">{p.orcamentos ? pct(p.taxa) : "—"}</TD>
                  <TD className="text-right tabular-nums">{p.vendas}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatPrice(p.receita)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <div className="grid gap-6 xl:grid-cols-3">
          <RankingChart title="Marcas mais procuradas" description="Por orçamentos no período" data={report.topBrandsByQuotes} unit="Orçamentos" />
          <RankingChart title="Modelos mais procurados" description="Por orçamentos no período" data={report.topModelsByQuotes} unit="Orçamentos" />
          <RankingChart title="Modelos mais visualizados" description="Visualizações acumuladas na loja" data={report.topModelsByViews} unit="Visualizações" />
        </div>
      </div>
    </>
  );
}
