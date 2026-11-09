// Controle de acesso por perfil + concessões/revogações individuais.
// Arquivo puro (sem dependências de servidor) para ser usado no backend e na UI.
import type { Role } from "@prisma/client";

export const PERMISSIONS = {
  "dashboard.view": "Visualizar dashboard",
  "vehicles.view": "Visualizar veículos",
  "vehicles.create": "Cadastrar veículos",
  "vehicles.edit": "Editar veículos",
  "vehicles.delete": "Excluir veículos",
  "vehicles.publish": "Publicar, destacar e ordenar veículos",
  "vehicles.stock": "Alterar status do estoque",
  "brands.manage": "Gerenciar marcas, modelos e categorias",
  "quotes.view": "Visualizar orçamentos atribuídos a si ou sem responsável",
  "quotes.viewAll": "Visualizar todos os orçamentos",
  "quotes.manage": "Atender orçamentos (status, observações)",
  "quotes.assign": "Atribuir orçamentos a outros funcionários",
  "quotes.delete": "Excluir orçamentos",
  "content.manage": "Gerenciar banners, depoimentos e textos do site",
  "reports.view": "Visualizar e exportar relatórios",
  "users.manage": "Gerenciar funcionários",
  "settings.manage": "Configurações gerais",
  "activity.view": "Visualizar registro de atividades",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    "dashboard.view",
    "vehicles.view",
    "vehicles.create",
    "vehicles.edit",
    "vehicles.delete",
    "vehicles.publish",
    "vehicles.stock",
    "quotes.view",
    "quotes.viewAll",
    "quotes.manage",
    "quotes.assign",
    "content.manage",
    "reports.view",
  ],
  SELLER: ["dashboard.view", "vehicles.view", "vehicles.create", "vehicles.edit", "quotes.view", "quotes.manage"],
};

/** Permissões que nunca podem ser concedidas fora do perfil Administrador */
export const ADMIN_ONLY: Permission[] = ["users.manage", "settings.manage"];

export type PermissionSubject = {
  role: Role;
  extraPermissions?: string[] | null;
  revokedPermissions?: string[] | null;
};

export function resolvePermissions(user: PermissionSubject): Set<Permission> {
  const set = new Set<Permission>(ROLE_PERMISSIONS[user.role]);
  if (user.role !== "ADMIN") {
    for (const p of user.extraPermissions ?? []) {
      if (p in PERMISSIONS && !ADMIN_ONLY.includes(p as Permission)) set.add(p as Permission);
    }
    for (const p of user.revokedPermissions ?? []) set.delete(p as Permission);
  }
  return set;
}

export function can(user: PermissionSubject | null | undefined, permission: Permission) {
  if (!user) return false;
  return resolvePermissions(user).has(permission);
}
