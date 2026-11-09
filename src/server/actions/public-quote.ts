"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { rateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request";
import { incrementVehicleViews } from "@/server/services/catalog";
import { quoteRequestSchema } from "@/validations/quote";

async function nextProtocol(attempt: number) {
  const last = await prisma.quote.findFirst({ orderBy: { createdAt: "desc" }, select: { protocol: true } });
  const lastNum = Number(last?.protocol.replace(/\D/g, "")) || 1000;
  const count = await prisma.quote.count();
  return `ORC-${Math.max(lastNum, 1000 + count) + 1 + attempt}`;
}

export async function submitQuoteAction(input: unknown): Promise<ActionResult<{ protocol: string; vehicleLabel: string | null }>> {
  return runAction(async () => {
    // Honeypot: bots preenchem o campo oculto — respondemos como sucesso sem gravar nada
    if (input && typeof input === "object" && (input as { website?: unknown }).website) {
      return ok({ protocol: "ORC-0", vehicleLabel: null });
    }
    const parsed = quoteRequestSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;

    const ip = await getClientIp();
    const limit = rateLimit(`quote:${ip ?? "unknown"}`, 5, 10 * 60_000);
    if (!limit.allowed) return fail("Você enviou muitas solicitações em pouco tempo. Tente novamente em alguns minutos.");

    let vehicleLabel: string | null = null;
    if (data.vehicleId) {
      const v = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, published: true, status: { not: "SOLD" } },
        select: { version: true, manufactureYear: true, modelYear: true, brand: { select: { name: true } }, model: { select: { name: true } } },
      });
      if (!v) return fail("O veículo selecionado não está mais disponível.", { vehicleId: ["Veículo indisponível"] });
      vehicleLabel = `${v.brand.name} ${v.model.name} ${v.version} ${v.manufactureYear}/${v.modelYear}`;
    }

    const hasTradeIn = data.hasTradeIn;
    for (let attempt = 0; attempt < 5; attempt++) {
      const protocol = await nextProtocol(attempt);
      try {
        await prisma.quote.create({
          data: {
            protocol,
            name: data.name,
            phone: data.phone,
            email: data.email,
            cpf: data.cpf,
            birthDate: data.birthDate,
            vehicleId: data.vehicleId,
            vehicleLabel,
            message: data.message,
            wantsFinancing: data.wantsFinancing,
            hasTradeIn,
            tradeInBrand: hasTradeIn ? data.tradeInBrand : null,
            tradeInModel: hasTradeIn ? data.tradeInModel : null,
            tradeInYear: hasTradeIn ? data.tradeInYear : null,
            tradeInMileage: hasTradeIn ? data.tradeInMileage : null,
            tradeInNotes: hasTradeIn ? data.tradeInNotes : null,
            source: data.source,
            consentAt: new Date(),
            ip,
            events: {
              create: {
                type: "CREATED",
                toStatus: "NEW",
                note: data.source === "INTEREST" ? "Interesse registrado pela página do veículo" : "Solicitação recebida pelo site",
              },
            },
          },
        });
        revalidatePath("/admin/orcamentos");
        revalidatePath("/admin");
        return ok({ protocol, vehicleLabel }, "Solicitação enviada com sucesso!");
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
    return fail("Não foi possível registrar sua solicitação. Tente novamente.");
  });
}

/** Contador de visualizações — chamado do cliente para não quebrar o cache da página */
export async function registerVehicleViewAction(vehicleId: string) {
  const id = z.string().min(1).max(40).safeParse(vehicleId);
  if (!id.success) return;
  const ip = await getClientIp();
  if (!rateLimit(`view:${ip}:${id.data}`, 1, 30 * 60_000).allowed) return;
  try {
    await incrementVehicleViews(id.data);
  } catch {
    /* não crítico */
  }
}
