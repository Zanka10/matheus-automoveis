import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acesso restrito", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; expired?: string; senha?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-graphite lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=70)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/60 to-graphite/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo tone="light" href="/" />
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand">Painel de gestão</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">Toda a operação da loja em um só lugar.</h1>
            <p className="mt-4 text-white/70">Estoque, publicações, orçamentos e equipe — com segurança e controle de acesso por perfil.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo href="/" />
          </div>
          <h2 className="text-2xl font-bold">Entrar no painel</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Acesso exclusivo para funcionários autorizados.</p>
          {sp.expired && (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Sua sessão expirou ou foi encerrada. Entre novamente.
            </p>
          )}
          {sp.senha && (
            <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Senha alterada com sucesso. Entre com a nova senha.
            </p>
          )}
          <LoginForm callbackUrl={sp.callbackUrl} />
        </div>
      </section>
    </main>
  );
}
