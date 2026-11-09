import { z } from "zod";
import { ALL_PERMISSIONS } from "@/server/auth/permissions";
import { optionalInt, optionalText, requiredText } from "./common";
import { strongPassword } from "./auth";

// ───────────── Marcas, modelos e categorias ─────────────

export const brandSchema = z.object({
  name: requiredText("o nome da marca", 60),
  logoUrl: optionalText(500),
});

export const modelSchema = z.object({
  brandId: z.string().min(1, "Selecione a marca"),
  name: requiredText("o nome do modelo", 80),
  categoryId: z.string().optional().nullable().transform((v) => v || null),
});

export const categorySchema = z.object({
  name: requiredText("o nome da categoria", 60),
});

// ───────────── Funcionários ─────────────

const permissionEnum = z.enum(ALL_PERMISSIONS as [string, ...string[]]);

const userBase = {
  name: requiredText("o nome", 120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(160),
  phone: optionalText(20),
  role: z.enum(["ADMIN", "MANAGER", "SELLER"]),
  active: z.boolean().default(true),
  extraPermissions: z.array(permissionEnum).default([]),
  revokedPermissions: z.array(permissionEnum).default([]),
};

export const userCreateSchema = z.object({ ...userBase, password: strongPassword });
export const userUpdateSchema = z.object(userBase);

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: strongPassword,
});

// ───────────── Conteúdo do site ─────────────

const href = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => v || null)
  .refine((v) => v === null || v.startsWith("/") || /^https?:\/\//.test(v), "Use um caminho (/veiculos) ou URL completa");

export const bannerSchema = z.object({
  title: requiredText("o título", 120),
  subtitle: optionalText(240),
  imageUrl: z.string().trim().min(1, "Envie uma imagem").max(500),
  ctaLabel: optionalText(40),
  ctaHref: href,
  vehicleId: z.string().optional().nullable().transform((v) => v || null),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(999).default(0),
  startsAt: z.coerce.date().optional().nullable().catch(null),
  endsAt: z.coerce.date().optional().nullable().catch(null),
});

export const testimonialSchema = z.object({
  name: requiredText("o nome do cliente", 80),
  city: optionalText(80),
  vehicle: optionalText(80),
  text: requiredText("o depoimento", 800),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const differentialSchema = z.object({
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240),
  icon: z.string().trim().max(40).default("ShieldCheck"),
});

export const siteSettingsSchema = z.object({
  storeName: requiredText("o nome da loja", 80),
  tagline: optionalText(160),
  whatsapp: optionalText(20),
  phone: optionalText(20),
  email: z.string().trim().email("E-mail inválido").max(160).optional().nullable().or(z.literal("")).transform((v) => v || null),
  address: optionalText(240),
  city: optionalText(120),
  mapsUrl: optionalText(1000),
  businessHours: optionalText(240),
  instagram: optionalText(240),
  facebook: optionalText(240),
  youtube: optionalText(240),
  cnpj: optionalText(20),
  whatsappMessage: optionalText(300),
});

export const siteContentSchema = z.object({
  heroTitle: optionalText(120),
  heroSubtitle: optionalText(300),
  heroImageUrl: optionalText(500),
  aboutTitle: optionalText(120),
  aboutText: optionalText(3000),
  aboutImageUrl: optionalText(500),
  featuredTitle: optionalText(80),
  latestTitle: optionalText(80),
  offersTitle: optionalText(80),
  offersSubtitle: optionalText(200),
  differentials: z.array(differentialSchema).max(8).default([]),
});

export const reportFiltersSchema = z.object({
  from: z.coerce.date().optional().catch(undefined),
  to: z.coerce.date().optional().catch(undefined),
});

export { optionalInt };
