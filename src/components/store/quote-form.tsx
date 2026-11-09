"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, Landmark, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, applyServerErrors } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { submitQuoteAction } from "@/server/actions/public-quote";
import { quoteRequestSchema } from "@/validations/quote";
import { WhatsAppIcon } from "./icons";
import { CpfInput } from "./cpf-input";
import { PhoneInput } from "./phone-input";

type FormIn = z.input<typeof quoteRequestSchema>;
type FormOut = z.output<typeof quoteRequestSchema>;

export function QuoteForm({
  vehicles,
  defaultVehicleId,
  whatsapp,
}: {
  vehicles: { id: string; label: string }[];
  defaultVehicleId?: string | null;
  /** número da loja (apenas dígitos com DDI) para acompanhamento */
  whatsapp: string | null;
}) {
  const [success, setSuccess] = useState<{ protocol: string; vehicleLabel: string | null } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      cpf: "",
      birthDate: "",
      vehicleId: vehicles.some((v) => v.id === defaultVehicleId) ? defaultVehicleId : "",
      message: "",
      wantsFinancing: false,
      hasTradeIn: false,
      source: "FORM",
      website: "",
    },
  });

  const hasTradeIn = watch("hasTradeIn");
  const wantsFinancing = watch("wantsFinancing");

  const onSubmit = handleSubmit(async (values) => {
    const res = await submitQuoteAction(values);
    if (!res.ok) {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
      return;
    }
    setSuccess(res.data ?? { protocol: "", vehicleLabel: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (success) {
    const followUp = whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          `Olá! Acabei de solicitar um orçamento pelo site (protocolo ${success.protocol})${success.vehicleLabel ? ` para o ${success.vehicleLabel}` : ""}.`,
        )}`
      : null;
    return (
      <div className="flex flex-col items-center rounded-3xl border bg-card px-6 py-14 text-center shadow-sm sm:px-12">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-9 text-emerald-600" />
        </div>
        <h2 className="mt-6 text-2xl font-extrabold">Solicitação enviada!</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Recebemos seu pedido de orçamento{success.vehicleLabel ? ` para o ${success.vehicleLabel}` : ""}. Um consultor entrará em contato em breve.
        </p>
        <p className="mt-6 rounded-xl bg-muted px-5 py-3 text-sm">
          Protocolo: <strong className="font-display text-base">{success.protocol}</strong>
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {followUp && (
            <Button asChild variant="whatsapp" size="lg">
              <a href={followUp} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-5" /> Acompanhar pelo WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/veiculos">Continuar navegando</Link>
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              reset();
              setSuccess(null);
            }}
          >
            Enviar outra solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-5 text-lg font-bold">Seus dados</legend>
        <Field label="Nome completo" htmlFor="q-name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="q-name" autoComplete="name" className="h-11" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Telefone / WhatsApp" htmlFor="q-phone" error={errors.phone?.message} required>
          <PhoneInput id="q-phone" className="h-11" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="E-mail" htmlFor="q-email" error={errors.email?.message} required>
          <Input id="q-email" type="email" autoComplete="email" className="h-11" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="CPF" htmlFor="q-cpf" error={errors.cpf?.message} required>
          <CpfInput id="q-cpf" className="h-11" aria-invalid={!!errors.cpf} {...register("cpf")} />
        </Field>
        <Field label="Data de nascimento" htmlFor="q-birth" error={errors.birthDate?.message} required>
          <Input id="q-birth" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} className="h-11" aria-invalid={!!errors.birthDate} {...register("birthDate")} />
        </Field>
      </fieldset>

      <fieldset className="mt-10 grid gap-5">
        <legend className="mb-5 text-lg font-bold">Seu interesse</legend>
        <Field label="Veículo de interesse" htmlFor="q-vehicle" error={errors.vehicleId?.message} hint="Deixe em branco se ainda não escolheu — ajudamos você a encontrar.">
          <NativeSelect id="q-vehicle" className="h-11" {...register("vehicleId")}>
            <option value="">Ainda não escolhi / outro veículo</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Mensagem" htmlFor="q-message" error={errors.message?.message}>
          <Textarea id="q-message" rows={4} placeholder="Conte o que procura, prazo de compra, forma de pagamento…" {...register("message")} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleCard
            icon={<Landmark className="size-5" />}
            title="Quero financiar"
            description="Simulamos com os principais bancos."
            checked={!!wantsFinancing}
            onChange={(v) => setValue("wantsFinancing", v)}
          />
          <div className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Repeat className="size-5" /></span>
              <div>
                <p className="text-sm font-semibold">Possui veículo para troca?</p>
                <p className="text-xs text-muted-foreground">Avaliação justa pela tabela de mercado.</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Possui veículo para troca?">
              {[false, true].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  role="radio"
                  aria-checked={hasTradeIn === val}
                  onClick={() => setValue("hasTradeIn", val, { shouldValidate: false })}
                  className={cn(
                    "rounded-md py-1.5 text-sm font-medium transition",
                    hasTradeIn === val ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {val ? "Sim" : "Não"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {hasTradeIn && (
        <fieldset className="mt-8 grid gap-5 rounded-2xl bg-secondary/60 p-5 animate-fade-up sm:grid-cols-2 sm:p-6">
          <legend className="sr-only">Veículo para troca</legend>
          <p className="text-sm font-semibold sm:col-span-2">Informações do seu veículo</p>
          <Field label="Marca" htmlFor="t-brand" error={errors.tradeInBrand?.message} required>
            <Input id="t-brand" placeholder="Ex.: Volkswagen" {...register("tradeInBrand")} />
          </Field>
          <Field label="Modelo / versão" htmlFor="t-model" error={errors.tradeInModel?.message} required>
            <Input id="t-model" placeholder="Ex.: Gol 1.6 MSI" {...register("tradeInModel")} />
          </Field>
          <Field label="Ano" htmlFor="t-year" error={errors.tradeInYear?.message}>
            <Input id="t-year" inputMode="numeric" maxLength={4} placeholder="2019" {...register("tradeInYear")} />
          </Field>
          <Field label="Quilometragem" htmlFor="t-km" error={errors.tradeInMileage?.message}>
            <Input id="t-km" inputMode="numeric" placeholder="65000" {...register("tradeInMileage")} />
          </Field>
          <Field label="Observações (estado, opcionais, revisões)" htmlFor="t-notes" error={errors.tradeInNotes?.message} className="sm:col-span-2">
            <Textarea id="t-notes" rows={3} {...register("tradeInNotes")} />
          </Field>
        </fieldset>
      )}

      <div className="mt-8 border-t pt-6">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Checkbox
            checked={watch("consent") === true}
            onCheckedChange={(v) => setValue("consent", (v === true) as true, { shouldValidate: true })}
            className="mt-0.5"
            aria-invalid={!!errors.consent}
          />
          <span>
            Autorizo a Matheus Automóveis a entrar em contato por telefone, WhatsApp ou e-mail e a tratar meus dados exclusivamente para este atendimento, conforme a Lei Geral de Proteção de Dados (LGPD).
          </span>
        </label>
        {errors.consent && <p className="mt-2 text-xs font-medium text-destructive">{errors.consent.message}</p>}
        <Button type="submit" variant="brand" size="lg" loading={isSubmitting} className="mt-6 w-full sm:w-auto sm:px-10">
          Enviar solicitação
        </Button>
      </div>
    </form>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition", checked && "border-brand/50 bg-brand-soft/50")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={title} />
    </label>
  );
}
