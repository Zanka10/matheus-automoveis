"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/card";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Paleta validada (dataviz validate_palette, modo claro): ambas passam faixa de luminosidade,
// croma, separação para daltonismo (ΔE 24,5) e contraste ≥ 3:1 sobre a superfície.
export const SERIES = { primary: "#2a78d6", accent: "#c2373a" } as const;
const GRID = "oklch(0.92 0.004 75)";
const AXIS = "oklch(0.5 0.01 270)";

type Point = { label: string; cadastrados: number; vendidos: number; orcamentos: number; convertidos: number; receita: number };

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-foreground">{money ? formatPrice(p.value) : formatNumber(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const legendFormatter = (value: string) => <span className="text-xs text-muted-foreground">{value}</span>;

/** Painel com alternância gráfico / tabela (a tabela é a visão acessível dos mesmos dados) */
function ChartFrame({
  title,
  description,
  table,
  children,
}: {
  title: string;
  description?: string;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Visualização">
          {(
            [
              ["chart", BarChart3, "Gráfico"],
              ["table", Table2, "Tabela"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={label}
              className={cn("rounded-md p-1.5 text-muted-foreground transition", view === v && "bg-card text-foreground shadow-sm")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </header>
      {view === "chart" ? <div className="h-72">{children}</div> : <div className="max-h-72 overflow-y-auto">{table}</div>}
    </section>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: AXIS },
  tickLine: false,
  axisLine: false,
} as const;

function SeriesTable({ data, cols }: { data: Point[]; cols: { key: keyof Point; label: string; money?: boolean }[] }) {
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH>Período</TH>
          {cols.map((c) => (
            <TH key={c.key} className="text-right">
              {c.label}
            </TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {data.map((d) => (
          <TR key={d.label}>
            <TD>{d.label}</TD>
            {cols.map((c) => (
              <TD key={c.key} className="text-right tabular-nums">
                {c.money ? formatPrice(d[c.key] as number) : formatNumber(d[c.key] as number)}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function StockChart({ data }: { data: Point[] }) {
  return (
    <ChartFrame
      title="Movimentação de veículos"
      description="Veículos cadastrados e vendidos no período"
      table={
        <SeriesTable
          data={data}
          cols={[
            { key: "cadastrados", label: "Cadastrados" },
            { key: "vendidos", label: "Vendidos" },
          ]}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="20%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" {...axisProps} minTickGap={12} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.95 0.004 75)" }} />
          <Legend iconType="circle" iconSize={8} formatter={legendFormatter} />
          <Bar dataKey="cadastrados" name="Cadastrados" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="vendidos" name="Vendidos" fill={SERIES.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function QuotesChart({ data }: { data: Point[] }) {
  return (
    <ChartFrame
      title="Orçamentos e conversões"
      description="Solicitações recebidas e convertidas em venda"
      table={
        <SeriesTable
          data={data}
          cols={[
            { key: "orcamentos", label: "Recebidos" },
            { key: "convertidos", label: "Convertidos" },
          ]}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="20%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" {...axisProps} minTickGap={12} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.95 0.004 75)" }} />
          <Legend iconType="circle" iconSize={8} formatter={legendFormatter} />
          <Bar dataKey="orcamentos" name="Recebidos" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="convertidos" name="Convertidos" fill={SERIES.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueChart({ data }: { data: Point[] }) {
  const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
  return (
    <ChartFrame
      title="Receita de vendas"
      description="Soma dos valores de venda no período"
      table={<SeriesTable data={data} cols={[{ key: "receita", label: "Receita", money: true }]} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" {...axisProps} minTickGap={12} />
          <YAxis {...axisProps} tickFormatter={(v: number) => `R$ ${compact.format(v)}`} width={64} />
          <Tooltip content={<ChartTooltip money />} cursor={{ fill: "oklch(0.95 0.004 75)" }} />
          <Bar dataKey="receita" name="Receita" fill={SERIES.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RankingChart({
  title,
  description,
  data,
  unit,
}: {
  title: string;
  description?: string;
  data: { name: string; value: number }[];
  unit: string;
}) {
  return (
    <ChartFrame
      title={title}
      description={description}
      table={
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>#</TH>
              <TH>Nome</TH>
              <TH className="text-right">{unit}</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((d, i) => (
              <TR key={d.name}>
                <TD className="text-muted-foreground">{i + 1}</TD>
                <TD>{d.name}</TD>
                <TD className="text-right tabular-nums">{formatNumber(d.value)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      }
    >
      {data.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">Sem dados no período</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" {...axisProps} width={130} tick={{ fontSize: 11, fill: "oklch(0.3 0.01 270)" }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.95 0.004 75)" }} />
            <Bar
              dataKey="value"
              name={unit}
              fill={SERIES.primary}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              label={{ position: "right", fontSize: 11, fill: AXIS }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
