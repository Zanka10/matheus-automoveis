"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CarImage } from "./car-image";

type Img = { id: string; url: string };

export function VehicleGallery({ images, title, badges }: { images: Img[]; title: string; badges?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const go = useCallback((i: number) => count && setIndex(((i % count) + count) % count), [count]);
  const touchX = useRef<number | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, index, go]);

  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      touchX.current = null;
    },
  };

  if (!count) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted">
        <CarImage src={null} alt={title} />
      </div>
    );
  }

  const current = images[index];

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted" {...swipe}>
        <button type="button" onClick={() => setOpen(true)} className="absolute inset-0 z-[1] cursor-zoom-in" aria-label="Ampliar imagem" />
        {images.map((img, i) => (
          <CarImage
            key={img.id}
            src={img.url}
            alt={`${title} — foto ${i + 1} de ${count}`}
            fill
            priority={i === 0}
            sizes="(min-width:1024px) 66vw, 100vw"
            className={cn("object-cover transition-opacity duration-500", i === index ? "opacity-100" : "opacity-0")}
          />
        ))}
        {badges && <div className="absolute left-4 top-4 z-[2] flex flex-wrap gap-2">{badges}</div>}
        <span className="pointer-events-none absolute bottom-4 left-4 z-[2] rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {index + 1} / {count}
        </span>
        <span className="pointer-events-none absolute bottom-4 right-4 z-[2] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-graphite opacity-0 shadow transition group-hover:opacity-100">
          <Expand className="size-3.5" /> Ampliar
        </span>
        {count > 1 && (
          <>
            <NavButton side="left" onClick={() => go(index - 1)} />
            <NavButton side="right" onClick={() => go(index + 1)} />
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={thumbs} className="scrollbar-none mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              data-i={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-background transition sm:w-28",
                i === index ? "ring-brand" : "ring-transparent opacity-70 hover:opacity-100",
              )}
            >
              <CarImage src={img.url} alt="" fill sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Galeria de fotos — ${title}`} className="fixed inset-0 z-[60] flex flex-col bg-black/95 animate-in fade-in-0" {...swipe}>
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <p className="truncate pr-4 text-sm text-white/70">
              {title} · {index + 1}/{count}
            </p>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar galeria" autoFocus>
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <CarImage key={current.id} src={current.url} alt={`${title} — foto ${index + 1}`} fill sizes="100vw" className="object-contain animate-in fade-in-0" />
            {count > 1 && (
              <>
                <NavButton side="left" onClick={() => go(index - 1)} large />
                <NavButton side="right" onClick={() => go(index + 1)} large />
              </>
            )}
          </div>
          <div className="scrollbar-none flex justify-center gap-2 overflow-x-auto px-4 py-4">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={cn("relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition", i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")}
              >
                <CarImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ side, onClick, large }: { side: "left" | "right"; onClick: () => void; large?: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "Foto anterior" : "Próxima foto"}
      className={cn(
        "absolute top-1/2 z-[2] grid -translate-y-1/2 place-items-center rounded-full transition",
        side === "left" ? "left-3 sm:left-4" : "right-3 sm:right-4",
        large ? "size-12 bg-white/10 text-white hover:bg-white/20" : "size-10 bg-white/90 text-graphite shadow-md opacity-0 group-hover:opacity-100 max-sm:opacity-100",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
