import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/store/icons";
import { PageIntro } from "@/components/store/page-intro";
import { formatPhone } from "@/lib/format";
import { onlyDigits } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/services/settings";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contato",
  description: "Endereço, telefone, WhatsApp e horário de atendimento da loja.",
};

export default async function ContactPage() {
  const s = await getSiteSettings();
  const wa = whatsappLink(s.whatsapp, s.whatsappMessage ?? undefined);
  const mapQuery = [s.address, s.city].filter(Boolean).join(", ");

  const cards = [
    wa && { icon: WhatsAppIcon, title: "WhatsApp", value: formatPhone(s.whatsapp), href: wa, external: true, cta: "Iniciar conversa" },
    s.phone && { icon: Phone, title: "Telefone", value: s.phone, href: `tel:+55${onlyDigits(s.phone)}`, cta: "Ligar agora" },
    s.email && { icon: Mail, title: "E-mail", value: s.email, href: `mailto:${s.email}`, cta: "Enviar e-mail" },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; title: string; value: string; href: string; external?: boolean; cta: string }[];

  return (
    <>
      <PageIntro eyebrow="Contato" title="Fale com a nossa equipe" description="Atendimento consultivo por WhatsApp, telefone, e-mail ou pessoalmente no nosso showroom." crumbs={[{ label: "Contato" }]} />

      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, value, href, external, cta }) => (
            <a
              key={title}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <p className="mt-5 text-sm text-muted-foreground">{title}</p>
              <p className="mt-0.5 break-all font-display text-lg font-bold">{value}</p>
              <p className="mt-4 text-sm font-semibold text-brand">{cta} →</p>
            </a>
          ))}
        </div>

        <div className="mt-10 grid overflow-hidden rounded-3xl border bg-card lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-6 p-7 sm:p-10">
            <h2 className="text-2xl font-extrabold">Visite nosso showroom</h2>
            {s.address && (
              <div className="flex gap-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand" />
                <p>
                  {s.address}
                  {s.city && <><br /><span className="text-muted-foreground">{s.city}</span></>}
                </p>
              </div>
            )}
            {s.businessHours && (
              <div className="flex gap-4">
                <Clock className="mt-0.5 size-5 shrink-0 text-brand" />
                <p className="whitespace-pre-line">{s.businessHours}</p>
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-3">
              {(s.mapsUrl || mapQuery) && (
                <Button asChild variant="default" className="rounded-full">
                  <a href={s.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer">
                    <Navigation /> Como chegar
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/orcamento">Solicitar orçamento</Link>
              </Button>
            </div>
          </div>
          {mapQuery && (
            <iframe
              title={`Mapa — ${s.storeName}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              className="h-80 w-full border-0 grayscale-[0.4] lg:h-full lg:min-h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      </div>
    </>
  );
}
