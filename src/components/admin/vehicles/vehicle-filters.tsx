"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function VehicleFilters({ brands }: { brands: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("pagina");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Busca com debounce
  useEffect(() => {
    const current = sp.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "status", "publicacao", "marca", "condicao"].some((k) => sp.get(k));

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por marca, modelo, versão, código ou placa"
          className="pl-9"
          aria-label="Buscar veículos"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
        <NativeSelect aria-label="Status" value={sp.get("status") ?? ""} onChange={(e) => update({ status: e.target.value || null })} className="lg:w-36">
          <option value="">Todos os status</option>
          <option value="AVAILABLE">Disponível</option>
          <option value="RESERVED">Reservado</option>
          <option value="SOLD">Vendido</option>
        </NativeSelect>
        <NativeSelect aria-label="Publicação" value={sp.get("publicacao") ?? ""} onChange={(e) => update({ publicacao: e.target.value || null })} className="lg:w-40">
          <option value="">Publicação</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Não publicados</option>
          <option value="destaque">Em destaque</option>
          <option value="oferta">Em oferta</option>
        </NativeSelect>
        <NativeSelect aria-label="Marca" value={sp.get("marca") ?? ""} onChange={(e) => update({ marca: e.target.value || null })} className="lg:w-40">
          <option value="">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Condição" value={sp.get("condicao") ?? ""} onChange={(e) => update({ condicao: e.target.value || null })} className="lg:w-36">
          <option value="">Novo e seminovo</option>
          <option value="NEW">Novos</option>
          <option value="USED">Seminovos</option>
        </NativeSelect>
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            start(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X /> Limpar
        </Button>
      )}
    </div>
  );
}
