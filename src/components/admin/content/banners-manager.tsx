"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { CalendarRange, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label, Switch } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, applyServerErrors } from "@/components/ui/form";
import { EmptyState } from "@/components/admin/page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { formatDate } from "@/lib/format";
import { deleteBannerAction, saveBannerAction, toggleBannerAction } from "@/server/actions/content";
import { bannerSchema } from "@/validations/admin";

export type BannerItem = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  vehicleId: string | null;
  vehicleTitle: string | null;
  active: boolean;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
};

type FormValues = z.input<typeof bannerSchema>;

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function BannersManager({ banners, vehicles }: { banners: BannerItem[]; vehicles: { id: string; title: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const now = Date.now();

  const status = (b: BannerItem) => {
    if (!b.active) return { label: "Inativo", variant: "muted" as const };
    if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: "Agendado", variant: "outline" as const };
    if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: "Expirado", variant: "muted" as const };
    return { label: "No ar", variant: "brand" as const };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Banners ativos aparecem no carrossel principal da página inicial, na ordem definida.</p>
        <Button
          variant="brand"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Novo banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState icon={<ImageIcon />} title="Nenhum banner cadastrado" description="Crie banners promocionais para campanhas e ofertas da loja." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => {
            const st = status(b);
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="relative aspect-[16/7] bg-muted">
                  <Image src={b.imageUrl} alt={b.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="line-clamp-1 font-semibold">{b.title}</p>
                    {b.subtitle && <p className="line-clamp-1 text-xs text-white/80">{b.subtitle}</p>}
                  </div>
                  <Badge variant={st.variant} className="absolute left-3 top-3">
                    {st.label}
                  </Badge>
                  <span className="absolute right-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white">#{b.order}</span>
                </div>
                <div className="flex flex-col gap-2 p-4 text-xs text-muted-foreground">
                  {b.ctaLabel && (
                    <p>
                      Botão: <span className="font-medium text-foreground">{b.ctaLabel}</span> → {b.ctaHref ?? "—"}
                    </p>
                  )}
                  {b.vehicleTitle && <p>Veículo: {b.vehicleTitle}</p>}
                  {(b.startsAt || b.endsAt) && (
                    <p className="inline-flex items-center gap-1">
                      <CalendarRange className="size-3.5" /> {b.startsAt ? formatDate(b.startsAt) : "…"} até {b.endsAt ? formatDate(b.endsAt) : "…"}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Switch
                        checked={b.active}
                        onCheckedChange={(c) =>
                          start(async () => {
                            const res = await toggleBannerAction(b.id, c);
                            if (res.ok) {
                              toast.success(res.message);
                              router.refresh();
                            } else toast.error(res.error);
                          })
                        }
                      />
                      Ativo
                    </label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar banner"
                        onClick={() => {
                          setEditing(b);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Excluir banner" className="text-destructive hover:text-destructive">
                            <Trash2 />
                          </Button>
                        }
                        title="Excluir banner?"
                        description={`O banner "${b.title}" será removido do site.`}
                        confirmLabel="Excluir"
                        onConfirm={async () => {
                          const res = await deleteBannerAction(b.id);
                          if (res.ok) {
                            toast.success(res.message);
                            router.refresh();
                          } else toast.error(res.error);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BannerDialog open={open} onOpenChange={setOpen} banner={editing} vehicles={vehicles} nextOrder={banners.length + 1} />
    </div>
  );
}

function BannerDialog({
  open,
  onOpenChange,
  banner,
  vehicles,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  banner: BannerItem | null;
  vehicles: { id: string; title: string }[];
  nextOrder: number;
}) {
  const router = useRouter();
  const defaults = (): FormValues => ({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    imageUrl: banner?.imageUrl ?? "",
    ctaLabel: banner?.ctaLabel ?? "",
    ctaHref: banner?.ctaHref ?? "",
    vehicleId: banner?.vehicleId ?? "",
    active: banner?.active ?? true,
    order: banner?.order ?? nextOrder,
    startsAt: toDateInput(banner?.startsAt ?? null) as unknown as Date,
    endsAt: toDateInput(banner?.endsAt ?? null) as unknown as Date,
  });
  const { register, handleSubmit, control, reset, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: defaults(),
  });
  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, banner]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveBannerAction(banner?.id ?? null, values);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{banner ? "Editar banner" : "Novo banner promocional"}</DialogTitle>
          <DialogDescription>Use imagens horizontais em alta resolução (recomendado 2400 × 1000 px).</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => (
              <Field label="Imagem" error={formState.errors.imageUrl?.message} required className="sm:col-span-2">
                <ImageUpload value={field.value} onChange={(url) => field.onChange(url ?? "")} folder="banners" aspect="aspect-[16/7]" />
              </Field>
            )}
          />
          <Field label="Título" htmlFor="b-title" error={formState.errors.title?.message} required className="sm:col-span-2">
            <Input id="b-title" {...register("title")} placeholder="Ex.: Semana do SUV" />
          </Field>
          <Field label="Subtítulo" htmlFor="b-sub" error={formState.errors.subtitle?.message} className="sm:col-span-2">
            <Input id="b-sub" {...register("subtitle")} placeholder="Ex.: Taxas a partir de 0,99% a.m." />
          </Field>
          <Field label="Texto do botão" htmlFor="b-cta" error={formState.errors.ctaLabel?.message}>
            <Input id="b-cta" {...register("ctaLabel")} placeholder="Ver ofertas" />
          </Field>
          <Field label="Link do botão" htmlFor="b-href" error={formState.errors.ctaHref?.message} hint="Ex.: /veiculos?ofertas=1">
            <Input id="b-href" {...register("ctaHref")} placeholder="/veiculos" />
          </Field>
          <Field label="Veículo vinculado (opcional)" htmlFor="b-vehicle" hint="Se não houver link, o botão leva ao veículo.">
            <NativeSelect id="b-vehicle" {...register("vehicleId")}>
              <option value="">Nenhum</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Ordem" htmlFor="b-order" error={formState.errors.order?.message}>
            <Input id="b-order" type="number" min={0} {...register("order")} />
          </Field>
          <Field label="Início da exibição" htmlFor="b-start" hint="Opcional">
            <Input id="b-start" type="date" {...register("startsAt")} />
          </Field>
          <Field label="Fim da exibição" htmlFor="b-end" error={formState.errors.endsAt?.message} hint="Opcional">
            <Input id="b-end" type="date" {...register("endsAt")} />
          </Field>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Label className="justify-between rounded-lg border p-3 font-normal sm:col-span-2">
                Banner ativo
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </Label>
            )}
          />
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={formState.isSubmitting}>
              Salvar banner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
