"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/veiculos?ofertas=1", label: "Ofertas" },
  { href: "/sobre", label: "A loja" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader({ phone, phoneHref }: { phone?: string | null; phoneHref?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]) && !href.includes("?"));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        overHero ? "bg-transparent" : "border-b border-border/60 bg-background/85 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur-xl",
      )}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Logo tone={overHero ? "light" : "dark"} />
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                overHero ? "text-white/85 hover:text-white" : "text-foreground/70 hover:text-foreground",
                isActive(item.href) && (overHero ? "text-white" : "text-foreground"),
              )}
            >
              {item.label}
              {isActive(item.href) && <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-brand" />}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {phone && phoneHref && (
            <a
              href={phoneHref}
              className={cn("flex items-center gap-2 text-sm font-medium", overHero ? "text-white/85 hover:text-white" : "text-foreground/70 hover:text-foreground")}
            >
              <Phone className="size-4" />
              {phone}
            </a>
          )}
          <Button asChild variant="brand" className="rounded-full px-5">
            <Link href="/orcamento">Solicitar orçamento</Link>
          </Button>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn("-mr-2 rounded-lg p-2 lg:hidden", overHero ? "text-white" : "text-foreground")}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-[72px] bg-background transition-all duration-300 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav aria-label="Menu mobile" className="container-page flex h-full flex-col gap-1 py-6">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
              className={cn(
                "border-b border-border/60 py-4 font-display text-2xl font-bold transition-all duration-300",
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-auto flex flex-col gap-3 pb-6">
            {phone && phoneHref && (
              <Button asChild variant="outline" size="lg">
                <a href={phoneHref}>
                  <Phone /> {phone}
                </a>
              </Button>
            )}
            <Button asChild variant="brand" size="lg">
              <Link href="/orcamento">Solicitar orçamento</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
