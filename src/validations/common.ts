import { z } from "zod";

/** Converte "" em undefined e aplica trim — útil para campos opcionais de texto */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max = 120) =>
  z.string({ error: `Informe ${label}` }).trim().min(1, `Informe ${label}`).max(max, `Máximo de ${max} caracteres`);

/** Número inteiro opcional vindo de inputs (string vazia => null) */
export const optionalInt = (min = 0, max = 10_000_000) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional() // no Zod 4 a chave só é opcional se o schema de entrada for ZodOptional
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(/\D/g, ""))))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), "Valor inválido");

/** Valor monetário em reais aceitando "85.900,00", "85900" ou number */
export const parseMoney = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/[^\d,.-]/g, "");
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

export const money = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform(parseMoney)
    .refine((v) => v !== null && !Number.isNaN(v) && v > 0 && v < 100_000_000, `Informe ${label} válido`)
    .transform((v) => v as number);

export const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .optional() // no Zod 4 a chave só é opcional se o schema de entrada for ZodOptional
  .transform(parseMoney)
  .refine((v) => v === null || (!Number.isNaN(v) && v > 0 && v < 100_000_000), "Valor inválido");

export const phoneBR = z
  .string({ error: "Informe o telefone" })
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^(55)?\d{10,11}$/.test(v), "Informe um telefone com DDD válido");

/** Valida os dígitos verificadores do CPF (entrada só com dígitos) */
export function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export const cpfBR = z
  .string({ error: "Informe o CPF" })
  .trim()
  .min(1, "Informe o CPF")
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCpf, "Informe um CPF válido");

/** Data de nascimento no formato YYYY-MM-DD (input type="date") → Date em UTC */
export const birthDateSchema = z
  .string({ error: "Informe a data de nascimento" })
  .trim()
  .min(1, { error: "Informe a data de nascimento", abort: true })
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) && v >= "1900-01-01" && d <= new Date();
  }, "Informe uma data de nascimento válida")
  .transform((v) => new Date(`${v}T00:00:00Z`));

export const idSchema = z.string().min(1).max(40);

/** Lista de strings (aceita array ou texto separado por quebra de linha) */
export const stringList = (maxItems = 80) =>
  z
    .union([z.array(z.string()), z.string(), z.undefined(), z.null()])
    .transform((v) => {
      const arr = Array.isArray(v) ? v : (v ?? "").split(/\r?\n/);
      return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, maxItems);
    })
    .pipe(z.array(z.string().max(120)));
