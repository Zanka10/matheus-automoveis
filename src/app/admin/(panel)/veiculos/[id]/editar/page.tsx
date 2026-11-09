import { notFound } from "next/navigation";
import { PageHeader, StatusPill } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicles/vehicle-form";
import { ImageManager } from "@/components/admin/vehicles/image-manager";
import { vehicleToDefaults } from "@/components/admin/vehicles/form-defaults";
import { vehicleStatusLabels, vehicleStatusTone } from "@/lib/labels";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getVehicleFormOptions, getVehicleFull } from "@/server/services/vehicles-admin";

export const metadata = { title: "Editar veículo" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("vehicles.edit");
  const { id } = await params;
  const [vehicle, options] = await Promise.all([getVehicleFull(id), getVehicleFormOptions()]);
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader
        title={`${vehicle.brand.name} ${vehicle.model.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{vehicle.internalCode}</span>
            <span>·</span>
            <span>{vehicle.version}</span>
            <StatusPill tone={vehicleStatusTone[vehicle.status]}>{vehicleStatusLabels[vehicle.status]}</StatusPill>
          </span>
        }
        back={{ href: `/admin/veiculos/${vehicle.id}`, label: "Detalhes do veículo" }}
      />
      <VehicleForm
        mode="edit"
        vehicleId={vehicle.id}
        defaultValues={vehicleToDefaults(vehicle)}
        options={options}
        canPublish={can(user, "vehicles.publish")}
        canStock={can(user, "vehicles.stock")}
        imageCount={vehicle.images.length}
        imagesSlot={
          <ImageManager vehicleId={vehicle.id} initialImages={vehicle.images.map((i) => ({ id: i.id, url: i.url, order: i.order }))} />
        }
      />
    </>
  );
}
