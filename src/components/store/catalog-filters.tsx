"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { FilterOptions } from "@/server/services/catalog";

const KEYS = ["q", "marca", "modelo", "categoria", "anoMin", "anoMax", "precoMin", "precoMax", "kmMax", "combustivel", "cambio", "condicao", "ofertas"] as const;
type Key = (typeof KEYS)[number];
type State = Partial<Record<Key, string>>;

const KM_OPTIONS = [10000, 30000, 50000, 80000, 120000];

function readState(sp: URLSearchParams): State {
  const s: State = {};
  for (const k of KEYS) {
    const v = sp.get(k);
    if (v) s[k] = v;
  }
  return s;
}

export function useCatalogNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const apply = (next: State, keepSort = true) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    const ordem = searchParams.get("ordem");
    if (keepSort && ordem) sp.set("ordem", ordem);
    startTransition(() => router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };
  return { apply, pending, searchParams };
}

function FilterFields({ options, state, set }: { options: FilterOptions; state: State; set: (k: Key, v: string) => void }) {
  const models = useMemo(() => options.brands.find((b) => b.slug === state.marca)?.models ?? [], [options.brands, state.marca]);
  const years = useMemo(() => {
    const ys: number[] = [];
    for (let y = options.maxYear; y >= options.minYear; y--) ys.push(y);
    return ys;
  }, [options.maxYear, options.minYear]);

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup label="Busca" htmlFor="f-q">
        <Input id="f-q" value={state.q ?? ""} onChange={(e) => set("q", e.target.value)} placeholder="Ex.: Corolla, turbo, preto" />
      </FilterGroup>

      <FilterGroup label="Condição">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {[
            ["", "Todos"],
            ["novo", "0 km"],
            ["seminovo", "Seminovos"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => set("condicao", v)}
              aria-pressed={(state.condicao ?? "") === v}
              className={cn(
                "rounded-md py-1.5 text-sm font-medium transition",
                (state.condicao ?? "") === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Marca" htmlFor="f-marca">
        <NativeSelect id="f-marca" value={state.marca ?? ""} onChange={(e) => { set("marca", e.target.value); set("modelo", ""); }}>
          <option value="">Todas as marcas</option>
          {options.brands.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name} ({b.count})</option>
          ))}
        </NativeSelect>
      </FilterGroup>

      <FilterGroup label="Modelo" htmlFor="f-modelo">
        <NativeSelect id="f-modelo" value={state.modelo ?? ""} onChange={(e) => set("modelo", e.target.value)} disabled={!state.marca}>
          <option value="">{state.marca ? "Todos os modelos" : "Selecione a marca"}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </NativeSelect>
      </FilterGroup>

      {options.categories.length > 0 && (
        <FilterGroup label="Categoria">
          <div className="flex flex-wrap gap-2">
            {options.categories.map((c) => {
              const active = state.categoria === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => set("categoria", active ? "" : c.slug)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    active ? "border-graphite bg-graphite text-white" : "bg-card hover:border-foreground/30",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup label="Ano do modelo">
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect aria-label="Ano mínimo" value={state.anoMin ?? ""} onChange={(e) => set("anoMin", e.target.value)}>
            <option value="">De</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Ano máximo" value={state.anoMax ?? ""} onChange={(e) => set("anoMax", e.target.value)}>
            <option value="">Até</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </NativeSelect>
        </div>
      </FilterGroup>

      <FilterGroup label="Faixa de preço (R$)">
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="numeric" aria-label="Preço mínimo" placeholder="Mínimo" value={state.precoMin ?? ""} onChange={(e) => set("precoMin", e.target.value.replace(/\D/g, ""))} />
          <Input inputMode="numeric" aria-label="Preço máximo" placeholder="Máximo" value={state.precoMax ?? ""} onChange={(e) => set("precoMax", e.target.value.replace(/\D/g, ""))} />
        </div>
      </FilterGroup>

      <FilterGroup label="Quilometragem máxima" htmlFor="f-km">
        <NativeSelect id="f-km" value={state.kmMax ?? ""} onChange={(e) => set("kmMax", e.target.value)}>
          <option value="">Qualquer</option>
          {KM_OPTIONS.map((k) => <option key={k} value={k}>Até {k.toLocaleString("pt-BR")} km</option>)}
        </NativeSelect>
      </FilterGroup>

      <FilterGroup label="Combustível" htmlFor="f-comb">
        <NativeSelect id="f-comb" value={state.combustivel ?? ""} onChange={(e) => set("combustivel", e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(fuelLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
      </FilterGroup>

      <FilterGroup label="Câmbio" htmlFor="f-cambio">
        <NativeSelect id="f-cambio" value={state.cambio ?? ""} onChange={(e) => set("cambio", e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(transmissionLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
      </FilterGroup>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-medium">
        Somente ofertas
        <input
          type="checkbox"
          className="size-4 accent-[var(--brand)]"
          checked={state.ofertas === "1"}
          onChange={(e) => set("ofertas", e.target.checked ? "1" : "")}
        />
      </label>
    </div>
  );
}

function FilterGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Filtros: barra lateral no desktop (aplica automaticamente) e gaveta no mobile (aplica ao confirmar) */
export function CatalogFilters({ options, total }: { options: FilterOptions; total: number }) {
  const { apply, pending, searchParams } = useCatalogNavigation();
  const urlState = useMemo(() => readState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [desktop, setDesktop] = useState<State>(urlState);
  const [mobile, setMobile] = useState<State>(urlState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDesktop(urlState);
    setMobile(urlState);
  }, [urlState]);

  // Desktop: aplica com pequeno atraso (campos de texto) para não navegar a cada tecla
  useEffect(() => {
    if (JSON.stringify(desktop) === JSON.stringify(urlState)) return;
    const t = setTimeout(() => apply(desktop), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeCount = Object.keys(urlState).length;

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filtros">
        <div className="sticky top-24 rounded-2xl border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <SlidersHorizontal className="size-4" /> Filtros
            </h2>
            {activeCount > 0 && (
              <button onClick={() => apply({})} className="text-xs font-semibold text-brand hover:underline">
                Limpar tudo
              </button>
            )}
          </div>
          <div className={cn("transition-opacity", pending && "opacity-60")}>
            <FilterFields options={options} state={desktop} set={(k, v) => setDesktop((s) => ({ ...s, [k]: v || undefined }))} />
          </div>
        </div>
      </aside>

      <Button variant="outline" className="rounded-full lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal /> Filtros
        {activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{activeCount}</span>}
      </Button>

      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-black/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          className={cn(
            "absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-background shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-bold">Filtros</h2>
            <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Fechar filtros">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FilterFields options={options} state={mobile} set={(k, v) => setMobile((s) => ({ ...s, [k]: v || undefined }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t p-4">
            <Button variant="outline" onClick={() => setMobile({})}>Limpar</Button>
            <Button
              variant="brand"
              loading={pending}
              onClick={() => {
                apply(mobile);
                setOpen(false);
              }}
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function SortSelect() {
  const { searchParams } = useCatalogNavigation();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <NativeSelect
      aria-label="Ordenar por"
      className="h-10 w-auto min-w-48 rounded-full"
      value={searchParams.get("ordem") ?? ""}
      onChange={(e) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (e.target.value) sp.set("ordem", e.target.value);
        else sp.delete("ordem");
        sp.delete("pagina");
        router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
      }}
    >
      <option value="">Relevância</option>
      <option value="recentes">Mais recentes</option>
      <option value="menor-preco">Menor preço</option>
      <option value="maior-preco">Maior preço</option>
      <option value="menor-km">Menor quilometragem</option>
    </NativeSelect>
  );
}
