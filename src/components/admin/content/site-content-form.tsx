"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FormSection, applyServerErrors } from "@/components/ui/form";
import { ImageUpload } from "@/components/admin/image-upload";
import { saveSiteContentAction } from "@/server/actions/content";
import { siteContentSchema } from "@/validations/admin";

type FormValues = z.input<typeof siteContentSchema>;

export const DIFFERENTIAL_ICONS = [
  ["ShieldCheck", "Escudo (garantia)"],
  ["Wrench", "Chave (revisão)"],
  ["Landmark", "Banco (financiamento)"],
  ["Repeat", "Setas (troca)"],
  ["BadgeCheck", "Selo (qualidade)"],
  ["Handshake", "Aperto de mão"],
  ["Clock", "Relógio (agilidade)"],
  ["FileCheck", "Documento"],
  ["Award", "Prêmio"],
  ["Car", "Carro"],
  ["Sparkles", "Brilho"],
  ["HeartHandshake", "Atendimento"],
] as const;

export function SiteContentForm({ initial }: { initial: FormValues }) {
  const router = useRouter();
  const { register, handleSubmit, control, setError, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(siteContentSchema),
    defaultValues: initial,
  });
  const differentials = useFieldArray({ control, name: "differentials" });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveSiteContentAction(values);
    if (!res.ok) {
      applyServerErrors(setError, res.fieldErrors);
      return toast.error(res.error);
    }
    toast.success(res.message);
    reset(values);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FormSection title="Banner principal (hero)" description="Primeira dobra da página inicial, exibida quando não há banners promocionais ativos e como base visual da busca.">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <Field label="Título" htmlFor="heroTitle" error={e.heroTitle?.message}>
              <Input id="heroTitle" {...register("heroTitle")} />
            </Field>
            <Field label="Subtítulo" htmlFor="heroSubtitle" error={e.heroSubtitle?.message}>
              <Textarea id="heroSubtitle" rows={3} {...register("heroSubtitle")} />
            </Field>
          </div>
          <Controller
            control={control}
            name="heroImageUrl"
            render={({ field }) => (
              <Field label="Imagem de destaque">
                <ImageUpload value={field.value} onChange={field.onChange} folder="site" />
              </Field>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="Chamadas das seções" description="Títulos das vitrines exibidas na página inicial.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Veículos em destaque" htmlFor="featuredTitle" error={e.featuredTitle?.message}>
            <Input id="featuredTitle" {...register("featuredTitle")} placeholder="Destaques do estoque" />
          </Field>
          <Field label="Últimas novidades" htmlFor="latestTitle" error={e.latestTitle?.message}>
            <Input id="latestTitle" {...register("latestTitle")} placeholder="Acabaram de chegar" />
          </Field>
          <Field label="Título das ofertas" htmlFor="offersTitle" error={e.offersTitle?.message}>
            <Input id="offersTitle" {...register("offersTitle")} placeholder="Oportunidades especiais" />
          </Field>
          <Field label="Subtítulo das ofertas" htmlFor="offersSubtitle" error={e.offersSubtitle?.message}>
            <Input id="offersSubtitle" {...register("offersSubtitle")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Apresentação institucional" description="Texto “Sobre a loja” exibido na página inicial e na página institucional.">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <Field label="Título" htmlFor="aboutTitle" error={e.aboutTitle?.message}>
              <Input id="aboutTitle" {...register("aboutTitle")} />
            </Field>
            <Field label="Texto" htmlFor="aboutText" error={e.aboutText?.message} hint="Use linhas em branco para separar parágrafos.">
              <Textarea id="aboutText" rows={8} {...register("aboutText")} />
            </Field>
          </div>
          <Controller
            control={control}
            name="aboutImageUrl"
            render={({ field }) => (
              <Field label="Imagem institucional">
                <ImageUpload value={field.value} onChange={field.onChange} folder="site" aspect="aspect-[4/3]" />
              </Field>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="Diferenciais da concessionária" description="Até 8 itens exibidos na página inicial.">
        <div className="flex flex-col gap-3">
          {differentials.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[180px_1fr_auto] sm:items-start">
              <NativeSelect aria-label="Ícone" {...register(`differentials.${i}.icon`)}>
                {DIFFERENTIAL_ICONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
              <div className="grid gap-2">
                <Input aria-label="Título do diferencial" placeholder="Título" {...register(`differentials.${i}.title`)} aria-invalid={!!e.differentials?.[i]?.title} />
                <Textarea aria-label="Descrição do diferencial" rows={2} placeholder="Descrição" {...register(`differentials.${i}.description`)} />
              </div>
              <div className="flex gap-1 sm:flex-col">
                <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => differentials.move(i, i - 1)} aria-label="Subir">
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" disabled={i === differentials.fields.length - 1} onClick={() => differentials.move(i, i + 1)} aria-label="Descer">
                  <ArrowDown />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => differentials.remove(i)} aria-label="Remover">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          {differentials.fields.length < 8 && (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => differentials.append({ title: "", description: "", icon: "ShieldCheck" })}
            >
              <Plus /> Adicionar diferencial
            </Button>
          )}
        </div>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-card/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="button" variant="outline" disabled={!formState.isDirty} onClick={() => reset(initial)}>
          Descartar
        </Button>
        <Button type="submit" variant="brand" loading={formState.isSubmitting}>
          Salvar textos
        </Button>
      </div>
    </form>
  );
}
