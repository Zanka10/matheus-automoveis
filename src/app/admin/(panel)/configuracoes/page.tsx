import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { requirePermission } from "@/server/auth/session";
import { getSiteSettings } from "@/server/services/settings";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const s = await getSiteSettings();
  return (
    <>
      <PageHeader title="Configurações gerais" description="Dados da loja exibidos no site: contatos, endereço, redes sociais e WhatsApp." />
      <SettingsForm
        initial={{
          storeName: s.storeName,
          tagline: s.tagline ?? "",
          whatsapp: s.whatsapp ?? "",
          phone: s.phone ?? "",
          email: s.email ?? "",
          address: s.address ?? "",
          city: s.city ?? "",
          mapsUrl: s.mapsUrl ?? "",
          businessHours: s.businessHours ?? "",
          instagram: s.instagram ?? "",
          facebook: s.facebook ?? "",
          youtube: s.youtube ?? "",
          cnpj: s.cnpj ?? "",
          whatsappMessage: s.whatsappMessage ?? "",
        }}
      />
    </>
  );
}
