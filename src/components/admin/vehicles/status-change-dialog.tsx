"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { vehicleStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { changeVehicleStatusAction, getStatusDialogDataAction } from "@/server/actions/vehicles";

const STATUSES: VehicleStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];

export function StatusChangeDialog({
  vehicleId,
  vehicleLabel,
  currentStatus,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  vehicleLabel: string;
  currentStatus: VehicleStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<VehicleStatus>(currentStatus === "AVAILABLE" ? "RESERVED" : "AVAILABLE");
  const [note, setNote] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [soldById, setSoldById] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [extra, setExtra] = useState<{ staff: { id: string; name: string }[]; quotes: { id: string; protocol: string; name: string }[] } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setStatus(currentStatus === "AVAILABLE" ? "RESERVED" : "AVAILABLE");
    setNote("");
    setQuoteId("");
    getStatusDialogDataAction(vehicleId).then((res) => {
      if (res.ok && res.data) {
        setExtra({ staff: res.data.staff, quotes: res.data.quotes });
        setSoldPrice(String(res.data.price));
      }
    });
  }, [open, vehicleId, currentStatus]);

  function submit() {
    start(async () => {
      const res = await changeVehicleStatusAction({
        vehicleId,
        status,
        note: note || null,
        soldPrice: status === "SOLD" ? soldPrice : null,
        soldById: status === "SOLD" ? soldById || null : null,
        quoteId: status === "SOLD" ? quoteId || null : null,
      });
      if (res.ok) {
        toast.success(res.message ?? "Status alterado.");
        onOpenChange(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status do estoque</DialogTitle>
          <DialogDescription>{vehicleLabel}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Novo status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              disabled={s === currentStatus}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                status === s ? "border-brand bg-brand-soft text-brand" : "hover:bg-muted",
              )}
            >
              {vehicleStatusLabels[s]}
              {s === currentStatus && <span className="block text-[10px] font-normal">atual</span>}
            </button>
          ))}
        </div>

        {status === "SOLD" && (
          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
            <Field label="Valor de venda (R$)" htmlFor="soldPrice">
              <Input id="soldPrice" inputMode="decimal" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} />
            </Field>
            <Field label="Vendedor responsável" htmlFor="soldById">
              <NativeSelect id="soldById" value={soldById} onChange={(e) => setSoldById(e.target.value)}>
                <option value="">Eu mesmo</option>
                {extra?.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Orçamento convertido (opcional)" htmlFor="quoteId" className="sm:col-span-2" hint="O orçamento será finalizado e contabilizado como venda.">
              <NativeSelect id="quoteId" value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
                <option value="">Nenhum</option>
                {extra?.quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.protocol} — {q.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Ao marcar como vendido, o veículo é retirado automaticamente da loja. O cadastro e o histórico são mantidos.
            </p>
          </div>
        )}

        <Field label="Observação" htmlFor="statusNote">
          <Textarea id="statusNote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: sinal recebido, cliente aguardando financiamento…" />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={submit} loading={pending}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
