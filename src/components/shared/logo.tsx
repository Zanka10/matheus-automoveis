import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca da loja: monograma + nome. `tone="light"` para fundos escuros. */
export function Logo({
  href = "/",
  tone = "dark",
  className,
  name = "Matheus",
  suffix = "Automóveis",
}: {
  href?: string;
  tone?: "dark" | "light";
  className?: string;
  name?: string;
  suffix?: string;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${name} ${suffix} — início`}>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-lg bg-brand text-brand-foreground shadow-sm shadow-brand/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 18V7l8 7 8-7v11" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[17px] font-extrabold tracking-tight", tone === "light" ? "text-white" : "text-foreground")}>
          {name}
        </span>
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.28em]", tone === "light" ? "text-white/60" : "text-muted-foreground")}>
          {suffix}
        </span>
      </span>
    </Link>
  );
}
