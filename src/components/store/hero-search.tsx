"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterOptions } from "@/server/services/catalog";

const PRICE_RANGES = [
  { label: "Até R$ 100 mil", max: 100000 },
  { label: "Até R$ 150 mil", max: 150000 },
  { label: "Até R$ 200 mil", max: 200000 },
  { label: "Até R$ 300 mil", max: 300000 },
  { label: "Até R$ 500 mil", max: 500000 },
  { label: "Acima de R$ 500 mil", min: 500000 },
];

export function HeroSearch({ options, className }: { options: FilterOptions; className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");

  const models = useMemo(() => options.brands.find((b) => b.slug === brand)?.models ?? [], [brand, options.brands]);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = options.maxYear; y >= options.minYear; y--) list.push(y);
    return list;
  }, [options.maxYear, options.minYear]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (brand) sp.set("marca", brand);
    if (model) sp.set("modelo", model);
    if (year) sp.set("anoMin", year);
    const range = PRICE_RANGES[Number(price)];
    if (price !== "" && range) {
      if (range.max) sp.set("precoMax", String(range.max));
      if (range.min) sp.set("precoMin", String(range.min));
    }
    router.push(`/veiculos${sp.size ? `?${sp}` : ""}`);
  }

  const selectCls = "h-12 rounded-xl border-transparent bg-secondary/70 font-medium focus-visible:bg-card";

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Buscar veículos"
      className={cn("rounded-2xl bg-card p-3 shadow-[0_30px_60px_-25px_rgba(15,15,25,0.45)] ring-1 ring-black/5 sm:p-4", className)}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque por marca, modelo ou versão — ex.: Compass Limited"
          aria-label="Buscar por marca, modelo ou versão"
          className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground/80"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3 lg:grid-cols-[1fr_1fr_0.8fr_1fr_auto]">
        <NativeSelect aria-label="Marca" value={brand} onChange={(e) => { setBrand(e.target.value); setModel(""); }} className={selectCls}>
          <option value="">Todas as marcas</option>
          {options.brands.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand} className={selectCls}>
          <option value="">{brand ? "Todos os modelos" : "Modelo"}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Ano mínimo" value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
          <option value="">Ano a partir de</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Faixa de preço" value={price} onChange={(e) => setPrice(e.target.value)} className={selectCls}>
          <option value="">Qualquer preço</option>
          {PRICE_RANGES.map((r, i) => (
            <option key={r.label} value={i}>{r.label}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="brand" size="lg" className="col-span-2 h-12 rounded-xl px-7 lg:col-span-1">
          <Search /> Buscar
        </Button>
      </div>
    </form>
  );
}
