"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/labels";
import { ADMIN_ONLY, ROLE_PERMISSIONS, type Permission } from "@/server/auth/permissions";
import { assertPermission } from "@/server/auth/session";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { resetPasswordSchema, userCreateSchema, userUpdateSchema } from "@/validations/admin";

const idSchema = z.string().min(1).max(40);

/** Normaliza concessões/revogações: só guarda o que difere do perfil e nunca concede permissões exclusivas de admin */
function normalizePermissions(role: Role, extra: string[], revoked: string[]) {
  if (role === "ADMIN") return { extraPermissions: [], revokedPermissions: [] };
  const base = new Set<string>(ROLE_PERMISSIONS[role]);
  return {
    extraPermissions: Array.from(new Set(extra)).filter((p) => !base.has(p) && !ADMIN_ONLY.includes(p as Permission)),
    revokedPermissions: Array.from(new Set(revoked)).filter((p) => base.has(p)),
  };
}

async function activeAdminCount(excludeId?: string) {
  return prisma.user.count({ where: { role: "ADMIN", active: true, ...(excludeId && { id: { not: excludeId } }) } });
}

function refresh() {
  revalidatePath("/admin/funcionarios");
}

export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const admin = await assertPermission("users.manage");
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
    if (exists) return fail("Já existe um usuário com este e-mail.", { email: ["E-mail já cadastrado"] });
    const user = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: d.role,
        active: d.active,
        ...normalizePermissions(d.role, d.extraPermissions, d.revokedPermissions),
        passwordHash: await bcrypt.hash(d.password, 12),
        mustChangePassword: true,
      },
      select: { id: true },
    });
    await logActivity({
      userId: admin.id,
      action: "user.create",
      entity: "User",
      entityId: user.id,
      summary: `Cadastrou o funcionário ${d.name} (${roleLabels[d.role]})`,
    });
    refresh();
    return ok({ id: user.id }, "Funcionário cadastrado. Ele deverá trocar a senha no primeiro acesso.");
  });
}

export async function updateUserAction(userId: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertPermission("users.manage");
    const id = idSchema.parse(userId);
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return fail("Funcionário não encontrado.");

    if (id === admin.id && (d.role !== "ADMIN" || !d.active)) {
      return fail("Você não pode remover seu próprio acesso de administrador nem se desativar.");
    }
    const losesAdmin = current.role === "ADMIN" && current.active && (d.role !== "ADMIN" || !d.active);
    if (losesAdmin && (await activeAdminCount(id)) === 0) {
      return fail("O sistema precisa manter ao menos um administrador ativo.");
    }
    if (d.email !== current.email) {
      const exists = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
      if (exists) return fail("Já existe um usuário com este e-mail.", { email: ["E-mail já cadastrado"] });
    }

    const perms = normalizePermissions(d.role, d.extraPermissions, d.revokedPermissions);
    // Mudanças de acesso encerram as sessões ativas do funcionário
    const accessChanged =
      d.role !== current.role ||
      d.active !== current.active ||
      d.email !== current.email ||
      perms.extraPermissions.join() !== current.extraPermissions.join() ||
      perms.revokedPermissions.join() !== current.revokedPermissions.join();

    await prisma.user.update({
      where: { id },
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: d.role,
        active: d.active,
        ...perms,
        ...(accessChanged && id !== admin.id && { sessionVersion: { increment: 1 } }),
      },
    });
    await logActivity({
      userId: admin.id,
      action: "user.update",
      entity: "User",
      entityId: id,
      summary: `Atualizou o funcionário ${d.name}`,
      details: {
        role: current.role !== d.role ? `${current.role} → ${d.role}` : undefined,
        active: current.active !== d.active ? d.active : undefined,
        extraPermissions: perms.extraPermissions,
        revokedPermissions: perms.revokedPermissions,
      },
    });
    refresh();
    return ok(undefined, "Funcionário atualizado.");
  });
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertPermission("users.manage");
    const id = idSchema.parse(userId);
    if (id === admin.id) return fail("Você não pode desativar o próprio usuário.");
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return fail("Funcionário não encontrado.");
    if (!active && user.role === "ADMIN" && (await activeAdminCount(id)) === 0) {
      return fail("O sistema precisa manter ao menos um administrador ativo.");
    }
    await prisma.user.update({
      where: { id },
      data: { active, ...(!active && { sessionVersion: { increment: 1 } }) },
    });
    await logActivity({
      userId: admin.id,
      action: active ? "user.activate" : "user.deactivate",
      entity: "User",
      entityId: id,
      summary: `${active ? "Reativou" : "Desativou"} o funcionário ${user.name}`,
    });
    refresh();
    return ok(undefined, active ? "Funcionário reativado." : "Funcionário desativado e sessões encerradas.");
  });
}

export async function resetUserPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertPermission("users.manage");
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) return fail("Funcionário não encontrado.");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await logActivity({
      userId: admin.id,
      action: "user.reset_password",
      entity: "User",
      entityId: user.id,
      summary: `Redefiniu a senha de ${user.name}`,
    });
    refresh();
    return ok(undefined, "Senha redefinida. O funcionário deverá criar uma nova senha no próximo acesso.");
  });
}

export async function unlockUserAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertPermission("users.manage");
    const id = idSchema.parse(userId);
    const user = await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
      select: { name: true },
    });
    await logActivity({ userId: admin.id, action: "user.unlock", entity: "User", entityId: id, summary: `Desbloqueou o acesso de ${user.name}` });
    refresh();
    return ok(undefined, "Acesso desbloqueado.");
  });
}
