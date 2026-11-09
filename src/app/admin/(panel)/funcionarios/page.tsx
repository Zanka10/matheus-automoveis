import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { UsersTable, type UserRow } from "@/components/admin/users/users-table";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";

export const metadata = { title: "Funcionários" };

export default async function EmployeesPage() {
  const me = await requirePermission("users.manage");
  const [users, open] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
      // Nunca selecionar passwordHash para enviar ao cliente
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        extraPermissions: true,
        revokedPermissions: true,
        lastLoginAt: true,
        lockedUntil: true,
        mustChangePassword: true,
        createdAt: true,
      },
    }),
    prisma.quote.groupBy({
      by: ["assignedToId"],
      where: { status: { notIn: ["FINISHED", "CANCELED"] }, assignedToId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const openMap = new Map(open.map((o) => [o.assignedToId, o._count._all]));
  const rows: UserRow[] = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    lockedUntil: u.lockedUntil?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    openQuotes: openMap.get(u.id) ?? 0,
  }));
  const activeCount = users.filter((u) => u.active).length;

  return (
    <>
      <PageHeader title="Funcionários" description={`${activeCount} ativo(s) de ${users.length} cadastrado(s). Gerencie acessos, perfis e permissões da equipe.`} />
      <UsersTable users={rows} currentUserId={me.id} />
      <Card className="mt-6 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Segurança de acesso</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Após 5 tentativas de senha incorretas, o acesso é bloqueado por 15 minutos.</li>
          <li>Desativar, alterar perfil ou redefinir senha encerra imediatamente as sessões do funcionário.</li>
          <li>Senhas são armazenadas com hash (bcrypt) e nunca podem ser visualizadas.</li>
        </ul>
      </Card>
    </>
  );
}
