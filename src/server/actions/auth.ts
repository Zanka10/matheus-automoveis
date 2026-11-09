"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { changePasswordSchema, loginSchema } from "@/validations/auth";

/** Aceita apenas caminhos internos do painel (evita open redirect); o middleware envia a URL absoluta */
function safeAdminPath(callbackUrl: string) {
  let path = callbackUrl;
  try {
    if (/^https?:\/\//i.test(callbackUrl)) {
      const url = new URL(callbackUrl);
      path = url.pathname + url.search;
    }
  } catch {
    return "/admin";
  }
  if (!path.startsWith("/admin") || path.startsWith("/admin/login") || path.startsWith("//")) return "/admin";
  return path;
}

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return zodFail(parsed.error);
  const redirectTo = safeAdminPath(String(formData.get("callbackUrl") ?? ""));
  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
    return ok();
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      if (code === "locked") return fail("Muitas tentativas inválidas. Conta bloqueada por 15 minutos.");
      if (code === "inactive") return fail("Usuário desativado. Procure o administrador.");
      return fail("E-mail ou senha incorretos.");
    }
    throw err; // redirect do Next após login bem-sucedido
  }
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await logActivity({ userId: user.id, action: "auth.logout", entity: "User", entityId: user.id, summary: "Logout" });
  await signOut({ redirectTo: "/admin/login" });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("Sessão expirada. Faça login novamente.");
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
    if (!valid) return fail("Senha atual incorreta.", { currentPassword: ["Senha atual incorreta"] });
    if (await bcrypt.compare(parsed.data.newPassword, record.passwordHash)) {
      return fail("A nova senha deve ser diferente da atual.", { newPassword: ["Use uma senha diferente da atual"] });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    await logActivity({ userId: user.id, action: "user.password_changed", entity: "User", entityId: user.id, summary: "Alterou a própria senha" });
    // Todas as sessões (inclusive a atual) são invalidadas: o usuário entra novamente com a nova senha
    await signOut({ redirectTo: "/admin/login?senha=1" });
    return ok();
  });
}
