"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CarImage } from "./car-image";

export type BannerData = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  href: string | null;
};

export function BannerCarousel({ banners }: { banners: BannerData[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-graphite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
      aria-label="Promoções"
    >
      <div className="relative aspect-[16/10] sm:aspect-[21/8]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${count}`}
            aria-hidden={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <CarImage src={b.imageUrl} alt={b.title} fill sizes="(min-width:1280px) 1200px, 100vw" className={cn("object-cover transition-transform duration-[7000ms] ease-out", i === index ? "scale-105" : "scale-100")} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 sm:items-center sm:p-12 lg:p-16">
              <div className="max-w-lg text-white">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Condição especial</p>
                <h3 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{b.title}</h3>
                {b.subtitle && <p className="mt-3 text-sm text-white/75 sm:text-base">{b.subtitle}</p>}
                {b.href && (
                  <Link
                    href={b.href}
                    tabIndex={i === index ? 0 : -1}
                    className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-graphite transition-colors hover:bg-brand hover:text-white"
                  >
                    {b.ctaLabel || "Saiba mais"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <div className="absolute bottom-5 right-5 flex gap-2 sm:bottom-8 sm:right-8">
            <button onClick={() => go(index - 1)} aria-label="Anterior" className="grid size-10 place-items-center rounded-full border border-white/25 text-white backdrop-blur transition hover:bg-white hover:text-graphite">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => go(index + 1)} aria-label="Próximo" className="grid size-10 place-items-center rounded-full border border-white/25 text-white backdrop-blur transition hover:bg-white hover:text-graphite">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="absolute left-6 top-6 flex gap-1.5 sm:left-12 sm:top-auto sm:bottom-8">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === index}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
