"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* Paleta categórica validada (dataviz: CVD ΔE ≥ 9, ordem fixa) */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
const SURFACE = "#ffffff";
const GRID = "#ececea";
const AXIS_TEXT = "#6b6b70";

const axisProps = {
  tick: { fill: AXIS_TEXT, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: { fill?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: number | string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
          {i.value !== undefined && <span className="font-semibold text-foreground">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Entradas x vendas de veículos por mês (colunas agrupadas) */
export function FlowChart({ data }: { data: { month: string; entradas: number; vendas: number }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Legend
        items={[
          { label: "Entradas no estoque", color: SERIES[0] },
          { label: "Vendas", color: SERIES[1] },
        ]}
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="entradas" name="Entradas" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="vendas" name="Vendas" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Orçamentos recebidos por mês (série única: linha + área suave) */
export function QuotesChart({ data }: { data: { month: string; orcamentos: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c9c9c6", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="orcamentos"
            name="Orçamentos"
            stroke={SERIES[0]}
            strokeWidth={2}
            fill={SERIES[0]}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Estoque por status (rosca com gap de 2px e legenda com valores) */
export function StockDonut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="100%" stroke={SURFACE} strokeWidth={2} paddingAngle={0}>
              {data.map((d, i) => (
                <Cell key={d.label} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-2xl font-bold leading-none">{total}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">veículos</p>
          </div>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="flex-1 text-muted-foreground">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Marcas com mais veículos em estoque (barras horizontais, valor na ponta) */
export function BrandsChart({ data }: { data: { name: string; total: number }[] }) {
  return (
    <div style={{ height: Math.max(140, data.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={104} {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="total" name="Em estoque" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18}>
            <LabelList dataKey="total" position="right" fill={AXIS_TEXT} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
