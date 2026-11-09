import { z } from "zod";
import { idSchema, money, optionalInt, optionalMoney, optionalText, requiredText, stringList } from "./common";

const currentYear = new Date().getFullYear();

export const FUEL_VALUES = ["FLEX", "GASOLINE", "ETHANOL", "DIESEL", "HYBRID", "ELECTRIC", "GNV"] as const;
export const TRANSMISSION_VALUES = ["MANUAL", "AUTOMATIC", "CVT", "AUTOMATED", "DCT"] as const;
export const CONDITION_VALUES = ["NEW", "USED"] as const;
export const VEHICLE_STATUS_VALUES = ["AVAILABLE", "RESERVED", "SOLD"] as const;

export const vehicleSchema = z
  .object({
    // Informações principais
    brandId: idSchema.describe("Marca"),
    modelId: idSchema.describe("Modelo"),
    categoryId: z.string().optional().nullable().transform((v) => v || null),
    version: requiredText("a versão", 120),
    manufactureYear: z.coerce.number().int().min(1950, "Ano inválido").max(currentYear + 1, "Ano inválido"),
    modelYear: z.coerce.number().int().min(1950, "Ano inválido").max(currentYear + 2, "Ano inválido"),
    condition: z.enum(CONDITION_VALUES),
    mileage: z.coerce.number().int("Quilometragem inválida").min(0).max(2_000_000),
    plate: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .nullable()
      .transform((v) => (v ? v.replace(/[^A-Z0-9]/g, "") : null))
      .refine((v) => v === null || /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v), "Placa inválida (ex.: ABC1D23)"),
    internalCode: z
      .string()
      .trim()
      .max(30)
      .optional()
      .nullable()
      .transform((v) => (v ? v.toUpperCase() : null)),

    // Comercial
    price: money("o preço de venda"),
    promoPrice: optionalMoney,
    acceptsTrade: z.boolean().default(true),
    financingAvailable: z.boolean().default(true),
    status: z.enum(VEHICLE_STATUS_VALUES).default("AVAILABLE"),

    // Técnico
    engine: optionalText(60),
    power: optionalText(60),
    fuel: z.enum(FUEL_VALUES),
    transmission: z.enum(TRANSMISSION_VALUES),
    steering: optionalText(60),
    drivetrain: optionalText(60),
    doors: optionalInt(1, 6),
    seats: optionalInt(1, 60),
    color: optionalText(40),
    consumption: optionalText(80),
    features: stringList(120),

    // Descrição
    description: optionalText(6000),
    internalNotes: optionalText(4000),
    highlights: stringList(20),
    conservation: optionalText(2000),

    // Publicação
    published: z.boolean().default(false),
    featured: z.boolean().default(false),
    isOffer: z.boolean().default(false),
    offerLabel: optionalText(40),
  })
  .refine((d) => d.modelYear >= d.manufactureYear && d.modelYear <= d.manufactureYear + 1, {
    path: ["modelYear"],
    message: "Ano do modelo deve ser igual ou 1 ano após o de fabricação",
  })
  .refine((d) => d.promoPrice === null || d.promoPrice < d.price, {
    path: ["promoPrice"],
    message: "O preço promocional deve ser menor que o preço de venda",
  })
  .refine((d) => d.condition === "USED" || d.mileage <= 1000, {
    path: ["mileage"],
    message: "Veículos novos devem ter até 1.000 km",
  });

export type VehicleInput = z.input<typeof vehicleSchema>;
export type VehicleData = z.output<typeof vehicleSchema>;

export const vehicleStatusChangeSchema = z.object({
  vehicleId: idSchema,
  status: z.enum(VEHICLE_STATUS_VALUES),
  note: optionalText(500),
  soldPrice: optionalMoney,
  soldById: z.string().optional().nullable().transform((v) => v || null),
  quoteId: z.string().optional().nullable().transform((v) => v || null),
});

/** Filtros do catálogo público (vindos da URL) */
export const catalogFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  marca: z.string().max(80).optional().catch(undefined),
  modelo: z.string().max(80).optional().catch(undefined),
  categoria: z.string().max(80).optional().catch(undefined),
  anoMin: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  anoMax: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  precoMin: z.coerce.number().min(0).optional().catch(undefined),
  precoMax: z.coerce.number().min(0).optional().catch(undefined),
  kmMax: z.coerce.number().int().min(0).optional().catch(undefined),
  combustivel: z.enum(FUEL_VALUES).optional().catch(undefined),
  cambio: z.enum(TRANSMISSION_VALUES).optional().catch(undefined),
  condicao: z.enum(["novo", "seminovo"]).optional().catch(undefined),
  ofertas: z.enum(["1"]).optional().catch(undefined),
  ordem: z.enum(["recentes", "menor-preco", "maior-preco", "menor-km"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;
