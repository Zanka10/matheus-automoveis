"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "./icons";

export function WhatsAppFab({ href }: { href: string | null }) {
  const pathname = usePathname();
  if (!href || pathname.startsWith("/veiculos/")) return null; // a página do veículo tem a sua própria barra de ação
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar pelo WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.65)] transition-all duration-300 hover:scale-105 sm:bottom-7 sm:right-7"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-25 [animation-duration:2.5s]" />
      <WhatsAppIcon className="size-7" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-40 group-hover:pr-1 sm:inline">
        Fale conosco
      </span>
    </a>
  );
}
