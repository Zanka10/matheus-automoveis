import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarImage } from "@/components/store/car-image";
import { DynamicIcon } from "@/components/store/icons";
import { PageIntro } from "@/components/store/page-intro";
import { SectionHeading } from "@/components/store/section";
import { getPublicStats, getTestimonials } from "@/server/services/catalog";
import { getSiteSettings } from "@/server/services/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return { title: "Sobre a loja", description: s.aboutTitle ?? `Conheça a ${s.storeName}.` };
}

export default async function AboutPage() {
  const [s, stats, testimonials] = await Promise.all([getSiteSettings(), getPublicStats(), getTestimonials()]);
  const paragraphs = (s.aboutText ?? "").split(/\n{2,}/).filter(Boolean);
  const avg = testimonials.length ? (testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length).toFixed(1).replace(".", ",") : null;

  return (
    <>
      <PageIntro eyebrow="A loja" title={s.aboutTitle ?? `Conheça a ${s.storeName}`} description={s.tagline ?? undefined} crumbs={[{ label: "A loja" }]} />

      <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div className="space-y-5 text-lg leading-relaxed text-foreground/80">
          {(paragraphs.length ? paragraphs : ["Paixão por carros e compromisso com a transparência em cada negociação."]).map((p, i) => (
            <p key={i} className={i === 0 ? "font-display text-2xl font-semibold leading-snug text-foreground" : ""}>
              {p}
            </p>
          ))}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button asChild variant="brand" size="lg" className="rounded-full">
              <Link href="/veiculos">
                Ver estoque <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/contato">Visite a loja</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
          <CarImage src={s.aboutImageUrl ?? s.heroImageUrl} alt={`Showroom ${s.storeName}`} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="border-y bg-card">
        <dl className="container-page grid grid-cols-2 gap-8 py-12 text-center md:grid-cols-4">
          {[
            { label: "Veículos em estoque", value: stats.available },
            { label: "Marcas disponíveis", value: stats.brands },
            { label: "Vistoria cautelar", value: "100%" },
            { label: "Avaliação dos clientes", value: avg ?? "—" },
          ].map((item) => (
            <div key={item.label}>
              <dd className="font-display text-4xl font-extrabold text-foreground">{item.value}</dd>
              <dt className="mt-1 text-sm text-muted-foreground">{item.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {s.differentials.length > 0 && (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading align="center" eyebrow="Nossos diferenciais" title="O que torna a experiência diferente" />
          <div className="grid gap-5 sm:grid-cols-2">
            {s.differentials.map((d, i) => (
              <div key={d.title + i} className="flex gap-5 rounded-2xl border bg-card p-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-white">
                  <DynamicIcon name={d.icon} className="size-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{d.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
