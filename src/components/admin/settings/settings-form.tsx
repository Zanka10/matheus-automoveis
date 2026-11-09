"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Facebook, Instagram, MessageCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormSection, applyServerErrors } from "@/components/ui/form";
import { whatsappLink } from "@/lib/whatsapp";
import { saveSettingsAction } from "@/server/actions/settings";
import { siteSettingsSchema } from "@/validations/admin";

type FormValues = z.input<typeof siteSettingsSchema>;

export function SettingsForm({ initial }: { initial: FormValues }) {
  const router = useRouter();
  const { register, handleSubmit, setError, reset, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: initial,
  });
  const e = formState.errors;
  const wa = whatsappLink(watch("whatsapp"), watch("whatsappMessage") ?? undefined);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveSettingsAction(values);
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
      <FormSection title="Identificação da loja" description="Exibida no cabeçalho, rodapé e metadados do site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da loja" htmlFor="storeName" error={e.storeName?.message} required>
            <Input id="storeName" {...register("storeName")} />
          </Field>
          <Field label="CNPJ" htmlFor="cnpj" error={e.cnpj?.message}>
            <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0001-00" />
          </Field>
          <Field label="Slogan" htmlFor="tagline" error={e.tagline?.message} className="sm:col-span-2">
            <Input id="tagline" {...register("tagline")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Contato e atendimento">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp comercial" htmlFor="whatsapp" error={e.whatsapp?.message} hint="Com DDD. Ex.: (47) 99999-0000">
            <Input id="whatsapp" inputMode="tel" {...register("whatsapp")} />
          </Field>
          <Field label="Telefone fixo" htmlFor="phone" error={e.phone?.message}>
            <Input id="phone" inputMode="tel" {...register("phone")} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={e.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
          <Field label="Horário de funcionamento" htmlFor="businessHours" error={e.businessHours?.message}>
            <Input id="businessHours" {...register("businessHours")} placeholder="Seg. a sex. 8h30–18h30 · Sáb. 9h–14h" />
          </Field>
          <Field
            label="Mensagem padrão do WhatsApp"
            htmlFor="whatsappMessage"
            error={e.whatsappMessage?.message}
            className="sm:col-span-2"
            hint={
              wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                  <MessageCircle className="size-3" /> Testar link do WhatsApp
                </a>
              ) : (
                "Texto inicial enviado quando o cliente clica no botão de WhatsApp."
              )
            }
          >
            <Textarea id="whatsappMessage" rows={2} {...register("whatsappMessage")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Endereço">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Endereço" htmlFor="address" error={e.address?.message}>
            <Input id="address" {...register("address")} />
          </Field>
          <Field label="Cidade / UF" htmlFor="city" error={e.city?.message}>
            <Input id="city" {...register("city")} />
          </Field>
          <Field label="Link do Google Maps" htmlFor="mapsUrl" error={e.mapsUrl?.message} className="sm:col-span-2">
            <Input id="mapsUrl" {...register("mapsUrl")} placeholder="https://maps.google.com/?q=..." />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Redes sociais">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={<><Instagram className="size-3.5" /> Instagram</>} htmlFor="instagram" error={e.instagram?.message}>
            <Input id="instagram" {...register("instagram")} placeholder="https://instagram.com/..." />
          </Field>
          <Field label={<><Facebook className="size-3.5" /> Facebook</>} htmlFor="facebook" error={e.facebook?.message}>
            <Input id="facebook" {...register("facebook")} placeholder="https://facebook.com/..." />
          </Field>
          <Field label={<><Youtube className="size-3.5" /> YouTube</>} htmlFor="youtube" error={e.youtube?.message}>
            <Input id="youtube" {...register("youtube")} placeholder="https://youtube.com/@..." />
          </Field>
        </div>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-card/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="button" variant="outline" disabled={!formState.isDirty} onClick={() => reset(initial)}>
          Descartar
        </Button>
        <Button type="submit" variant="brand" loading={formState.isSubmitting}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
