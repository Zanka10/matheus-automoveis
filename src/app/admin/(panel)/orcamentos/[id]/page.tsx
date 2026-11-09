import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { QuoteEventType } from "@prisma/client";
import { ArrowLeftRight, CalendarClock, CircleDot, Landmark, MessageSquareText, PhoneCall, Sparkles, StickyNote, UserCheck } from "lucide-react";
import { PageHeader, StatusPill } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeleteQuoteButton,
  QuoteAssign,
  QuoteContactButtons,
  QuoteNoteForm,
  QuoteStatusForm,
} from "@/components/admin/quotes/quote-actions";
import { formatCpf, formatDateOnly, formatDateTime, formatKm, formatPhone, formatPrice, relativeTime } from "@/lib/format";
import { quoteSourceLabels, quoteStatusLabels, quoteStatusTone, vehicleStatusLabels, vehicleStatusTone } from "@/lib/labels";
import { toNumber } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { getQuoteForUser, listAssignableUsers } from "@/server/services/quotes-admin";
import { getSiteSettings } from "@/server/services/settings";

export const metadata = { title: "Orçamento" };

const EVENT_META: Record<QuoteEventType, { label: string; icon: typeof CircleDot; tone: string }> = {
  CREATED: { label: "Solicitação recebida", icon: Sparkles, tone: "bg-sky-100 text-sky-700" },
  STATUS_CHANGED: { label: "Status alterado", icon: CircleDot, tone: "bg-indigo-100 text-indigo-700" },
  NOTE: { label: "Observação interna", icon: StickyNote, tone: "bg-amber-100 text-amber-700" },
  ASSIGNED: { label: "Responsável", icon: UserCheck, tone: "bg-violet-100 text-violet-700" },
  CONTACT: { label: "Contato com o cliente", icon: PhoneCall, tone: "bg-emerald-100 text-emerald-700" },
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user, "quotes.view") && !can(user, "quotes.viewAll")) redirect("/admin/acesso-negado");
  const { id } = await params;
  const quote = await getQuoteForUser(user, id.slice(0, 40));
  if (!quote) notFound();

  const canManage = can(user, "quotes.manage");
  const canAssign = can(user, "quotes.assign");
  const [users, settings] = await Promise.all([canAssign ? listAssignableUsers() : Promise.resolve([]), getSiteSettings()]);

  const firstName = quote.name.split(" ")[0];
  const vehicleName = quote.vehicle
    ? `${quote.vehicle.brand.name} ${quote.vehicle.model.name} ${quote.vehicle.version}`
    : quote.vehicleLabel;
  const waMessage = `Olá, ${firstName}! Aqui é ${user.name.split(" ")[0]}, da ${settings.storeName}. Recebemos sua solicitação de orçamento${
    vehicleName ? ` para o ${vehicleName}` : ""
  } (protocolo ${quote.protocol}). Podemos conversar?`;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orcamentos", label: "Orçamentos" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {quote.name}
            <StatusPill tone={quoteStatusTone[quote.status]}>{quoteStatusLabels[quote.status]}</StatusPill>
          </span>
        }
        description={
          <>
            Protocolo <span className="font-mono font-medium text-foreground">{quote.protocol}</span> · recebido {relativeTime(quote.createdAt)} via{" "}
            {quoteSourceLabels[quote.source].toLowerCase()}
          </>
        }
        actions={can(user, "quotes.delete") ? <DeleteQuoteButton quoteId={quote.id} protocol={quote.protocol} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Info label="Nome completo" value={quote.name} />
              <Info label="Telefone / WhatsApp" value={formatPhone(quote.phone)} />
              <Info label="E-mail" value={<a href={`mailto:${quote.email}`} className="text-brand hover:underline">{quote.email}</a>} />
              <Info label="CPF" value={formatCpf(quote.cpf)} />
              <Info label="Data de nascimento" value={formatDateOnly(quote.birthDate)} />
              <Info label="Data da solicitação"value={formatDateTime(quote.createdAt)} />
              <Info
                label="Financiamento"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="size-4 text-muted-foreground" />
                    {quote.wantsFinancing ? "Tem interesse em financiar" : "Não informado / à vista"}
                  </span>
                }
              />
              <Info label="Consentimento LGPD" value={quote.consentAt ? `Autorizado em ${formatDateTime(quote.consentAt)}` : "—"} />
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mensagem</p>
                <p className="mt-1.5 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                  {quote.message || <span className="text-muted-foreground">Sem mensagem adicional.</span>}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Veículo de interesse</CardTitle>
            </CardHeader>
            <CardContent>
              {quote.vehicle ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted sm:w-40">
                    {quote.vehicle.images[0] && (
                      <Image src={quote.vehicle.images[0].url} alt={vehicleName ?? ""} fill sizes="160px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{vehicleName}</p>
                    <p className="text-sm text-muted-foreground">
                      {quote.vehicle.manufactureYear}/{quote.vehicle.modelYear} · Cód. {quote.vehicle.internalCode}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{formatPrice(toNumber(quote.vehicle.promoPrice ?? quote.vehicle.price))}</span>
                      <StatusPill tone={vehicleStatusTone[quote.vehicle.status]}>{vehicleStatusLabels[quote.vehicle.status]}</StatusPill>
                      {!quote.vehicle.published && <span className="text-xs text-muted-foreground">Fora do site</span>}
                    </div>
                  </div>
                  {can(user, "vehicles.view") && (
                    <Link href={`/admin/veiculos/${quote.vehicle.id}`} className="text-sm font-medium text-brand hover:underline">
                      Ver cadastro →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{quote.vehicleLabel ?? "O cliente não selecionou um veículo específico."}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="size-4" /> Veículo para troca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.hasTradeIn ? (
                <div className="grid gap-5 sm:grid-cols-4">
                  <Info label="Marca" value={quote.tradeInBrand ?? "—"} />
                  <Info label="Modelo" value={quote.tradeInModel ?? "—"} />
                  <Info label="Ano" value={quote.tradeInYear ?? "—"} />
                  <Info label="Quilometragem" value={quote.tradeInMileage != null ? formatKm(quote.tradeInMileage) : "—"} />
                  {quote.tradeInNotes && (
                    <div className="sm:col-span-4">
                      <Info label="Observações" value={<span className="whitespace-pre-line">{quote.tradeInNotes}</span>} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">O cliente não possui veículo para troca.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-4" /> Histórico de atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {canManage && <QuoteNoteForm quoteId={quote.id} />}
              <ol className="relative flex flex-col gap-5 border-l pl-6">
                {quote.events.map((e) => {
                  const meta = EVENT_META[e.type];
                  const Icon = meta.icon;
                  return (
                    <li key={e.id} className="relative">
                      <span className={`absolute -left-[37px] top-0 grid size-7 place-items-center rounded-full ring-4 ring-card ${meta.tone}`}>
                        <Icon className="size-3.5" />
                      </span>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-medium">
                          {e.type === "STATUS_CHANGED" && e.toStatus
                            ? `${e.fromStatus ? quoteStatusLabels[e.fromStatus] + " → " : ""}${quoteStatusLabels[e.toStatus]}`
                            : meta.label}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {e.user?.name ?? "Sistema"} · {formatDateTime(e.createdAt)}
                        </span>
                      </div>
                      {e.note && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{e.note}</p>}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Contato rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteContactButtons
                quoteId={quote.id}
                whatsappHref={whatsappLink(quote.phone, waMessage)}
                email={quote.email}
                subject={`${settings.storeName} — Orçamento ${quote.protocol}`}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                {quote.assignedTo ? (
                  <span className="font-medium">{quote.assignedTo.name}</span>
                ) : (
                  <span className="text-muted-foreground">Nenhum funcionário responsável.</span>
                )}
              </p>
              {canManage && (
                <QuoteAssign
                  quoteId={quote.id}
                  assignedToId={quote.assignedTo?.id ?? null}
                  currentUserId={user.id}
                  canAssign={canAssign}
                  users={users.map((u) => ({ id: u.id, name: u.name }))}
                />
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteStatusForm quoteId={quote.id} status={quote.status} converted={quote.convertedToSale} />
                {quote.closedAt && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" /> Encerrado em {formatDateTime(quote.closedAt)}
                    {quote.convertedToSale && " · convertido em venda"}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm">{value}</div>
    </div>
  );
}
