import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthorizationError } from "./auth/session";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function zodFail(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(error.issues[0]?.message ?? "Dados inválidos", fieldErrors);
}

/**
 * Executa a lógica de uma server action convertendo erros conhecidos
 * em respostas amigáveis, sem vazar detalhes internos para o cliente.
 */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthorizationError) return fail(err.message);
    if (err instanceof z.ZodError) return zodFail(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return fail("Já existe um registro com esses dados (valor duplicado).");
      if (err.code === "P2003") return fail("Este registro está vinculado a outros dados e não pode ser removido.");
      if (err.code === "P2025") return fail("Registro não encontrado.");
    }
    // Erros de redirect/notFound do Next precisam ser propagados
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) {
      throw err;
    }
    console.error("[action]", err);
    return fail("Ocorreu um erro inesperado. Tente novamente.");
  }
}
