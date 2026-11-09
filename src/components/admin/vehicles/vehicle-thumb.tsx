import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

export function VehicleThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-muted", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src.includes("images.unsplash.com") ? src.replace(/w=\d+/, "w=320") : src} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <CarFront className="size-5" />
        </div>
      )}
    </div>
  );
}
