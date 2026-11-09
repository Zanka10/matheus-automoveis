import "server-only";
import type { MovementType, Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

/** Registra uma movimentação no histórico do veículo (estoque/publicação/preço) */
export function recordMovement(
  tx: Tx,
  input: {
    vehicleId: string;
    type: MovementType;
    userId?: string | null;
    fromStatus?: VehicleStatus | null;
    toStatus?: VehicleStatus | null;
    note?: string | null;
  },
) {
  return tx.vehicleMovement.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      userId: input.userId ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      note: input.note ?? null,
    },
  });
}
