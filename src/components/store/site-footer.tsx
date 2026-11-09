import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { formatPhone } from "@/lib/format";
import { onlyDigits } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import type { SiteSettingsData } from "@/server/services/settings";
import { FacebookIcon, InstagramIcon, WhatsAppIcon, YoutubeIcon } from "./icons";

export function SiteFooter({ settings: s }: { settings: SiteSettingsData }) {
  const wa = whatsappLink(s.whatsapp, s.whatsappMessage ?? undefined);
  const socials = [
    { href: s.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: s.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: s.youtube, label: "YouTube", Icon: YoutubeIcon },
  ].filter((x) => x.href);

  return (
    <footer className="bg-graphite text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            {s.tagline ?? "Veículos selecionados, procedência garantida e atendimento consultivo."}
          </p>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-brand hover:bg-brand hover:text-white"
                >
                  <Icon className="size-[18px]" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Navegação</h3>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            <li><Link className="hover:text-white" href="/veiculos">Todos os veículos</Link></li>
            <li><Link className="hover:text-white" href="/veiculos?condicao=seminovo">Seminovos</Link></li>
            <li><Link className="hover:text-white" href="/veiculos?condicao=novo">0 km</Link></li>
            <li><Link className="hover:text-white" href="/veiculos?ofertas=1">Ofertas</Link></li>
            <li><Link className="hover:text-white" href="/orcamento">Solicitar orçamento</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Empresa</h3>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            <li><Link className="hover:text-white" href="/sobre">Sobre a loja</Link></li>
            <li><Link className="hover:text-white" href="/contato">Contato e localização</Link></li>
            <li><Link className="hover:text-white" href="/orcamento">Venda seu carro</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Atendimento</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/75">
            {s.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>
                  {s.address}
                  {s.city && <><br />{s.city}</>}
                </span>
              </li>
            )}
            {s.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={`tel:+55${onlyDigits(s.phone)}`} className="hover:text-white">{s.phone}</a>
              </li>
            )}
            {wa && (
              <li className="flex gap-3">
                <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-white">{formatPhone(s.whatsapp)}</a>
              </li>
            )}
            {s.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={`mailto:${s.email}`} className="break-all hover:text-white">{s.email}</a>
              </li>
            )}
            {s.businessHours && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>{s.businessHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {s.storeName}. Todos os direitos reservados.
            {s.cnpj && <> · CNPJ {s.cnpj}</>}
          </p>
          <p>Imagens meramente ilustrativas. Preços e condições sujeitos a alteração sem aviso prévio.</p>
        </div>
      </div>
    </footer>
  );
}
