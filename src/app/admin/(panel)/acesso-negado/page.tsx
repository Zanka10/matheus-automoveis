import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/page-header";

export const metadata = { title: "Acesso negado" };

export default function AccessDeniedPage() {
  return (
    <EmptyState
      className="mx-auto mt-10 max-w-lg"
      icon={<ShieldAlert />}
      title="Você não tem permissão para acessar esta área"
      description="Se precisar deste acesso, solicite ao administrador a liberação da permissão correspondente."
      action={
        <Button asChild variant="outline">
          <Link href="/admin">Voltar ao início</Link>
        </Button>
      }
    />
  );
}
