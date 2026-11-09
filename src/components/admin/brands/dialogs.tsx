"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field, applyServerErrors } from "@/components/ui/form";
import { ImageUpload } from "@/components/admin/image-upload";
import { saveBrandAction, saveCategoryAction, saveModelAction } from "@/server/actions/brands";
import { brandSchema, categorySchema, modelSchema } from "@/validations/admin";

type Opt = { id: string; name: string };

function useSaved(onOpenChange: (o: boolean) => void) {
  const router = useRouter();
  return (message?: string) => {
    toast.success(message ?? "Salvo.");
    onOpenChange(false);
    router.refresh();
  };
}

export function BrandDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  brand?: { id: string; name: string; logoUrl: string | null } | null;
}) {
  const saved = useSaved(onOpenChange);
  const form = useForm<z.input<typeof brandSchema>, unknown, z.output<typeof brandSchema>>({ resolver: zodResolver(brandSchema) });
  const {
    register,
    control,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  useEffect(() => {
    if (open) reset({ name: brand?.name ?? "", logoUrl: brand?.logoUrl ?? null });
  }, [open, brand, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveBrandAction(brand?.id ?? null, values);
    if (res.ok) saved(res.message);
    else {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{brand ? "Editar marca" : "Nova marca"}</DialogTitle>
          <DialogDescription>A marca aparece automaticamente no cadastro de veículos e nos filtros da loja.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nome" htmlFor="brand-name" required error={errors.name?.message}>
            <Input id="brand-name" autoFocus placeholder="Ex.: Volkswagen" {...register("name")} />
          </Field>
          <Field label="Logotipo">
            <Controller
              control={control}
              name="logoUrl"
              render={({ field }) => (
                <ImageUpload folder="brands" value={field.value ?? null} onChange={field.onChange} label="Enviar logotipo" aspect="aspect-[3/1]" fit="contain" />
              )}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModelDialog({
  open,
  onOpenChange,
  model,
  brandId,
  brands,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  model?: { id: string; name: string; categoryId: string | null } | null;
  brandId: string;
  brands: Opt[];
  categories: Opt[];
}) {
  const saved = useSaved(onOpenChange);
  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof modelSchema>, unknown, z.output<typeof modelSchema>>({ resolver: zodResolver(modelSchema) });
  useEffect(() => {
    if (open) reset({ brandId, name: model?.name ?? "", categoryId: model?.categoryId ?? "" });
  }, [open, model, brandId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveModelAction(model?.id ?? null, values);
    if (res.ok) saved(res.message);
    else {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{model ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          <DialogDescription>A categoria do modelo é sugerida automaticamente ao cadastrar veículos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Marca" htmlFor="model-brand" required error={errors.brandId?.message}>
            <NativeSelect id="model-brand" {...register("brandId")}>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Nome do modelo" htmlFor="model-name" required error={errors.name?.message}>
            <Input id="model-name" autoFocus placeholder="Ex.: T-Cross" {...register("name")} />
          </Field>
          <Field label="Categoria" htmlFor="model-category" error={errors.categoryId?.message}>
            <NativeSelect id="model-category" {...register("categoryId")}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category?: Opt | null;
}) {
  const saved = useSaved(onOpenChange);
  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof categorySchema>, unknown, z.output<typeof categorySchema>>({ resolver: zodResolver(categorySchema) });
  useEffect(() => {
    if (open) reset({ name: category?.name ?? "" });
  }, [open, category, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveCategoryAction(category?.id ?? null, values);
    if (res.ok) saved(res.message);
    else {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Categorias organizam o catálogo (SUV, Sedã, Picape…).</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nome" htmlFor="category-name" required error={errors.name?.message}>
            <Input id="category-name" autoFocus placeholder="Ex.: SUV" {...register("name")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
