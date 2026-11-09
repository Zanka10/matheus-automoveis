"use client";

import { useState } from "react";
import type { VehicleStatus } from "@prisma/client";
import { ArrowLeftRight, Globe, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/primitives";
import { setVehicleFeaturedAction, setVehicleOfferAction, setVehiclePublishedAction } from "@/server/actions/publications";
import { StatusChangeDialog } from "./status-change-dialog";
import { useVehicleCommand, type VehiclePerms } from "./vehicle-actions";

/** Controles rápidos de publicação e estoque na página de detalhes */
export function QuickControls({
  vehicle,
  perms,
}: {
  vehicle: { id: string; label: string; status: VehicleStatus; published: boolean; featured: boolean; isOffer: boolean; offerLabel: string | null; imageCount: number };
  perms: VehiclePerms;
}) {
  const { pending, run } = useVehicleCommand();
  const [statusOpen, setStatusOpen] = useState(false);
  const sold = vehicle.status === "SOLD";

  const rows = [
    {
      icon: <Globe />,
      label: "Publicado no site",
      hint: sold ? "Vendido — fora da loja" : vehicle.imageCount === 0 ? "Envie fotos para publicar" : vehicle.published ? "Visível no catálogo" : "Oculto da loja",
      checked: vehicle.published,
      disabled: sold || (!vehicle.published && vehicle.imageCount === 0),
      onChange: (v: boolean) => run(() => setVehiclePublishedAction(vehicle.id, v)),
    },
    {
      icon: <Star />,
      label: "Destaque",
      hint: "Página inicial",
      checked: vehicle.featured,
      disabled: sold,
      onChange: (v: boolean) => run(() => setVehicleFeaturedAction(vehicle.id, v)),
    },
    {
      icon: <Tag />,
      label: "Oferta especial",
      hint: vehicle.offerLabel ?? "Seção de oportunidades",
      checked: vehicle.isOffer,
      disabled: sold,
      onChange: (v: boolean) => run(() => setVehicleOfferAction(vehicle.id, v, vehicle.offerLabel)),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {perms.publish &&
        rows.map((r) => (
          <label key={r.label} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-muted text-foreground/70 [&_svg]:size-4">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{r.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{r.hint}</span>
            </span>
            <Switch checked={r.checked} disabled={r.disabled || pending} onCheckedChange={r.onChange} />
          </label>
        ))}
      {perms.stock && (
        <>
          <Button variant="outline" onClick={() => setStatusOpen(true)} disabled={pending}>
            <ArrowLeftRight /> Alterar status do estoque
          </Button>
          <StatusChangeDialog vehicleId={vehicle.id} vehicleLabel={vehicle.label} currentStatus={vehicle.status} open={statusOpen} onOpenChange={setStatusOpen} />
        </>
      )}
    </div>
  );
}
