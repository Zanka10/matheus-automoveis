import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-graphite px-4 text-center text-white">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-brand/25 blur-[130px]" />
      <Logo tone="light" className="relative mb-14" />
      <p className="relative font-display text-[7rem] font-extrabold leading-none tracking-tighter text-white/10 sm:text-[10rem]">404</p>
      <h1 className="relative -mt-6 text-3xl font-extrabold sm:text-4xl">Página não encontrada</h1>
      <p className="relative mt-3 max-w-md text-white/60">O endereço pode ter mudado ou a página não existe mais.</p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand" size="lg" className="rounded-full">
          <Link href="/veiculos">Ver veículos</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
