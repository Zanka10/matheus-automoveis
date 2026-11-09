import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type Differential = { title: string; description: string; icon: string };

export const DEFAULT_DIFFERENTIALS: Differential[] = [
  { title: "Procedência garantida", description: "Todos os veículos passam por vistoria cautelar e checagem documental completa.", icon: "ShieldCheck" },
  { title: "Revisados e com garantia", description: "Inspeção mecânica de 120 itens e garantia de motor e câmbio.", icon: "Wrench" },
  { title: "Financiamento facilitado", description: "Parceria com os principais bancos e aprovação em poucos minutos.", icon: "Landmark" },
  { title: "Avaliação justa na troca", description: "Seu usado avaliado pela tabela de mercado, com pagamento imediato.", icon: "Repeat" },
];

/** Configurações e textos institucionais — registro único criado sob demanda */
export const getSiteSettings = cache(async () => {
  const settings =
    (await prisma.siteSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.siteSettings.create({ data: { id: "default" } }));
  const differentials = Array.isArray(settings.differentials)
    ? (settings.differentials as Differential[])
    : DEFAULT_DIFFERENTIALS;
  return { ...settings, differentials };
});

export type SiteSettingsData = Awaited<ReturnType<typeof getSiteSettings>>;
