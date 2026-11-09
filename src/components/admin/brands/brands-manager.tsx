"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, FolderTree, Layers, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { EmptyState } from "@/components/admin/page-header";
import type { ActionResult } from "@/server/action";
import { deleteBrandAction, deleteCategoryAction, deleteModelAction } from "@/server/actions/brands";
import { BrandDialog, CategoryDialog, ModelDialog } from "./dialogs";

export type BrandDTO = {
  id: string;
  name: string;
  logoUrl: string | null;
  vehicleCount: number;
  models: { id: string; name: string; categoryId: string | null; categoryName: string | null; vehicleCount: number }[];
};
export type CategoryDTO = { id: string; name: string; modelCount: number; vehicleCount: number };

type Pending = { title: string; description: string; run: () => Promise<ActionResult> } | null;

export function BrandsManager({ brands, categories }: { brands: BrandDTO[]; categories: CategoryDTO[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(brands[0]?.id ?? null);
  const [brandDialog, setBrandDialog] = useState<{ open: boolean; brand: BrandDTO | null }>({ open: false, brand: null });
  const [modelDialog, setModelDialog] = useState<{ open: boolean; model: BrandDTO["models"][number] | null }>({ open: false, model: null });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: CategoryDTO | null }>({ open: false, category: null });
  const [pending, setPending] = useState<Pending>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q) || b.models.some((m) => m.name.toLowerCase().includes(q))) : brands;
  }, [brands, query]);
  const selected = brands.find((b) => b.id === selectedId) ?? filtered[0] ?? null;
  const brandOpts = brands.map((b) => ({ id: b.id, name: b.name }));
  const catOpts = categories.map((c) => ({ id: c.id, name: c.name }));

  const confirm = (title: string, description: string, run: () => Promise<ActionResult>) => setPending({ title, description, run });

  return (
    <Tabs defaultValue="marcas">
      <TabsList>
        <TabsTrigger value="marcas">
          <Tags className="size-4" /> Marcas e modelos
        </TabsTrigger>
        <TabsTrigger value="categorias">
          <FolderTree className="size-4" /> Categorias
        </TabsTrigger>
      </TabsList>

      <TabsContent value="marcas">
        {brands.length === 0 ? (
          <EmptyState
            icon={<Tags />}
            title="Nenhuma marca cadastrada"
            description="Cadastre as marcas e seus modelos para usá-los no cadastro de veículos e nos filtros da loja."
            action={
              <Button variant="brand" onClick={() => setBrandDialog({ open: true, brand: null })}>
                <Plus /> Nova marca
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* Lista de marcas */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar marca ou modelo" className="pl-9" aria-label="Buscar marcas" />
                </div>
                <Button variant="brand" size="icon" onClick={() => setBrandDialog({ open: true, brand: null })} aria-label="Nova marca">
                  <Plus />
                </Button>
              </div>
              <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto lg:max-h-[calc(100dvh-280px)]">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                        selected?.id === b.id ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
                        {b.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.logoUrl} alt="" className="size-full object-contain p-1" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{b.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{b.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {b.models.length} modelo(s) · {b.vehicleCount} veículo(s)
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma marca encontrada.</li>}
              </ul>
            </div>

            {/* Detalhe da marca */}
            {selected && (
              <div className="rounded-xl border bg-card shadow-xs">
                <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center overflow-hidden rounded-lg border bg-white">
                      {selected.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.logoUrl} alt={`Logo ${selected.name}`} className="size-full object-contain p-1.5" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{selected.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{selected.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selected.models.length} modelo(s) · {selected.vehicleCount} veículo(s) vinculados
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBrandDialog({ open: true, brand: selected })}>
                      <Pencil /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        confirm(
                          `Excluir a marca ${selected.name}?`,
                          selected.vehicleCount || selected.models.length
                            ? "Esta marca possui vínculos e não poderá ser excluída enquanto houver modelos ou veículos associados."
                            : "Esta ação não pode ser desfeita.",
                          () => deleteBrandAction(selected.id),
                        )
                      }
                    >
                      <Trash2 /> Excluir
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Layers className="size-4 text-muted-foreground" /> Modelos
                  </h3>
                  <Button variant="brand" size="sm" onClick={() => setModelDialog({ open: true, model: null })}>
                    <Plus /> Novo modelo
                  </Button>
                </div>
                {selected.models.length === 0 ? (
                  <p className="px-5 pb-6 pt-2 text-sm text-muted-foreground">Nenhum modelo cadastrado para esta marca.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR className="hover:bg-transparent">
                        <TH>Modelo</TH>
                        <TH>Categoria</TH>
                        <TH>Veículos</TH>
                        <TH className="w-24" />
                      </TR>
                    </THead>
                    <TBody>
                      {selected.models.map((m) => (
                        <TR key={m.id}>
                          <TD className="font-medium">{m.name}</TD>
                          <TD>{m.categoryName ? <Badge variant="outline">{m.categoryName}</Badge> : <span className="text-muted-foreground">—</span>}</TD>
                          <TD>
                            <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                              <CarFront className="size-3.5 text-muted-foreground" /> {m.vehicleCount}
                            </span>
                          </TD>
                          <TD>
                            <div className="flex justify-end">
                              <Button variant="ghost" size="icon-sm" onClick={() => setModelDialog({ open: true, model: m })} aria-label={`Editar ${m.name}`}>
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Excluir ${m.name}`}
                                onClick={() =>
                                  confirm(
                                    `Excluir o modelo ${m.name}?`,
                                    m.vehicleCount ? `Há ${m.vehicleCount} veículo(s) vinculado(s); a exclusão será bloqueada.` : "Esta ação não pode ser desfeita.",
                                    () => deleteModelAction(m.id),
                                  )
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="categorias">
        <div className="rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b p-4">
            <p className="text-sm text-muted-foreground">Usadas nos filtros da loja e no cadastro de modelos e veículos.</p>
            <Button variant="brand" size="sm" onClick={() => setCategoryDialog({ open: true, category: null })}>
              <Plus /> Nova categoria
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Categoria</TH>
                  <TH>Modelos</TH>
                  <TH>Veículos</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {categories.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="tabular-nums">{c.modelCount}</TD>
                    <TD className="tabular-nums">{c.vehicleCount}</TD>
                    <TD>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => setCategoryDialog({ open: true, category: c })} aria-label={`Editar ${c.name}`}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Excluir ${c.name}`}
                          onClick={() =>
                            confirm(
                              `Excluir a categoria ${c.name}?`,
                              c.modelCount || c.vehicleCount ? "A categoria está em uso; a exclusão será bloqueada." : "Esta ação não pode ser desfeita.",
                              () => deleteCategoryAction(c.id),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </TabsContent>

      <BrandDialog open={brandDialog.open} brand={brandDialog.brand} onOpenChange={(o) => setBrandDialog((s) => ({ ...s, open: o }))} />
      {selected && (
        <ModelDialog
          open={modelDialog.open}
          model={modelDialog.model}
          brandId={selected.id}
          brands={brandOpts}
          categories={catOpts}
          onOpenChange={(o) => setModelDialog((s) => ({ ...s, open: o }))}
        />
      )}
      <CategoryDialog open={categoryDialog.open} category={categoryDialog.category} onOpenChange={(o) => setCategoryDialog((s) => ({ ...s, open: o }))} />
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!pending) return;
          const res = await pending.run();
          if (res.ok) {
            toast.success(res.message ?? "Excluído.");
            router.refresh();
          } else toast.error(res.error);
        }}
      />
    </Tabs>
  );
}
