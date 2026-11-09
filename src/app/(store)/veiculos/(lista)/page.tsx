import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogFilters, SortSelect } from "@/components/store/catalog-filters";
import { PageIntro } from "@/components/store/page-intro";
import { VehicleGrid } from "@/components/store/vehicle-card";
import { formatKm, formatPrice } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { getFilterOptions, searchVehicles, type FilterOptions } from "@/server/services/catalog";
import { catalogFiltersSchema, type CatalogFilters as Filters } from "@/validations/vehicle";

type SP = Promise<Record<string, string | string[] | undefined>>;

function normalize(raw: Record<string, string | string[] | undefined>) {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) flat[k] = val;
  }
  return flat;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = catalogFiltersSchema.parse(normalize(await searchParams));
  const options = await getFilterOptions();
  const brand = options.brands.find((b) => b.slug === f.marca);
  const model = brand?.models.find((m) => m.slug === f.modelo);
  const title = model ? `${brand!.name} ${model.name} à venda` : brand ? `${brand.name} seminovos e 0 km` : f.ofertas ? "Ofertas" : "Veículos à venda";
  return {
    title,
    description: "Confira o estoque completo: veículos novos e seminovos revisados, com procedência garantida e financiamento facilitado.",
    alternates: { canonical: "/veiculos" },
  };
}

function chipLabels(f: Filters, o: FilterOptions): { key: string; label: string }[] {
  const brand = o.brands.find((b) => b.slug === f.marca);
  const chips: { key: string; label: string }[] = [];
  if (f.q) chips.push({ key: "q", label: `“${f.q}”` });
  if (f.condicao) chips.push({ key: "condicao", label: f.condicao === "novo" ? "0 km" : "Seminovos" });
  if (brand) chips.push({ key: "marca", label: brand.name });
  if (f.modelo) chips.push({ key: "modelo", label: brand?.models.find((m) => m.slug === f.modelo)?.name ?? f.modelo });
  if (f.categoria) chips.push({ key: "categoria", label: o.categories.find((c) => c.slug === f.categoria)?.name ?? f.categoria });
  if (f.anoMin) chips.push({ key: "anoMin", label: `A partir de ${f.anoMin}` });
  if (f.anoMax) chips.push({ key: "anoMax", label: `Até ${f.anoMax}` });
  if (f.precoMin !== undefined) chips.push({ key: "precoMin", label: `Mín. ${formatPrice(f.precoMin)}` });
  if (f.precoMax !== undefined) chips.push({ key: "precoMax", label: `Máx. ${formatPrice(f.precoMax)}` });
  if (f.kmMax !== undefined) chips.push({ key: "kmMax", label: `Até ${formatKm(f.kmMax)}` });
  if (f.combustivel) chips.push({ key: "combustivel", label: fuelLabels[f.combustivel] });
  if (f.cambio) chips.push({ key: "cambio", label: transmissionLabels[f.cambio] });
  if (f.ofertas) chips.push({ key: "ofertas", label: "Ofertas" });
  return chips;
}

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const raw = normalize(await searchParams);
  const filters = catalogFiltersSchema.parse(raw);
  const [options, result] = await Promise.all([getFilterOptions(), searchVehicles(filters)]);
  const chips = chipLabels(filters, options);

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(raw);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) sp.delete(k);
      else sp.set(k, v);
    }
    if (patch.marca === undefined && "marca" in patch) sp.delete("modelo");
    return `/veiculos${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageIntro
        eyebrow="Estoque"
        title={filters.ofertas ? "Ofertas e oportunidades" : "Encontre o seu próximo carro"}
        description="Todos os veículos são vistoriados, com procedência verificada e prontos para transferência."
        crumbs={[{ label: "Veículos" }]}
      />

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[290px_1fr] lg:py-14">
        <CatalogFilters options={options} total={result.total} />

        <section aria-labelledby="resultados" className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p id="resultados" className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-display text-xl font-bold text-foreground">{result.total}</span>{" "}
              {result.total === 1 ? "veículo encontrado" : "veículos encontrados"}
            </p>
            <SortSelect />
          </div>

          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link
                  key={c.key}
                  href={hrefWith({ [c.key]: undefined, pagina: undefined })}
                  scroll={false}
                  className="group inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-2 text-sm transition hover:border-brand/40"
                  aria-label={`Remover filtro ${c.label}`}
                >
                  {c.label}
                  <X className="size-3.5 text-muted-foreground group-hover:text-brand" />
                </Link>
              ))}
              <Link href="/veiculos" scroll={false} className="ml-1 text-sm font-semibold text-brand hover:underline">
                Limpar filtros
              </Link>
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-20 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-muted">
                <SearchX className="size-7 text-muted-foreground" />
              </div>
              <h2 className="mt-5 text-xl font-bold">Nenhum veículo encontrado</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Tente ajustar ou remover alguns filtros. Se preferir, conte para nós o que procura e buscamos para você.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline">
                  <Link href="/veiculos">Ver todo o estoque</Link>
                </Button>
                <Button asChild variant="brand">
                  <Link href="/orcamento">Solicitar um veículo</Link>
                </Button>
              </div>
            </div>
          ) : (
            <VehicleGrid vehicles={result.items} className="xl:grid-cols-3" />
          )}

          {result.pages > 1 && (
            <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-1.5">
              <PageLink href={hrefWith({ pagina: String(result.page - 1) })} disabled={result.page <= 1} label="Página anterior">
                <ChevronLeft className="size-4" />
              </PageLink>
              {Array.from({ length: result.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === result.pages || Math.abs(p - result.page) <= 1)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {i > 0 && p - arr[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                    <PageLink href={hrefWith({ pagina: p === 1 ? undefined : String(p) })} active={p === result.page} label={`Página ${p}`}>
                      {p}
                    </PageLink>
                  </span>
                ))}
              <PageLink href={hrefWith({ pagina: String(result.page + 1) })} disabled={result.page >= result.pages} label="Próxima página">
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

function PageLink({ href, active, disabled, label, children }: { href: string; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) {
  const cls = cn(
    "grid size-10 place-items-center rounded-full text-sm font-semibold transition",
    active ? "bg-graphite text-white" : "border bg-card hover:border-foreground/30",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) return <span className={cls} aria-disabled="true" aria-label={label}>{children}</span>;
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
