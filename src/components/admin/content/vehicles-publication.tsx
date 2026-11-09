"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { VehicleStatus } from "@prisma/client";
import { ArrowDown, ArrowUp, GripVertical, Search, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/primitives";
import { StatusPill, EmptyState } from "@/components/admin/page-header";
import { formatPrice } from "@/lib/format";
import { vehicleStatusLabels, vehicleStatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  reorderVehiclesAction,
  setVehicleFeaturedAction,
  setVehicleOfferAction,
  setVehiclePublishedAction,
} from "@/server/actions/publications";

export type PublicationVehicle = {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  image: string | null;
  price: number;
  promoPrice: number | null;
  status: VehicleStatus;
  published: boolean;
  featured: boolean;
  isOffer: boolean;
  offerLabel: string | null;
  displayOrder: number;
};

type Result = { ok: boolean; message?: string; error?: string };

export function VehiclesPublication({ vehicles }: { vehicles: PublicationVehicle[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"lista" | "ordem">("lista");
  const [filter, setFilter] = useState<"todos" | "publicados" | "fora">("todos");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const run = (key: string, fn: () => Promise<Result>) => {
    setBusy(key);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (res.ok) {
        if (res.message) toast.success(res.message);
        router.refresh();
      } else toast.error(res.error ?? "Erro");
    });
  };

  const visible = vehicles.filter((v) => {
    if (filter === "publicados" && !v.published) return false;
    if (filter === "fora" && v.published) return false;
    if (q && !`${v.title} ${v.subtitle} ${v.code}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-lg border bg-card p-0.5 text-sm shadow-xs">
          {(
            [
              ["lista", "Publicação e destaques"],
              ["ordem", "Ordem de exibição"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("rounded-md px-3 py-1.5 transition", mode === m ? "bg-muted font-medium" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "lista" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar veículo" className="h-9 pl-9 sm:w-56" aria-label="Buscar veículo" />
            </div>
            <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
              {(
                [
                  ["todos", "Todos"],
                  ["publicados", "No site"],
                  ["fora", "Fora do site"],
                ] as const
              ).map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-2.5 py-1.5", filter === f ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {mode === "ordem" ? (
        <OrderEditor vehicles={vehicles.filter((v) => v.published)} />
      ) : visible.length === 0 ? (
        <EmptyState title="Nenhum veículo encontrado" description="Ajuste a busca ou cadastre veículos no módulo de Veículos." />
      ) : (
        <Card className="divide-y overflow-hidden">
          {visible.map((v) => (
            <div key={v.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Thumb src={v.image} alt={v.title} />
                <div className="min-w-0">
                  <Link href={`/admin/veiculos/${v.id}`} className="block truncate font-semibold hover:text-brand">
                    {v.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.subtitle} · {v.code}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{formatPrice(v.promoPrice ?? v.price)}</span>
                    <StatusPill tone={vehicleStatusTone[v.status]}>{vehicleStatusLabels[v.status]}</StatusPill>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_auto_minmax(0,260px)] sm:items-center lg:gap-6">
                <ToggleCell
                  label="No site"
                  checked={v.published}
                  disabled={busy === `p-${v.id}` || (v.status === "SOLD" && !v.published)}
                  onChange={(c) => run(`p-${v.id}`, () => setVehiclePublishedAction(v.id, c))}
                />
                <ToggleCell
                  label={
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5" /> Destaque
                    </span>
                  }
                  checked={v.featured}
                  disabled={busy === `f-${v.id}`}
                  onChange={(c) => run(`f-${v.id}`, () => setVehicleFeaturedAction(v.id, c))}
                />
                <OfferCell vehicle={v} busy={busy === `o-${v.id}`} onSave={(on, label) => run(`o-${v.id}`, () => setVehicleOfferAction(v.id, on, label))} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src && <Image src={src} alt={alt} fill sizes="80px" className="object-cover" />}
    </div>
  );
}

function ToggleCell({ label, checked, disabled, onChange }: { label: React.ReactNode; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <span className={cn(!checked && "text-muted-foreground")}>{label}</span>
    </label>
  );
}

function OfferCell({ vehicle, busy, onSave }: { vehicle: PublicationVehicle; busy: boolean; onSave: (on: boolean, label: string | null) => void }) {
  const [label, setLabel] = useState(vehicle.offerLabel ?? "");
  useEffect(() => setLabel(vehicle.offerLabel ?? ""), [vehicle.offerLabel]);
  const dirty = vehicle.isOffer && label !== (vehicle.offerLabel ?? "");
  return (
    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
      <Switch checked={vehicle.isOffer} disabled={busy} onCheckedChange={(c) => onSave(c, c ? label || null : null)} aria-label="Oferta especial" />
      <Tag className={cn("size-3.5 shrink-0", vehicle.isOffer ? "text-brand" : "text-muted-foreground")} />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value.slice(0, 40))}
        placeholder="Selo da oferta (ex.: Taxa zero)"
        disabled={!vehicle.isOffer || busy}
        className="h-8 text-xs"
        aria-label="Selo da oferta"
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) onSave(true, label || null);
        }}
      />
      {dirty && (
        <Button size="sm" variant="outline" onClick={() => onSave(true, label || null)} loading={busy}>
          Salvar
        </Button>
      )}
    </div>
  );
}

function OrderEditor({ vehicles }: { vehicles: PublicationVehicle[] }) {
  const router = useRouter();
  const initial = useMemo(
    () => [...vehicles].sort((a, b) => Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder),
    [vehicles],
  );
  const [items, setItems] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);
  const dirty = items.some((v, i) => v.id !== initial[i]?.id);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((list) => {
      const next = [...list];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  if (items.length === 0) {
    return <EmptyState title="Nenhum veículo publicado" description="Publique veículos para definir a ordem em que aparecem na loja." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Arraste os veículos (ou use as setas) para definir a ordem de exibição no catálogo e nas vitrines da página inicial.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!dirty || pending} onClick={() => setItems(initial)}>
            Desfazer
          </Button>
          <Button
            variant="brand"
            disabled={!dirty}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await reorderVehiclesAction(items.map((v) => v.id));
                if (res.ok) {
                  toast.success(res.message);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            Salvar ordem
          </Button>
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((v, i) => (
          <li
            key={v.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) {
                move(dragIndex, i);
                setDragIndex(i);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-2.5 pr-3 shadow-xs transition",
              dragIndex === i && "border-brand/50 opacity-70 ring-2 ring-brand/20",
            )}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
            <span className="w-6 text-center text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
            <Thumb src={v.image} alt={v.title} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{v.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {v.subtitle} · {formatPrice(v.promoPrice ?? v.price)}
              </p>
            </div>
            {v.featured && <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Destaque" />}
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Subir">
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Descer">
                <ArrowDown />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
