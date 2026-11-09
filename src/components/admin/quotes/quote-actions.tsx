"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { QuoteStatus } from "@prisma/client";
import { Mail, MessageCircle, PhoneCall, StickyNote, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Checkbox, Label } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form";
import { quoteStatusLabels, quoteStatusOrder } from "@/lib/labels";
import {
  addQuoteNoteAction,
  assignQuoteAction,
  deleteQuoteAction,
  logQuoteWhatsappAction,
  updateQuoteStatusAction,
} from "@/server/actions/quotes";

function notify(res: { ok: boolean; message?: string; error?: string }) {
  if (res.ok) {
    if (res.message) toast.success(res.message);
  } else toast.error(res.error ?? "Erro ao salvar");
}

export function QuoteStatusForm({ quoteId, status, converted }: { quoteId: string; status: QuoteStatus; converted: boolean }) {
  const router = useRouter();
  const { register, handleSubmit, watch, reset, formState } = useForm<{ status: QuoteStatus; note: string; convertedToSale: boolean }>({
    defaultValues: { status, note: "", convertedToSale: converted },
  });
  const [conv, setConv] = useState(converted);
  const selected = watch("status");

  const onSubmit = handleSubmit(async (values) => {
    const res = await updateQuoteStatusAction({ quoteId, status: values.status, note: values.note, convertedToSale: conv });
    notify(res);
    if (res.ok) {
      reset({ status: values.status, note: "", convertedToSale: conv });
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Status do atendimento" htmlFor="status">
        <NativeSelect id="status" {...register("status")}>
          {quoteStatusOrder.map((s) => (
            <option key={s} value={s}>
              {quoteStatusLabels[s]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {selected === "FINISHED" && (
        <Label className="rounded-lg border bg-emerald-50/60 p-3 font-normal">
          <Checkbox checked={conv} onCheckedChange={(v) => setConv(v === true)} />
          Atendimento convertido em venda
        </Label>
      )}
      <Field label="Observação (opcional)" htmlFor="status-note">
        <Textarea id="status-note" rows={2} placeholder="Ex.: Cliente aguardando aprovação do financiamento" {...register("note")} />
      </Field>
      <Button type="submit" loading={formState.isSubmitting}>
        Atualizar status
      </Button>
    </form>
  );
}

export function QuoteNoteForm({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"NOTE" | "CONTACT">("NOTE");
  const { register, handleSubmit, reset, formState } = useForm<{ note: string }>({ defaultValues: { note: "" } });
  const [error, setError] = useState<string>();

  const onSubmit = handleSubmit(async ({ note }) => {
    if (!note.trim()) return setError("Escreva a observação");
    setError(undefined);
    const res = await addQuoteNoteAction({ quoteId, note, type });
    notify(res);
    if (res.ok) {
      reset({ note: "" });
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="inline-flex w-fit rounded-lg bg-muted p-0.5 text-sm">
        {(
          [
            ["NOTE", "Observação interna", StickyNote],
            ["CONTACT", "Registro de contato", PhoneCall],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${type === value ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      <Field error={error}>
        <Textarea
          rows={3}
          aria-label="Texto do registro"
          placeholder={type === "NOTE" ? "Anotação visível apenas para a equipe…" : "Descreva o contato realizado (ligação, visita, e-mail)…"}
          {...register("note")}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" loading={formState.isSubmitting}>
          Adicionar ao histórico
        </Button>
      </div>
    </form>
  );
}

export function QuoteAssign({
  quoteId,
  assignedToId,
  currentUserId,
  canAssign,
  users,
}: {
  quoteId: string;
  assignedToId: string | null;
  currentUserId: string;
  canAssign: boolean;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (userId: string | null) =>
    start(async () => {
      const res = await assignQuoteAction({ quoteId, userId });
      notify(res);
      if (res.ok) router.refresh();
    });

  if (canAssign) {
    return (
      <div className="flex flex-col gap-2">
        <NativeSelect value={assignedToId ?? ""} disabled={pending} onChange={(e) => run(e.target.value || null)} aria-label="Responsável">
          <option value="">Sem responsável</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
        {assignedToId !== currentUserId && (
          <Button variant="ghost" size="sm" className="self-start" loading={pending} onClick={() => run(currentUserId)}>
            <UserCheck /> Atribuir a mim
          </Button>
        )}
      </div>
    );
  }
  if (!assignedToId) {
    return (
      <Button variant="brand" loading={pending} onClick={() => run(currentUserId)} className="w-full">
        <UserCheck /> Assumir atendimento
      </Button>
    );
  }
  return null;
}

export function QuoteContactButtons({
  quoteId,
  whatsappHref,
  email,
  subject,
  canManage,
}: {
  quoteId: string;
  whatsappHref: string | null;
  email: string;
  subject: string;
  canManage: boolean;
}) {
  const router = useRouter();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {whatsappHref && (
        <Button asChild variant="whatsapp">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (canManage) logQuoteWhatsappAction(quoteId).then(() => router.refresh());
            }}
          >
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      )}
      <Button asChild variant="outline">
        <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>
          <Mail /> E-mail
        </a>
      </Button>
    </div>
  );
}

export function DeleteQuoteButton({ quoteId, protocol }: { quoteId: string; protocol: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 /> Excluir
        </Button>
      }
      title={`Excluir orçamento ${protocol}?`}
      description="O orçamento e todo o histórico de atendimento serão removidos permanentemente. Esta ação não pode ser desfeita."
      confirmLabel="Excluir orçamento"
      onConfirm={async () => {
        const res = await deleteQuoteAction(quoteId);
        notify(res);
        if (res.ok) router.push("/admin/orcamentos");
      }}
    />
  );
}
