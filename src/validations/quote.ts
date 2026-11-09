import { z } from "zod";
import { birthDateSchema, cpfBR, idSchema, optionalInt, optionalText, phoneBR } from "./common";

export const QUOTE_STATUS_VALUES = [
  "NEW",
  "IN_PROGRESS",
  "AWAITING_RETURN",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "FINISHED",
  "CANCELED",
] as const;

/** Formulário público de solicitação de orçamento */
export const quoteRequestSchema = z
  .object({
    name: z.string().trim().min(3, "Informe seu nome completo").max(120),
    phone: phoneBR,
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(160),
    cpf: cpfBR,
    birthDate: birthDateSchema,
    vehicleId: z.string().max(40).optional().nullable().transform((v) => v || null),
    message: optionalText(2000),
    wantsFinancing: z.boolean().default(false),
    hasTradeIn: z.boolean().default(false),
    tradeInBrand: optionalText(60),
    tradeInModel: optionalText(80),
    tradeInYear: optionalInt(1950, new Date().getFullYear() + 1),
    tradeInMileage: optionalInt(0, 2_000_000),
    tradeInNotes: optionalText(1000),
    source: z.enum(["FORM", "INTEREST", "WHATSAPP"]).default("FORM"),
    consent: z.literal(true, { error: "É necessário autorizar o contato" }),
    /** Honeypot anti-spam: deve permanecer vazio */
    website: z.string().max(0).optional(),
  })
  .refine((d) => !d.hasTradeIn || (d.tradeInBrand && d.tradeInModel), {
    path: ["tradeInModel"],
    message: "Informe marca e modelo do veículo para troca",
  });

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;

export const quoteStatusUpdateSchema = z.object({
  quoteId: idSchema,
  status: z.enum(QUOTE_STATUS_VALUES),
  note: optionalText(2000),
  convertedToSale: z.boolean().optional(),
});

export const quoteNoteSchema = z.object({
  quoteId: idSchema,
  note: z.string().trim().min(1, "Escreva a observação").max(2000),
  type: z.enum(["NOTE", "CONTACT"]).default("NOTE"),
});

export const quoteAssignSchema = z.object({
  quoteId: idSchema,
  userId: z.string().max(40).nullable(),
});
