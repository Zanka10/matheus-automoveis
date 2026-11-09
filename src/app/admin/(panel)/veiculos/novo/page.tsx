import Link from "next/link";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicles/vehicle-form";
import { emptyVehicleDefaults } from "@/components/admin/vehicles/form-defaults";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getVehicleFormOptions } from "@/server/services/vehicles-admin";

export const metadata = { title: "Novo veículo" };

export default async function NewVehiclePage() {
  const user = await requirePermission("vehicles.create");
  const options = await getVehicleFormOptions();
  const back = { href: "/admin/veiculos", label: "Veículos" };

  if (!options.brands.some((b) => b.models.length > 0)) {
    return (
      <>
        <PageHeader title="Novo veículo" back={back} />
        <EmptyState
          icon={<Tags />}
          title="Cadastre marcas e modelos primeiro"
          description="O formulário de veículos utiliza as marcas e modelos cadastrados no painel."
          action={
            can(user, "brands.manage") && (
              <Button asChild variant="brand">
                <Link href="/admin/marcas">Ir para marcas e modelos</Link>
              </Button>
            )
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Novo veículo" description="Preencha a ficha completa. As fotos são enviadas na etapa seguinte." back={back} />
      <VehicleForm
        mode="create"
        defaultValues={emptyVehicleDefaults()}
        options={options}
        canPublish={can(user, "vehicles.publish")}
        canStock={can(user, "vehicles.stock")}
      />
    </>
  );
}
