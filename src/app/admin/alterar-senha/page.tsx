import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { requireUser } from "@/server/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Alterar senha", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <Logo href="/admin" />
        <h1 className="mt-8 text-xl font-bold">Alterar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.mustChangePassword
            ? "Por segurança, defina uma nova senha antes de continuar."
            : "Após a alteração, todas as sessões abertas serão encerradas."}
        </p>
        <ChangePasswordForm />
        {!user.mustChangePassword && (
          <Link href="/admin" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
            Voltar ao painel
          </Link>
        )}
      </div>
    </main>
  );
}
