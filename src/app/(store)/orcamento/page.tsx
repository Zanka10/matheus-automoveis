import type { Metadata } from "next";
import { Clock, FileCheck, Landmark, ShieldCheck } from "lucide-react";
import { PageIntro } from "@/components/store/page-intro";
import { QuoteForm } from "@/components/store/quote-form";
import { CarImage } from "@/components/store/car-image";
import { formatPrice } from "@/lib/format";
import { onlyDigits } from "@/lib/utils";
import { getQuoteSelectedVehicle, getQuoteVehicleOptions } from "@/server/services/catalog";
import { getSiteSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Solicitar orçamento",
  description: "Peça seu orçamento sem compromisso: simulação de financiamento e avaliação do seu usado na troca.",
};

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ veiculo?: string }> }) {
  const { veiculo } = await searchParams;
  const [vehicles, settings, selected] = await Promise.all([getQuoteVehicleOptions(), getSiteSettings(), getQuoteSelectedVehicle(veiculo)]);
  const wa = onlyDigits(settings.whatsapp);
  const whatsapp = wa ? (wa.length <= 11 ? `55${wa}` : wa) : null;

  return (
    <>
      <PageIntro
        eyebrow="Orçamento sem compromisso"
        title="Vamos encontrar a melhor condição para você"
        description="Preencha o formulário e um consultor retorna com proposta, simulação de financiamento e avaliação do seu usado."
        crumbs={[{ label: "Solicitar orçamento" }]}
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_360px] lg:py-16">
        <QuoteForm
          vehicles={selected && !vehicles.some((v) => v.id === selected.id) ? [{ id: selected.id, label: `${selected.title} ${selected.subtitle}` }, ...vehicles] : vehicles}
          defaultVehicleId={selected?.id ?? null}
          whatsapp={whatsapp}
        />
        <aside className="flex flex-col gap-5">
          {selected && (
            <div className="overflow-hidden rounded-3xl border bg-card">
              <div className="relative aspect-[16/10] bg-muted">
                <CarImage src={selected.image} alt={selected.title} fill sizes="360px" className="object-cover" />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Veículo selecionado</p>
                <p className="mt-1 font-display text-lg font-bold">{selected.title}</p>
                <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
                <p className="mt-3 font-display text-2xl font-extrabold">{formatPrice(selected.price)}</p>
              </div>
            </div>
          )}
          <div className="rounded-3xl bg-graphite p-6 text-white">
            <h2 className="text-lg font-bold">Como funciona</h2>
            <ol className="mt-5 space-y-5">
              {[
                { icon: Clock, title: "Retorno rápido", text: "Um consultor responde em horário comercial, geralmente em menos de 1 hora." },
                { icon: Landmark, title: "Simulação de financiamento", text: "Comparamos as melhores taxas entre os bancos parceiros." },
                { icon: FileCheck, title: "Proposta transparente", text: "Valores claros, sem taxas escondidas, com avaliação do seu usado." },
                { icon: ShieldCheck, title: "Seus dados protegidos", text: "Usados apenas para este atendimento, conforme a LGPD." },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm text-white/60">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
