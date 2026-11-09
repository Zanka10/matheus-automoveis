import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Clock3,
  Globe,
  Inbox,
  PackageCheck,
  Plus,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatusPill } from "@/components/admin/page-header";
import { BrandsChart, FlowChart, QuotesChart, StockDonut } from "@/components/admin/charts/charts";
import { KpiCard } from "@/components/admin/dashboard/kpi-card";
import { movementLabels, quoteStatusLabels, quoteStatusTone } from "@/lib/labels";
import { formatNumber, relativeTime } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getDashboardData } from "@/server/services/dashboard";

// O template do layout não se aplica a uma página no mesmo segmento — título absoluto
export const metadata = { title: { absolute: "Dashboard | Painel Matheus Automóveis" } };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard.view");
  const data = await getDashboardData(user);
  const { kpis } = data;
  const firstName = user.name.split(" ")[0];
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Resumo da operação da loja em tempo real."
        actions={
          can(user, "vehicles.create") && (
            <Button asChild variant="brand">
              <Link href="/admin/veiculos/novo">
                <Plus /> Cadastrar veículo
              </Link>
            </Button>
          )
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Indicadores">
        <KpiCard label="Veículos cadastrados" value={formatNumber(kpis.total)} icon={<CarFront />} href="/admin/veiculos" />
        <KpiCard label="Disponíveis em estoque" value={formatNumber(kpis.available)} icon={<PackageCheck />} href="/admin/estoque?status=AVAILABLE" accent />
        <KpiCard label="Reservados" value={formatNumber(kpis.reserved)} icon={<Timer />} href="/admin/estoque?status=RESERVED" />
        <KpiCard label="Vendidos" value={formatNumber(kpis.sold)} icon={<BadgeCheck />} href="/admin/estoque?status=SOLD" />
        <KpiCard label="Publicados no site" value={formatNumber(kpis.published)} icon={<Globe />} href="/admin/veiculos?publicacao=publicado" />
        {data.seesQuotes && (
          <>
            <KpiCard
              label="Orçamentos recebidos"
              value={formatNumber(kpis.quotesTotal)}
              hint={`${formatNumber(kpis.quotes30)} nos últimos 30 dias`}
              icon={<Inbox />}
              href="/admin/orcamentos"
            />
            <KpiCard label="Orçamentos pendentes" value={formatNumber(kpis.quotesPending)} icon={<Clock3 />} href="/admin/orcamentos" />
          </>
        )}
        <KpiCard label="Funcionários ativos" value={formatNumber(kpis.staff)} icon={<Users />} href={can(user, "users.manage") ? "/admin/funcionarios" : undefined} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Movimentação de veículos</CardTitle>
            <CardDescription>Entradas no estoque e vendas nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <FlowChart data={data.flow} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estoque por status</CardTitle>
            <CardDescription>Situação atual de todos os veículos</CardDescription>
          </CardHeader>
          <CardContent>
            <StockDonut data={data.stock} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {data.seesQuotes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Orçamentos por mês</CardTitle>
              <CardDescription>Solicitações recebidas pelo site nos últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <QuotesChart data={data.flow} />
            </CardContent>
          </Card>
        )}
        <Card className={data.seesQuotes ? "" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle>Marcas em estoque</CardTitle>
            <CardDescription>Veículos disponíveis ou reservados</CardDescription>
          </CardHeader>
          <CardContent>
            {data.brands.length ? <BrandsChart data={data.brands} /> : <p className="text-sm text-muted-foreground">Nenhum veículo em estoque.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.seesQuotes && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Últimos orçamentos</CardTitle>
                <CardDescription>Solicitações mais recentes</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orcamentos">
                  Ver todos <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              {data.recentQuotes.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-muted-foreground">Nenhum orçamento recebido ainda.</p>
              ) : (
                <ul className="divide-y">
                  {data.recentQuotes.map((q) => (
                    <li key={q.id}>
                      <Link href={`/admin/orcamentos/${q.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{q.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {q.protocol} · {q.vehicleLabel ?? "Sem veículo definido"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusPill tone={quoteStatusTone[q.status]}>{quoteStatusLabels[q.status]}</StatusPill>
                          <span className="text-[11px] text-muted-foreground">{relativeTime(q.createdAt)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
        <Card className={data.seesQuotes ? "" : "lg:col-span-2"}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Movimentações recentes</CardTitle>
              <CardDescription>Histórico de estoque e publicações</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/estoque#movimentacoes">
                Ver histórico <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {data.recentMovements.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <ul className="divide-y">
                {data.recentMovements.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/veiculos/${m.vehicleId}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                      <span className="size-2 shrink-0 rounded-full bg-brand/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <span className="font-medium">{movementLabels[m.type]}</span>
                          <span className="text-muted-foreground"> · {m.vehicleLabel}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.vehicleCode}
                          {m.userName ? ` · por ${m.userName}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(m.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
