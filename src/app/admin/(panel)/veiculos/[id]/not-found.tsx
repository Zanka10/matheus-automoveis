import Link from "next/link";
import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/page-header";

export default function VehicleNotFound() {
  return (
    <EmptyState
      className="mx-auto mt-10 max-w-lg"
      icon={<CarFront />}
      title="Veículo não encontrado"
      description="O cadastro pode ter sido excluído ou o endereço está incorreto."
      action={
        <Button asChild variant="outline">
          <Link href="/admin/veiculos">Voltar para veículos</Link>
        </Button>
      }
    />
  );
}
