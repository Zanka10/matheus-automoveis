import Link from "next/link";
import { ArrowRight, CarFront, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { CarImage } from "@/components/store/car-image";
import { HeroSearch } from "@/components/store/hero-search";
import { DynamicIcon, WhatsAppIcon } from "@/components/store/icons";
import { SectionHeading } from "@/components/store/section";
import { VehicleCard, VehicleGrid } from "@/components/store/vehicle-card";
import { formatPrice } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import {
  getActiveBanners,
  getFeaturedVehicles,
  getFilterOptions,
  getLatestVehicles,
  getOfferVehicles,
  getPublicStats,
  getTestimonials,
} from "@/server/services/catalog";
import { getSiteSettings } from "@/server/services/settings";

export const revalidate = 60;

export default async function HomePage() {
  const [settings, featured, latest, offers, banners, testimonials, options, stats] = await Promise.all([
    getSiteSettings(),
    getFeaturedVehicles(8),
    getLatestVehicles(8),
    getOfferVehicles(6),
    getActiveBanners(),
    getTestimonials(),
    getFilterOptions(),
    getPublicStats(),
  ]);

  const heroVehicle = featured[0] ?? latest[0];
  const heroImage = settings.heroImageUrl || heroVehicle?.image;
  const wa = whatsappLink(settings.whatsapp, settings.whatsappMessage ?? undefined);
  const rating = testimonials.length ? (testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length).toFixed(1).replace(".", ",") : "5,0";
  const aboutParagraphs = (settings.aboutText ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="relative isolate overflow-hidden bg-graphite">
        <div className="absolute inset-0 -z-10">
          <CarImage src={heroImage} alt="" fill priority sizes="100vw" className="object-cover object-center opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-graphite" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        </div>
        <div className="container-page flex min-h-[640px] flex-col justify-end pb-10 pt-32 sm:min-h-[720px] lg:min-h-[86vh] lg:pb-14">
          <div className="max-w-3xl animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" />
              {stats.available} veículos disponíveis · {stats.brands} marcas
            </p>
            <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              {settings.heroTitle ?? "O carro certo, com a confiança que você merece."}
            </h1>
            {settings.heroSubtitle && <p className="mt-5 max-w-xl text-base text-white/70 sm:text-lg">{settings.heroSubtitle}</p>}
          </div>

          {heroVehicle && (
            <Link
              href={`/veiculos/${heroVehicle.slug}`}
              className="group mt-8 hidden w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-2 pr-5 text-white backdrop-blur-md transition hover:bg-white/10 md:flex"
            >
              <span className="relative block h-14 w-20 overflow-hidden rounded-xl">
                <CarImage src={heroVehicle.image} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Em destaque</span>
                <span className="block font-semibold">
                  {heroVehicle.brand} {heroVehicle.model} · {formatPrice(heroVehicle.promoPrice ?? heroVehicle.price)}
                </span>
              </span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          <HeroSearch options={options} className="mt-8 animate-fade-up [animation-delay:150ms]" />

          {options.brands.length > 0 && (
            <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1">
              {options.brands.map((b) => (
                <Link
                  key={b.slug}
                  href={`/veiculos?marca=${b.slug}`}
                  className="shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 backdrop-blur transition hover:border-white hover:bg-white hover:text-graphite"
                >
                  {b.name} <span className="text-white/45">{b.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────────── Destaques ───────────── */}
      {featured.length > 0 && (
        <section className="container-page py-20 sm:py-24">
          <SectionHeading
            eyebrow="Seleção especial"
            title={settings.featuredTitle ?? "Destaques do estoque"}
            description="Veículos escolhidos a dedo pela nossa equipe, com procedência e estado de conservação exemplares."
            href="/veiculos"
          />
          <VehicleGrid vehicles={featured} />
        </section>
      )}

      {/* ───────────── Banners promocionais ───────────── */}
      {banners.length > 0 && (
        <section className="container-page pb-4">
          <BannerCarousel
            banners={banners.map((b) => ({
              id: b.id,
              title: b.title,
              subtitle: b.subtitle,
              imageUrl: b.imageUrl,
              ctaLabel: b.ctaLabel,
              href: b.ctaHref ?? (b.vehicle?.published ? `/veiculos/${b.vehicle.slug}` : null),
            }))}
          />
        </section>
      )}

      {/* ───────────── Ofertas ───────────── */}
      {offers.length > 0 && (
        <section className="relative mt-20 overflow-hidden bg-graphite py-20 sm:py-24">
          <div aria-hidden className="pointer-events-none absolute -left-32 top-0 size-[480px] rounded-full bg-brand/20 blur-[120px]" />
          <div className="container-page relative">
            <SectionHeading
              tone="light"
              eyebrow="Por tempo limitado"
              title={settings.offersTitle ?? "Oportunidades especiais"}
              description={settings.offersSubtitle}
              href="/veiculos?ofertas=1"
              hrefLabel="Ver todas as ofertas"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((v) => (
                <VehicleCard key={v.id} vehicle={v} className="border-white/10" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Novidades ───────────── */}
      {latest.length > 0 && (
        <section className="container-page py-20 sm:py-24">
          <SectionHeading
            eyebrow="Novidades"
            title={settings.latestTitle ?? "Acabaram de chegar"}
            description="As últimas entradas no nosso estoque. Os melhores carros costumam sair rápido."
            href="/veiculos?ordem=recentes"
            hrefLabel="Ver mais recentes"
          />
          <VehicleGrid vehicles={latest} />
        </section>
      )}

      {featured.length === 0 && latest.length === 0 && (
        <section className="container-page py-24 text-center">
          <CarFront className="mx-auto size-12 text-muted-foreground/50" strokeWidth={1.2} />
          <h2 className="mt-4 text-2xl font-bold">Nosso estoque está sendo renovado</h2>
          <p className="mt-2 text-muted-foreground">Fale com a nossa equipe e encontraremos o veículo ideal para você.</p>
          <Button asChild variant="brand" className="mt-6">
            <Link href="/orcamento">Solicitar atendimento</Link>
          </Button>
        </section>
      )}

      {/* ───────────── Institucional ───────────── */}
      <section className="border-y bg-card">
        <div className="container-page grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
              <CarImage
                src={settings.aboutImageUrl ?? heroImage}
                alt={`Showroom ${settings.storeName}`}
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 right-4 rounded-2xl bg-brand p-6 text-white shadow-xl sm:right-8">
              <p className="font-display text-4xl font-extrabold leading-none">100%</p>
              <p className="mt-1 text-sm text-white/80">veículos vistoriados</p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="A loja" title={settings.aboutTitle ?? `Conheça a ${settings.storeName}`} className="mb-6" />
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              {(aboutParagraphs.length ? aboutParagraphs : ["Paixão por carros e compromisso com a transparência em cada negociação."]).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t pt-8">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Em estoque</dt>
                <dd className="mt-1 font-display text-3xl font-extrabold">{stats.available}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Marcas</dt>
                <dd className="mt-1 font-display text-3xl font-extrabold">{stats.brands}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Avaliação</dt>
                <dd className="mt-1 flex items-center gap-1 font-display text-3xl font-extrabold">
                  {rating} <Star className="size-5 fill-amber-400 text-amber-400" />
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="lg" className="mt-10 rounded-full">
              <Link href="/sobre">
                Conheça nossa história <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────────── Diferenciais ───────────── */}
      {settings.differentials.length > 0 && (
        <section className="container-page py-20 sm:py-24">
          <SectionHeading align="center" eyebrow="Por que comprar conosco" title="Tranquilidade do primeiro contato à entrega das chaves" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {settings.differentials.map((d, i) => (
              <div
                key={d.title + i}
                className="group rounded-2xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_18px_40px_-20px_rgba(20,20,30,0.25)]"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <DynamicIcon name={d.icon} className="size-6" />
                </div>
                <h3 className="mt-6 text-lg font-bold">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────────── Depoimentos ───────────── */}
      {testimonials.length > 0 && (
        <section className="bg-secondary/60 py-20 sm:py-24">
          <div className="container-page">
            <SectionHeading align="center" eyebrow="Depoimentos" title="Quem compra, recomenda" />
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="relative flex flex-col rounded-2xl bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/70">
                  <Quote className="absolute right-6 top-6 size-8 text-brand/15" aria-hidden />
                  <div className="flex gap-0.5" aria-label={`${t.rating} de 5 estrelas`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={i < t.rating ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted"} aria-hidden />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-foreground/85">“{t.text}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t pt-5">
                    <span className="grid size-10 place-items-center rounded-full bg-graphite text-sm font-bold text-white">
                      {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[t.vehicle, t.city].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── CTA ───────────── */}
      <section className="container-page py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-14 text-white sm:px-14 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-black/15 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-balance text-3xl font-extrabold leading-tight sm:text-4xl">Não encontrou o que procura? A gente encontra para você.</h2>
              <p className="mt-3 max-w-xl text-white/80">
                Conte qual carro você deseja e nossa equipe busca as melhores opções — com avaliação do seu usado e simulação de financiamento.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button asChild size="lg" className="rounded-full bg-white text-graphite hover:bg-white/90">
                <Link href="/orcamento">Solicitar orçamento</Link>
              </Button>
              {wa && (
                <Button asChild size="lg" variant="whatsapp" className="rounded-full">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-5" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
