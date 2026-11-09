import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, resolvePermissions, type Permission } from "./permissions";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadCurrentUser>>>;

/**
 * Carrega o usuário autenticado direto do banco a cada requisição.
 * A sessão é invalidada se o usuário foi desativado ou se a senha foi redefinida
 * (sessionVersion diferente da gravada no token).
 */
async function loadCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      phone: true,
      sessionVersion: true,
      mustChangePassword: true,
      extraPermissions: true,
      revokedPermissions: true,
      lastLoginAt: true,
    },
  });
  if (!user || !user.active) return null;
  if ((session.user.sv ?? 0) !== user.sessionVersion) return null;
  return { ...user, permissions: Array.from(resolvePermissions(user)) };
}

export const getCurrentUser = cache(loadCurrentUser);

/** Para páginas: redireciona para o login se não houver sessão válida */
export async function requireUser(options?: { allowPasswordChange?: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login?expired=1");
  if (user.mustChangePassword && !options?.allowPasswordChange) redirect("/admin/alterar-senha");
  return user;
}

/** Para páginas: exige uma permissão; sem ela, exibe a página de acesso negado */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/admin/acesso-negado");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para realizar esta ação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Para server actions e route handlers: lança erro em vez de redirecionar */
export async function assertPermission(...permissions: Permission[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Sua sessão expirou. Faça login novamente.");
  if (user.mustChangePassword) throw new AuthorizationError("Altere sua senha antes de continuar.");
  for (const p of permissions) if (!can(user, p)) throw new AuthorizationError();
  return user;
}
