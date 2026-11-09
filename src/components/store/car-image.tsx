import Image, { type ImageProps } from "next/image";
import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

/** next/image com fallback elegante e suporte a uploads locais (/media) */
export function CarImage({
  src,
  alt,
  className,
  ...props
}: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  if (!src) {
    return (
      <div className={cn("absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-secondary text-muted-foreground/50", className)}>
        <CarFront className="size-12" strokeWidth={1.2} />
      </div>
    );
  }
  return <Image src={src} alt={alt} unoptimized={src.startsWith("/media/")} className={className} {...props} />;
}
