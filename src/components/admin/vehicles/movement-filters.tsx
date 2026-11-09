"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { movementLabels } from "@/lib/labels";

export function MovementFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    next.delete("mpagina");
    start(() => router.replace(`${pathname}?${next.toString()}#movimentacoes`, { scroll: false }));
  };
  const has = ["tipo", "de", "ate"].some((k) => sp.get(k));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Tipo
        <NativeSelect value={sp.get("tipo") ?? ""} onChange={(e) => update({ tipo: e.target.value || null })} className="sm:w-52">
          <option value="">Todas as movimentações</option>
          {Object.entries(movementLabels).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        De
        <Input type="date" value={sp.get("de") ?? ""} onChange={(e) => update({ de: e.target.value || null })} className="sm:w-40" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Até
        <Input type="date" value={sp.get("ate") ?? ""} onChange={(e) => update({ ate: e.target.value || null })} className="sm:w-40" />
      </label>
      {has && (
        <Button variant="ghost" size="sm" onClick={() => update({ tipo: null, de: null, ate: null })}>
          <X /> Limpar
        </Button>
      )}
    </div>
  );
}
