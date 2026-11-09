"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label, Switch } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, applyServerErrors } from "@/components/ui/form";
import { EmptyState } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";
import { deleteTestimonialAction, saveTestimonialAction, toggleTestimonialAction } from "@/server/actions/content";
import { testimonialSchema } from "@/validations/admin";

export type TestimonialItem = {
  id: string;
  name: string;
  city: string | null;
  vehicle: string | null;
  text: string;
  rating: number;
  active: boolean;
  order: number;
};

type FormValues = z.input<typeof testimonialSchema>;

export function TestimonialsManager({ items }: { items: TestimonialItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Depoimentos ativos aparecem na página inicial da loja.</p>
        <Button
          variant="brand"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Novo depoimento
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote />} title="Nenhum depoimento" description="Adicione depoimentos reais de clientes para aumentar a confiança na loja." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className={cn("flex flex-col p-5", !t.active && "opacity-60")}>
              <div className="flex gap-0.5" aria-label={`${t.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("size-4", i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                ))}
              </div>
              <p className="mt-3 line-clamp-5 flex-1 text-sm leading-relaxed">“{t.text}”</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{[t.city, t.vehicle].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={t.active}
                    onCheckedChange={(c) =>
                      start(async () => {
                        const res = await toggleTestimonialAction(t.id, c);
                        if (res.ok) {
                          toast.success(res.message);
                          router.refresh();
                        } else toast.error(res.error);
                      })
                    }
                  />
                  Visível
                </label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar depoimento"
                    onClick={() => {
                      setEditing(t);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Excluir depoimento" className="text-destructive hover:text-destructive">
                        <Trash2 />
                      </Button>
                    }
                    title="Excluir depoimento?"
                    description={`O depoimento de ${t.name} será removido.`}
                    confirmLabel="Excluir"
                    onConfirm={async () => {
                      const res = await deleteTestimonialAction(t.id);
                      if (res.ok) {
                        toast.success(res.message);
                        router.refresh();
                      } else toast.error(res.error);
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <TestimonialDialog open={open} onOpenChange={setOpen} item={editing} nextOrder={items.length + 1} />
    </div>
  );
}

function TestimonialDialog({
  open,
  onOpenChange,
  item,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: TestimonialItem | null;
  nextOrder: number;
}) {
  const router = useRouter();
  const defaults = (): FormValues => ({
    name: item?.name ?? "",
    city: item?.city ?? "",
    vehicle: item?.vehicle ?? "",
    text: item?.text ?? "",
    rating: item?.rating ?? 5,
    active: item?.active ?? true,
    order: item?.order ?? nextOrder,
  });
  const { register, handleSubmit, control, reset, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: defaults(),
  });
  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveTestimonialAction(item?.id ?? null, values);
    if (!res.ok) {
      applyServerErrors(setError, res.fieldErrors);
      return toast.error(res.error);
    }
    toast.success(res.message);
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Editar depoimento" : "Novo depoimento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Nome do cliente" htmlFor="t-name" error={formState.errors.name?.message} required className="sm:col-span-2">
            <Input id="t-name" {...register("name")} />
          </Field>
          <Field label="Cidade" htmlFor="t-city" error={formState.errors.city?.message}>
            <Input id="t-city" {...register("city")} placeholder="Itajaí — SC" />
          </Field>
          <Field label="Veículo adquirido" htmlFor="t-vehicle" error={formState.errors.vehicle?.message}>
            <Input id="t-vehicle" {...register("vehicle")} placeholder="Jeep Compass" />
          </Field>
          <Field label="Depoimento" htmlFor="t-text" error={formState.errors.text?.message} required className="sm:col-span-2">
            <Textarea id="t-text" rows={4} {...register("text")} />
          </Field>
          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <Field label="Avaliação">
                <div className="flex h-10 items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => field.onChange(n)} aria-label={`${n} estrela(s)`}>
                      <Star className={cn("size-6 transition", n <= Number(field.value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                    </button>
                  ))}
                </div>
              </Field>
            )}
          />
          <Field label="Ordem" htmlFor="t-order">
            <Input id="t-order" type="number" min={0} {...register("order")} />
          </Field>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Label className="justify-between rounded-lg border p-3 font-normal sm:col-span-2">
                Exibir no site
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </Label>
            )}
          />
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
