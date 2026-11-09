"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center pt-[72px] text-center">
      <div className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">Algo não saiu como esperado</h1>
      <p className="mt-2 max-w-md text-muted-foreground">Não conseguimos carregar esta página agora. Tente novamente em instantes.</p>
      <div className="mt-8 flex gap-3">
        <Button variant="brand" onClick={reset}>
          <RefreshCw /> Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </div>
  );
}
