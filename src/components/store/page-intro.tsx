import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Faixa de abertura escura das páginas internas (compensa o cabeçalho fixo) */
export function PageIntro({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: { href?: string; label: string }[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden bg-graphite pb-12 pt-[120px] text-white sm:pb-16", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-brand/25 blur-[120px]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_100%]" />
      <div className="container-page relative">
        {crumbs && (
          <nav aria-label="Trilha de navegação" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/55">
              <li><Link href="/" className="hover:text-white">Início</Link></li>
              {crumbs.map((c) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3" />
                  {c.href ? <Link href={c.href} className="hover:text-white">{c.label}</Link> : <span className="text-white/80">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-brand">{eyebrow}</p>}
        <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-base text-white/65 sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  );
}
