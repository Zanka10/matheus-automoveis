import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel Matheus Automóveis" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const newQuotes = can(user, "quotes.viewAll")
    ? await prisma.quote.count({ where: { status: "NEW" } })
    : can(user, "quotes.view")
      ? await prisma.quote.count({ where: { status: "NEW", OR: [{ assignedToId: user.id }, { assignedToId: null }] } })
      : 0;

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, roleLabel: roleLabels[user.role], permissions: user.permissions }}
      badges={{ newQuotes }}
    >
      {children}
    </AdminShell>
  );
}
