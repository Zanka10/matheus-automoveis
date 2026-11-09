"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { quoteStatusLabels } from "@/lib/labels";
import { can } from "@/server/auth/permissions";
import { assertPermission, type CurrentUser } from "@/server/auth/session";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { quoteVisibilityWhere } from "@/server/services/quotes-admin";
import { quoteAssignSchema, quoteNoteSchema, quoteStatusUpdateSchema } from "@/validations/quote";

/** Busca o orçamento respeitando a visibilidade do usuário (nunca confia no id vindo do cliente) */
async function findVisible(user: CurrentUser, quoteId: string) {
  return prisma.quote.findFirst({ where: { AND: [{ id: quoteId }, quoteVisibilityWhere(user)] } });
}

function refresh(id: string) {
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin", "layout");
}

export async function updateQuoteStatusAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("quotes.manage");
    const parsed = quoteStatusUpdateSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const { quoteId, status, note, convertedToSale } = parsed.data;
    const quote = await findVisible(user, quoteId);
    if (!quote) return fail("Orçamento não encontrado ou sem permissão de acesso.");
    if (quote.status === status && (status !== "FINISHED" || convertedToSale === undefined || convertedToSale === quote.convertedToSale) && !note) {
      return ok();
    }
    const closing = status === "FINISHED" || status === "CANCELED";
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: {
          status,
          closedAt: closing ? (quote.closedAt ?? new Date()) : null,
          convertedToSale: status === "FINISHED" ? Boolean(convertedToSale) : false,
          // Quem movimenta um orçamento sem responsável passa a ser o responsável
          assignedToId: quote.assignedToId ?? user.id,
        },
      }),
      prisma.quoteEvent.create({
        data: {
          quoteId: quote.id,
          type: "STATUS_CHANGED",
          fromStatus: quote.status,
          toStatus: status,
          note: [note, status === "FINISHED" && convertedToSale ? "Convertido em venda." : null].filter(Boolean).join(" ") || null,
          userId: user.id,
        },
      }),
    ]);
    await logActivity({
      userId: user.id,
      action: "quote.status",
      entity: "Quote",
      entityId: quote.id,
      summary: `Orçamento ${quote.protocol}: ${quoteStatusLabels[quote.status]} → ${quoteStatusLabels[status]}`,
      details: { convertedToSale: convertedToSale ?? null },
    });
    refresh(quote.id);
    return ok(undefined, "Status atualizado.");
  });
}

export async function addQuoteNoteAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("quotes.manage");
    const parsed = quoteNoteSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const quote = await findVisible(user, parsed.data.quoteId);
    if (!quote) return fail("Orçamento não encontrado ou sem permissão de acesso.");
    await prisma.quoteEvent.create({
      data: { quoteId: quote.id, type: parsed.data.type, note: parsed.data.note, userId: user.id },
    });
    await prisma.quote.update({ where: { id: quote.id }, data: { updatedAt: new Date() } });
    await logActivity({
      userId: user.id,
      action: parsed.data.type === "CONTACT" ? "quote.contact" : "quote.note",
      entity: "Quote",
      entityId: quote.id,
      summary: `${parsed.data.type === "CONTACT" ? "Registrou contato" : "Adicionou observação"} no orçamento ${quote.protocol}`,
    });
    refresh(quote.id);
    return ok(undefined, "Registro adicionado ao histórico.");
  });
}

/** Registra o início de conversa pelo WhatsApp no histórico */
export async function logQuoteWhatsappAction(quoteId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("quotes.manage");
    const id = z.string().min(1).max(40).parse(quoteId);
    const quote = await findVisible(user, id);
    if (!quote) return fail("Orçamento não encontrado.");
    await prisma.quoteEvent.create({
      data: { quoteId: quote.id, type: "CONTACT", note: "Conversa iniciada pelo WhatsApp.", userId: user.id },
    });
    await logActivity({ userId: user.id, action: "quote.whatsapp", entity: "Quote", entityId: quote.id, summary: `Iniciou WhatsApp com cliente do orçamento ${quote.protocol}` });
    refresh(quote.id);
    return ok();
  });
}

export async function assignQuoteAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("quotes.manage");
    const parsed = quoteAssignSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const { quoteId, userId } = parsed.data;
    const quote = await findVisible(user, quoteId);
    if (!quote) return fail("Orçamento não encontrado ou sem permissão de acesso.");

    const canAssign = can(user, "quotes.assign");
    if (!canAssign) {
      // Sem permissão de atribuição: apenas assumir um orçamento sem responsável
      if (userId !== user.id || quote.assignedToId !== null) {
        return fail("Você só pode assumir orçamentos sem responsável.");
      }
    }
    if (quote.assignedToId === userId) return ok();

    let target: { id: string; name: string } | null = null;
    if (userId) {
      target = await prisma.user.findFirst({ where: { id: userId, active: true }, select: { id: true, name: true } });
      if (!target) return fail("Funcionário inválido ou inativo.");
    }
    await prisma.$transaction([
      prisma.quote.update({ where: { id: quote.id }, data: { assignedToId: target?.id ?? null } }),
      prisma.quoteEvent.create({
        data: {
          quoteId: quote.id,
          type: "ASSIGNED",
          note: target ? (target.id === user.id ? `${target.name} assumiu o atendimento` : `Atribuído a ${target.name}`) : "Responsável removido",
          userId: user.id,
        },
      }),
    ]);
    await logActivity({
      userId: user.id,
      action: "quote.assign",
      entity: "Quote",
      entityId: quote.id,
      summary: `Orçamento ${quote.protocol}: ${target ? `responsável ${target.name}` : "responsável removido"}`,
    });
    refresh(quote.id);
    return ok(undefined, target ? "Responsável definido." : "Responsável removido.");
  });
}

export async function deleteQuoteAction(quoteId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("quotes.delete");
    const id = z.string().min(1).max(40).parse(quoteId);
    const quote = await findVisible(user, id);
    if (!quote) return fail("Orçamento não encontrado.");
    await prisma.quote.delete({ where: { id: quote.id } });
    await logActivity({
      userId: user.id,
      action: "quote.delete",
      entity: "Quote",
      entityId: quote.id,
      summary: `Excluiu o orçamento ${quote.protocol} (${quote.name})`,
    });
    revalidatePath("/admin/orcamentos");
    revalidatePath("/admin", "layout");
    return ok(undefined, "Orçamento excluído.");
  });
}
