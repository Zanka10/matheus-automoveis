"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PRESETS = [
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["90", "90 dias"],
  ["ano", "Este ano"],
] as const;

const EXPORTS = [
  ["veiculos", "Veículos cadastrados"],
  ["vendas", "Veículos vendidos"],
  ["orcamentos", "Orçamentos recebidos"],
  ["funcionarios", "Desempenho por funcionário"],
] as const;

export function PeriodFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const custom = Boolean(sp.get("de") || sp.get("ate"));
  const preset = custom ? null : (sp.get("periodo") ?? "90");

  const go = (params: Record<string, string>) => start(() => router.push(`${pathname}?${new URLSearchParams(params).toString()}`));

  const exportQs = custom ? `de=${from}&ate=${to}` : `periodo=${preset}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm" role="group" aria-label="Período">
          {PRESETS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => go({ periodo: v })}
              aria-pressed={preset === v}
              className={cn("rounded-md px-3 py-1.5 transition", preset === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            go({ de: String(fd.get("de") ?? ""), ate: String(fd.get("ate") ?? "") });
          }}
        >
          <Input type="date" name="de" defaultValue={from} className="h-9 w-[150px]" aria-label="Data inicial" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" name="ate" defaultValue={to} className="h-9 w-[150px]" aria-label="Data final" />
          <Button type="submit" size="sm" variant={custom ? "default" : "outline"} loading={pending} className="h-9">
            Aplicar
          </Button>
        </form>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9">
            <Download /> Exportar CSV
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Exportar relatório do período</DropdownMenuLabel>
          {EXPORTS.map(([type, label]) => (
            <DropdownMenuItem key={type} asChild>
              <a href={`/api/relatorios/export?type=${type}&${exportQs}`} download>
                <Download /> {label}
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
