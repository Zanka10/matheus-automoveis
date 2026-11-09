"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/session";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { revalidateStore } from "@/server/revalidate";
import { bannerSchema, siteContentSchema, testimonialSchema } from "@/validations/admin";

const idSchema = z.string().min(1).max(40);

function refresh() {
  revalidateStore();
  revalidatePath("/admin/publicacoes");
}

// ───────────── Banners ─────────────

export async function saveBannerAction(bannerId: string | null, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const parsed = bannerSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;
    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
      return fail("A data final deve ser posterior à inicial.", { endsAt: ["Data final anterior à inicial"] });
    }
    if (d.vehicleId) {
      const exists = await prisma.vehicle.findUnique({ where: { id: d.vehicleId }, select: { id: true } });
      if (!exists) return fail("Veículo vinculado não encontrado.");
    }
    const data = { ...d, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null };
    const banner = bannerId
      ? await prisma.banner.update({ where: { id: idSchema.parse(bannerId) }, data })
      : await prisma.banner.create({ data });
    await logActivity({
      userId: user.id,
      action: bannerId ? "banner.update" : "banner.create",
      entity: "Banner",
      entityId: banner.id,
      summary: `${bannerId ? "Atualizou" : "Criou"} o banner "${banner.title}"`,
    });
    refresh();
    return ok(undefined, bannerId ? "Banner atualizado." : "Banner criado.");
  });
}

export async function toggleBannerAction(bannerId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const banner = await prisma.banner.update({ where: { id: idSchema.parse(bannerId) }, data: { active } });
    await logActivity({
      userId: user.id,
      action: active ? "banner.activate" : "banner.deactivate",
      entity: "Banner",
      entityId: banner.id,
      summary: `${active ? "Ativou" : "Desativou"} o banner "${banner.title}"`,
    });
    refresh();
    return ok(undefined, active ? "Banner ativado." : "Banner desativado.");
  });
}

export async function deleteBannerAction(bannerId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const banner = await prisma.banner.delete({ where: { id: idSchema.parse(bannerId) } });
    await logActivity({ userId: user.id, action: "banner.delete", entity: "Banner", entityId: banner.id, summary: `Excluiu o banner "${banner.title}"` });
    refresh();
    return ok(undefined, "Banner excluído.");
  });
}

// ───────────── Depoimentos ─────────────

export async function saveTestimonialAction(testimonialId: string | null, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const t = testimonialId
      ? await prisma.testimonial.update({ where: { id: idSchema.parse(testimonialId) }, data: parsed.data })
      : await prisma.testimonial.create({ data: parsed.data });
    await logActivity({
      userId: user.id,
      action: testimonialId ? "testimonial.update" : "testimonial.create",
      entity: "Testimonial",
      entityId: t.id,
      summary: `${testimonialId ? "Atualizou" : "Adicionou"} depoimento de ${t.name}`,
    });
    refresh();
    return ok(undefined, "Depoimento salvo.");
  });
}

export async function toggleTestimonialAction(testimonialId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const t = await prisma.testimonial.update({ where: { id: idSchema.parse(testimonialId) }, data: { active } });
    await logActivity({
      userId: user.id,
      action: active ? "testimonial.activate" : "testimonial.deactivate",
      entity: "Testimonial",
      entityId: t.id,
      summary: `${active ? "Exibiu" : "Ocultou"} depoimento de ${t.name}`,
    });
    refresh();
    return ok(undefined, active ? "Depoimento visível no site." : "Depoimento ocultado.");
  });
}

export async function deleteTestimonialAction(testimonialId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const t = await prisma.testimonial.delete({ where: { id: idSchema.parse(testimonialId) } });
    await logActivity({ userId: user.id, action: "testimonial.delete", entity: "Testimonial", entityId: t.id, summary: `Excluiu depoimento de ${t.name}` });
    refresh();
    return ok(undefined, "Depoimento excluído.");
  });
}

// ───────────── Textos e chamadas ─────────────

export async function saveSiteContentAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("content.manage");
    const parsed = siteContentSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });
    await logActivity({
      userId: user.id,
      action: "site.content",
      entity: "SiteSettings",
      entityId: "default",
      summary: "Atualizou textos e chamadas comerciais do site",
    });
    refresh();
    return ok(undefined, "Textos do site atualizados.");
  });
}
