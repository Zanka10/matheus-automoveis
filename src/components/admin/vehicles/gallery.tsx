"use client";

import { useState } from "react";
import { CarFront, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const sized = (url: string, w: number) => (url.includes("images.unsplash.com") ? url.replace(/w=\d+/, `w=${w}`) : url);

export function AdminGallery({ images, alt }: { images: { id: string; url: string }[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-xl border border-dashed bg-muted/50 text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-sm">
          <CarFront className="size-8" /> Nenhuma foto enviada
        </div>
      </div>
    );
  }
  const current = images[Math.min(index, images.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  return (
    <div className="flex flex-col gap-2">
      <div className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sized(current.url, 1400)} alt={alt} className="size-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                i === index ? "ring-brand" : "ring-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Ver foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(img.url, 240)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
