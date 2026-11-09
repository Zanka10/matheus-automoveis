import Link from "next/link";
import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VehicleNotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center pt-[72px] text-center">
      <div className="grid size-16 place-items-center rounded-full bg-muted">
        <CarFront className="size-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">Este veículo não está mais disponível</h1>
      <p className="mt-2 max-w-md text-muted-foreground">Ele pode ter sido vendido ou retirado do site. Confira outras opções no nosso estoque.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand">
          <Link href="/veiculos">Ver veículos disponíveis</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/orcamento">Pedir um veículo</Link>
        </Button>
      </div>
    </div>
  );
}
