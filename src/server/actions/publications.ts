"use server";

// Ações de publicação de veículos na loja pública.
// Compartilhadas pelo módulo de Veículos e pelo módulo de Publicações.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/auth/session";
import { fail, ok, runAction, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { recordMovement } from "@/server/services/movements";
import { revalidateStore } from "@/server/revalidate";

const idSchema = z.string().min(1).max(40);

function vehicleTitle(v: { version: string; brand: { name: string }; model: { name: string } }) {
  return `${v.brand.name} ${v.model.name} ${v.version}`;
}

const include = { brand: { select: { name: true } }, model: { select: { name: true } }, images: { select: { id: true }, take: 1 } } as const;

function afterChange(slug: string) {
  revalidateStore(slug);
  revalidatePath("/admin/veiculos");
  revalidatePath("/admin/publicacoes");
  revalidatePath("/admin");
}

export async function setVehiclePublishedAction(vehicleId: string, published: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.publish");
    const v = await prisma.vehicle.findUnique({ where: { id: idSchema.parse(vehicleId) }, include });
    if (!v) return fail("Veículo não encontrado.");
    if (published && v.status === "SOLD") return fail("Veículos vendidos não podem ser publicados.");
    if (published && v.images.length === 0) return fail("Adicione ao menos uma foto antes de publicar.");
    if (v.published === published) return ok();
    await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: v.id },
        data: { published, publishedAt: published ? (v.publishedAt ?? new Date()) : v.publishedAt },
      }),
      recordMovement(prisma, { vehicleId: v.id, type: published ? "PUBLISHED" : "UNPUBLISHED", userId: user.id }),
    ]);
    await logActivity({
      userId: user.id,
      action: published ? "vehicle.publish" : "vehicle.unpublish",
      entity: "Vehicle",
      entityId: v.id,
      summary: `${published ? "Publicou" : "Retirou do site"}: ${vehicleTitle(v)}`,
    });
    afterChange(v.slug);
    return ok(undefined, published ? "Veículo publicado na loja." : "Veículo retirado da loja.");
  });
}

export async function setVehicleFeaturedAction(vehicleId: string, featured: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.publish");
    const v = await prisma.vehicle.findUnique({ where: { id: idSchema.parse(vehicleId) }, include });
    if (!v) return fail("Veículo não encontrado.");
    if (v.featured === featured) return ok();
    await prisma.$transaction([
      prisma.vehicle.update({ where: { id: v.id }, data: { featured } }),
      recordMovement(prisma, { vehicleId: v.id, type: featured ? "FEATURED" : "UNFEATURED", userId: user.id }),
    ]);
    await logActivity({
      userId: user.id,
      action: featured ? "vehicle.feature" : "vehicle.unfeature",
      entity: "Vehicle",
      entityId: v.id,
      summary: `${featured ? "Destacou" : "Removeu dos destaques"}: ${vehicleTitle(v)}`,
    });
    afterChange(v.slug);
    return ok(undefined, featured ? "Veículo marcado como destaque." : "Destaque removido.");
  });
}

export async function setVehicleOfferAction(
  vehicleId: string,
  isOffer: boolean,
  offerLabel?: string | null,
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.publish");
    const label = z.string().trim().max(40).nullish().parse(offerLabel) || null;
    const v = await prisma.vehicle.findUnique({ where: { id: idSchema.parse(vehicleId) }, include });
    if (!v) return fail("Veículo não encontrado.");
    await prisma.vehicle.update({ where: { id: v.id }, data: { isOffer, offerLabel: isOffer ? label : null } });
    await logActivity({
      userId: user.id,
      action: isOffer ? "vehicle.offer_on" : "vehicle.offer_off",
      entity: "Vehicle",
      entityId: v.id,
      summary: `${isOffer ? "Incluiu em ofertas" : "Removeu das ofertas"}: ${vehicleTitle(v)}`,
      details: label ? { offerLabel: label } : undefined,
    });
    afterChange(v.slug);
    return ok(undefined, isOffer ? "Veículo incluído nas ofertas." : "Veículo removido das ofertas.");
  });
}

/** Define a ordem de exibição: o primeiro id recebe a menor posição */
export async function reorderVehiclesAction(orderedIds: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.publish");
    const ids = z.array(idSchema).max(500).parse(orderedIds);
    await prisma.$transaction(ids.map((id, index) => prisma.vehicle.update({ where: { id }, data: { displayOrder: index } })));
    await logActivity({ userId: user.id, action: "vehicle.reorder", entity: "Vehicle", summary: `Reordenou ${ids.length} veículos na loja` });
    revalidateStore();
    revalidatePath("/admin/publicacoes");
    return ok(undefined, "Ordem de exibição atualizada.");
  });
}
