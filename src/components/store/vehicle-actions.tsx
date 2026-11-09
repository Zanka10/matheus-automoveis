"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, FileText, Hand, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field, applyServerErrors } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/primitives";
import { registerVehicleViewAction, submitQuoteAction } from "@/server/actions/public-quote";
import { quoteRequestSchema } from "@/validations/quote";
import { WhatsAppIcon } from "./icons";
import { CpfInput } from "./cpf-input";
import { PhoneInput } from "./phone-input";

type FormIn = z.input<typeof quoteRequestSchema>;
type FormOut = z.output<typeof quoteRequestSchema>;

export function VehicleActions({
  vehicleId,
  title,
  url,
  whatsappHref,
  available,
  layout = "stack",
}: {
  vehicleId: string;
  title: string;
  url: string;
  whatsappHref: string | null;
  available: boolean;
  layout?: "stack" | "bar";
}) {
  const [interestOpen, setInterestOpen] = useState(false);

  async function share() {
    const data = { title, text: `Confira este ${title}`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência.");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") toast.error("Não foi possível compartilhar.");
    }
  }

  if (layout === "bar") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2">
          {whatsappHref && (
            <Button asChild variant="whatsapp" className="h-12 flex-1 rounded-xl">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-5" /> WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="brand" className="h-12 flex-1 rounded-xl">
            <Link href={`/orcamento?veiculo=${vehicleId}`}>Solicitar orçamento</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {available && (
        <Button variant="brand" size="lg" className="h-13 rounded-xl text-base" onClick={() => setInterestOpen(true)}>
          <Hand /> Tenho interesse
        </Button>
      )}
      <Button asChild variant="default" size="lg" className="h-13 rounded-xl text-base">
        <Link href={`/orcamento?veiculo=${vehicleId}`}>
          <FileText /> Solicitar orçamento
        </Link>
      </Button>
      {whatsappHref && (
        <Button asChild variant="whatsapp" size="lg" className="h-13 rounded-xl text-base">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="size-5" /> Consultar pelo WhatsApp
          </a>
        </Button>
      )}
      <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={share}>
        <Share2 /> Compartilhar veículo
      </Button>
      <InterestDialog open={interestOpen} onOpenChange={setInterestOpen} vehicleId={vehicleId} title={title} whatsappHref={whatsappHref} />
    </div>
  );
}

function InterestDialog({
  open,
  onOpenChange,
  vehicleId,
  title,
  whatsappHref,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  title: string;
  whatsappHref: string | null;
}) {
  const [protocol, setProtocol] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      vehicleId,
      message: `Olá! Tenho interesse no ${title}.`,
      wantsFinancing: false,
      hasTradeIn: false,
      source: "INTEREST",
      website: "",
    },
  });

  useEffect(() => {
    if (!open && protocol) {
      setProtocol(null);
      reset();
    }
  }, [open, protocol, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await submitQuoteAction(values);
    if (!res.ok) {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
      return;
    }
    setProtocol(res.data?.protocol ?? null);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {protocol ? (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 className="size-14 text-success" />
            <DialogTitle className="mt-4 text-xl">Interesse registrado!</DialogTitle>
            <DialogDescription className="mt-2">
              Protocolo <strong className="text-foreground">{protocol}</strong>. Um consultor entrará em contato em breve.
            </DialogDescription>
            {whatsappHref && (
              <Button asChild variant="whatsapp" className="mt-6 w-full">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-5" /> Adiantar pelo WhatsApp
                </a>
              </Button>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Tenho interesse</DialogTitle>
              <DialogDescription>{title}</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />
              <Field label="Nome completo" htmlFor="i-name" error={errors.name?.message} required>
                <Input id="i-name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone / WhatsApp" htmlFor="i-phone" error={errors.phone?.message} required>
                  <PhoneInput id="i-phone" {...register("phone")} aria-invalid={!!errors.phone} />
                </Field>
                <Field label="E-mail" htmlFor="i-email" error={errors.email?.message} required>
                  <Input id="i-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CPF" htmlFor="i-cpf" error={errors.cpf?.message} required>
                  <CpfInput id="i-cpf" {...register("cpf")} aria-invalid={!!errors.cpf} />
                </Field>
                <Field label="Data de nascimento" htmlFor="i-birth" error={errors.birthDate?.message} required>
                  <Input id="i-birth" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...register("birthDate")} aria-invalid={!!errors.birthDate} />
                </Field>
              </div>
              <Field label="Mensagem" htmlFor="i-msg" error={errors.message?.message}>
                <Textarea id="i-msg" rows={3} {...register("message")} />
              </Field>
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  checked={!!watch("wantsFinancing")}
                  onCheckedChange={(v) => setValue("wantsFinancing", v === true)}
                  className="mt-0.5"
                />
                Tenho interesse em financiamento
              </label>
              <div>
                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                  <Checkbox
                    checked={watch("consent") === true}
                    onCheckedChange={(v) => setValue("consent", (v === true) as true, { shouldValidate: true })}
                    className="mt-0.5"
                    aria-invalid={!!errors.consent}
                  />
                  Autorizo o contato da loja e o uso dos meus dados para este atendimento, conforme a LGPD.
                </label>
                {errors.consent && <p className="mt-1 text-xs font-medium text-destructive">{errors.consent.message}</p>}
              </div>
              <Button type="submit" variant="brand" size="lg" loading={isSubmitting}>
                Enviar interesse
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Registra a visualização sem bloquear a renderização nem invalidar o cache */
export function ViewTracker({ vehicleId }: { vehicleId: string }) {
  useEffect(() => {
    const t = setTimeout(() => void registerVehicleViewAction(vehicleId), 1500);
    return () => clearTimeout(t);
  }, [vehicleId]);
  return null;
}
