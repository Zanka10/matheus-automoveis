import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/server/request";

type LogInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
};

/** Registro de atividades administrativas (auditoria). Nunca falha a operação principal. */
export async function logActivity(input: LogInput) {
  try {
    await prisma.activityLog.create({
      data: { ...input, userId: input.userId ?? null, ip: await getClientIp() },
    });
  } catch (err) {
    console.error("[activity-log]", err);
  }
}
