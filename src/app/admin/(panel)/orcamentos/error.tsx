"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/page-header";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      className="mt-6"
      icon={<AlertTriangle />}
      title="Não foi possível carregar os orçamentos"
      description="Ocorreu um erro inesperado. Tente novamente em instantes."
      action={<Button onClick={reset}>Tentar novamente</Button>}
    />
  );
}
