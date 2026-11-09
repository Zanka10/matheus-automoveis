"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/session";
import { ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { revalidateStore } from "@/server/revalidate";
import { siteSettingsSchema } from "@/validations/admin";

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("settings.manage");
    const parsed = siteSettingsSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const data = { ...parsed.data, whatsapp: parsed.data.whatsapp?.replace(/\D/g, "") || null };
    const before = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    await prisma.siteSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
    const changed = before
      ? Object.keys(data).filter((k) => (before as Record<string, unknown>)[k] !== (data as Record<string, unknown>)[k])
      : Object.keys(data);
    await logActivity({
      userId: user.id,
      action: "settings.update",
      entity: "SiteSettings",
      entityId: "default",
      summary: "Atualizou as configurações gerais da loja",
      details: { campos: changed },
    });
    revalidateStore();
    revalidatePath("/admin/configuracoes");
    return ok(undefined, "Configurações salvas.");
  });
}
