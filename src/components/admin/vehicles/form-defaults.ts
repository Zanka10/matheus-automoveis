import type { z } from "zod";
import type { vehicleSchema } from "@/validations/vehicle";
import type { VehicleFull } from "@/server/services/vehicles-admin";

type FormIn = z.input<typeof vehicleSchema>;

export function emptyVehicleDefaults(): FormIn {
  const year = new Date().getFullYear();
  return {
    brandId: "",
    modelId: "",
    categoryId: null,
    version: "",
    manufactureYear: year,
    modelYear: year,
    condition: "USED",
    mileage: "" as unknown as number,
    plate: "",
    internalCode: "",
    price: "",
    promoPrice: "",
    acceptsTrade: true,
    financingAvailable: true,
    status: "AVAILABLE",
    engine: "",
    power: "",
    fuel: "FLEX",
    transmission: "AUTOMATIC",
    steering: "Elétrica",
    drivetrain: "",
    doors: "",
    seats: "",
    color: "",
    consumption: "",
    features: [],
    description: "",
    internalNotes: "",
    highlights: [],
    conservation: "",
    published: false,
    featured: false,
    isOffer: false,
    offerLabel: "",
  };
}

export function vehicleToDefaults(v: VehicleFull): FormIn {
  return {
    brandId: v.brandId,
    modelId: v.modelId,
    categoryId: v.categoryId,
    version: v.version,
    manufactureYear: v.manufactureYear,
    modelYear: v.modelYear,
    condition: v.condition,
    mileage: v.mileage,
    plate: v.plate ?? "",
    internalCode: v.internalCode,
    price: v.price,
    promoPrice: v.promoPrice ?? "",
    acceptsTrade: v.acceptsTrade,
    financingAvailable: v.financingAvailable,
    status: v.status,
    engine: v.engine ?? "",
    power: v.power ?? "",
    fuel: v.fuel,
    transmission: v.transmission,
    steering: v.steering ?? "",
    drivetrain: v.drivetrain ?? "",
    doors: v.doors ?? "",
    seats: v.seats ?? "",
    color: v.color ?? "",
    consumption: v.consumption ?? "",
    features: v.features,
    description: v.description ?? "",
    internalNotes: v.internalNotes ?? "",
    highlights: v.highlights,
    conservation: v.conservation ?? "",
    published: v.published,
    featured: v.featured,
    isOffer: v.isOffer,
    offerLabel: v.offerLabel ?? "",
  };
}
