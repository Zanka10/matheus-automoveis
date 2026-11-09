import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { History } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/page-header";
import { Card, Table, TBody, TD, TH, THead, TR, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Pagination } from "@/components/admin/quotes/pagination";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

export const metadata = { title: "Registro de atividades" };

const PAGE_SIZE = 30;

const ENTITY_LABELS: Record<string, string> = {
  User: "Usuários / acesso",
  Vehicle: "Veículos",
  Brand: "Marcas",
  VehicleModel: "Modelos",
  Category: "Categorias",
  Quote: "Orçamentos",
  Banner: "Banners",
  Testimonial: "Depoimentos",
  SiteSettings: "Configurações do site",
  Upload: "Uploads",
  Report: "Relatórios",
};

type SP = { usuario?: string; entidade?: string; q?: string; de?: string; ate?: string; pagina?: string };

function day(v: string | undefined, end = false) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}-03:00`);
}

function actionTone(action: string) {
  if (/delete|deactivate|locked|failed/.test(action)) return "bg-red-50 text-red-700 ring-red-600/15";
  if (/create|publish|activate|login/.test(action)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
  return "bg-muted text-muted-foreground ring-transparent";
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("activity.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  const and: Prisma.ActivityLogWhereInput[] = [];
  if (sp.usuario) and.push({ userId: sp.usuario.slice(0, 40) });
  if (sp.entidade && ENTITY_LABELS[sp.entidade]) and.push({ entity: sp.entidade });
  if (sp.q) {
    const q = sp.q.slice(0, 80);
    and.push({ OR: [{ summary: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { ip: { contains: q } }] });
  }
  const from = day(sp.de);
  const to = day(sp.ate, true);
  if (from || to) and.push({ createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } });
  const where: Prisma.ActivityLogWhereInput = and.length ? { AND: and } : {};

  const [logs, total, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(sp.usuario || sp.entidade || sp.q || sp.de || sp.ate);

  return (
    <>
      <PageHeader title="Registro de atividades" description="Auditoria das ações realizadas no painel: logins, cadastros, alterações e exclusões." />

      <form method="get" className="mb-4 grid gap-3 rounded-xl border bg-card p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px_150px_150px_auto]">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar na descrição, ação ou IP" aria-label="Buscar" />
        <NativeSelect name="usuario" defaultValue={sp.usuario ?? ""} aria-label="Usuário">
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="entidade" defaultValue={sp.entidade ?? ""} aria-label="Módulo">
          <option value="">Todos os módulos</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" name="de" defaultValue={sp.de ?? ""} aria-label="De" />
        <Input type="date" name="ate" defaultValue={sp.ate ?? ""} aria-label="Até" />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Filtrar
          </Button>
          {hasFilters && (
            <Button asChild variant="ghost">
              <Link href="/admin/atividades">Limpar</Link>
            </Button>
          )}
        </div>
      </form>

      {logs.length === 0 ? (
        <EmptyState icon={<History />} title="Nenhuma atividade encontrada" description="Ajuste os filtros para ver outros registros." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Data</TH>
                <TH>Usuário</TH>
                <TH>Descrição</TH>
                <TH className="hidden md:table-cell">Módulo</TH>
                <TH className="hidden lg:table-cell">IP</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</TD>
                  <TD className="whitespace-nowrap text-sm font-medium">{l.user?.name ?? <span className="text-muted-foreground">Sistema</span>}</TD>
                  <TD>
                    <p className="text-sm">{l.summary}</p>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-inset ${actionTone(l.action)}`}>{l.action}</span>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <Badge variant="outline">{ENTITY_LABELS[l.entity] ?? l.entity}</Badge>
                  </TD>
                  <TD className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{l.ip ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
      <div className="mt-4">
        <Pagination page={page} pages={pages} total={total} basePath="/admin/atividades" params={sp} />
      </div>
    </>
  );
}
