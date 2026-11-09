"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@prisma/client";
import {
  ArrowLeftRight,
  Copy,
  Eye,
  EyeOff,
  Globe,
  MoreHorizontal,
  Pencil,
  ScanEye,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionResult } from "@/server/action";
import { deleteVehicleAction, duplicateVehicleAction } from "@/server/actions/vehicles";
import { setVehicleFeaturedAction, setVehiclePublishedAction } from "@/server/actions/publications";
import { StatusChangeDialog } from "./status-change-dialog";

export type VehiclePerms = {
  edit: boolean;
  create: boolean;
  delete: boolean;
  publish: boolean;
  stock: boolean;
};

export type VehicleActionTarget = {
  id: string;
  slug: string;
  label: string;
  status: VehicleStatus;
  published: boolean;
  featured: boolean;
};

export function useVehicleCommand() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: (res: ActionResult<unknown>) => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message ?? "Feito.");
        after?.(res);
        router.refresh();
      } else toast.error(res.error);
    });
  return { pending, run, router };
}

/** Menu de ações por veículo (lista, estoque e detalhes) */
export function VehicleActionsMenu({
  vehicle,
  perms,
  showView = true,
  trigger,
}: {
  vehicle: VehicleActionTarget;
  perms: VehiclePerms;
  showView?: boolean;
  trigger?: React.ReactNode;
}) {
  const { pending, run, router } = useVehicleCommand();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${vehicle.label}`} disabled={pending}>
              <MoreHorizontal />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {showView && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/veiculos/${vehicle.id}`}>
                <Eye /> Ver detalhes
              </Link>
            </DropdownMenuItem>
          )}
          {perms.edit && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/veiculos/${vehicle.id}/editar`}>
                <Pencil /> Editar
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/admin/veiculos/${vehicle.id}/previa`}>
              <ScanEye /> Pré-visualizar
            </Link>
          </DropdownMenuItem>
          {vehicle.published && (
            <DropdownMenuItem asChild>
              <a href={`/veiculos/${vehicle.slug}`} target="_blank" rel="noreferrer">
                <Globe /> Ver na loja
              </a>
            </DropdownMenuItem>
          )}
          {perms.create && (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => duplicateVehicleAction(vehicle.id),
                  (res) => {
                    const id = (res.ok && (res.data as { id?: string } | undefined)?.id) || null;
                    if (id) router.push(`/admin/veiculos/${id}/editar`);
                  },
                )
              }
            >
              <Copy /> Duplicar cadastro
            </DropdownMenuItem>
          )}
          {(perms.publish || perms.stock) && <DropdownMenuSeparator />}
          {perms.publish && vehicle.status !== "SOLD" && (
            <DropdownMenuItem onSelect={() => run(() => setVehiclePublishedAction(vehicle.id, !vehicle.published))}>
              {vehicle.published ? <EyeOff /> : <Globe />}
              {vehicle.published ? "Retirar do site" : "Publicar no site"}
            </DropdownMenuItem>
          )}
          {perms.publish && vehicle.status !== "SOLD" && (
            <DropdownMenuItem onSelect={() => run(() => setVehicleFeaturedAction(vehicle.id, !vehicle.featured))}>
              {vehicle.featured ? <StarOff /> : <Star />}
              {vehicle.featured ? "Remover destaque" : "Marcar como destaque"}
            </DropdownMenuItem>
          )}
          {perms.stock && (
            <DropdownMenuItem onSelect={() => setStatusOpen(true)}>
              <ArrowLeftRight /> Alterar status
            </DropdownMenuItem>
          )}
          {perms.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {perms.stock && (
        <StatusChangeDialog
          vehicleId={vehicle.id}
          vehicleLabel={vehicle.label}
          currentStatus={vehicle.status}
          open={statusOpen}
          onOpenChange={setStatusOpen}
        />
      )}
      {perms.delete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Excluir veículo?"
          description={
            <>
              <strong>{vehicle.label}</strong> e suas fotos serão removidos permanentemente. Veículos vendidos ou com orçamentos
              não podem ser excluídos — nesses casos, retire-o do site.
            </>
          }
          confirmLabel="Excluir"
          onConfirm={async () => {
            const res = await deleteVehicleAction(vehicle.id);
            if (res.ok) {
              toast.success(res.message ?? "Excluído.");
              router.push("/admin/veiculos");
              router.refresh();
            } else toast.error(res.error);
          }}
        />
      )}
    </>
  );
}
