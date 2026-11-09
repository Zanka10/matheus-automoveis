"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";

export function QuoteFilters({
  users,
  canFilterUsers,
}: {
  users: { id: string; name: string }[];
  canFilterUsers: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const next = new URLSearchParams();
    for (const key of ["status", "view"]) {
      const v = sp.get(key);
      if (v) next.set(key, v);
    }
    for (const key of ["q", "responsavel", "de", "ate"]) {
      const v = String(data.get(key) ?? "").trim();
      if (v) next.set(key, v);
    }
    start(() => router.push(`${pathname}?${next.toString()}`));
  }

  const hasFilters = ["q", "responsavel", "de", "ate"].some((k) => sp.get(k));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="grid gap-3 rounded-xl border bg-card p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-[1fr_200px_150px_150px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder="Nome, telefone, e-mail ou protocolo" className="pl-9" aria-label="Buscar" />
      </div>
      <NativeSelect name="responsavel" defaultValue={sp.get("responsavel") ?? ""} aria-label="Responsável">
        <option value="">Todos os responsáveis</option>
        <option value="me">Meus atendimentos</option>
        <option value="none">Sem responsável</option>
        {canFilterUsers &&
          users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
      </NativeSelect>
      <Input type="date" name="de" defaultValue={sp.get("de") ?? ""} aria-label="Data inicial" />
      <Input type="date" name="ate" defaultValue={sp.get("ate") ?? ""} aria-label="Data final" />
      <div className="flex gap-2">
        <Button type="submit" loading={pending} className="flex-1 lg:flex-none">
          Filtrar
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpar filtros"
            onClick={() => {
              const next = new URLSearchParams();
              const view = sp.get("view");
              if (view) next.set("view", view);
              start(() => router.push(`${pathname}?${next.toString()}`));
            }}
          >
            <X />
          </Button>
        )}
      </div>
    </form>
  );
}
