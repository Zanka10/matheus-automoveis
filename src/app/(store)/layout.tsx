import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { onlyDigits } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/services/settings";

export const revalidate = 60;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <SiteHeader phone={settings.phone} phoneHref={settings.phone ? `tel:+55${onlyDigits(settings.phone)}` : null} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
      <WhatsAppFab href={whatsappLink(settings.whatsapp, settings.whatsappMessage ?? undefined)} />
    </div>
  );
}
