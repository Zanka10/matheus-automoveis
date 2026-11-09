"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify, toNumber } from "@/lib/utils";
import { vehicleStatusLabels } from "@/lib/labels";
import { assertPermission, type CurrentUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { recordMovement } from "@/server/services/movements";
import { deleteStoredImage, storeImage, UploadError } from "@/server/services/storage";
import { getActiveStaff, nextInternalCode } from "@/server/services/vehicles-admin";
import { revalidateStore } from "@/server/revalidate";
import { vehicleSchema, vehicleStatusChangeSchema, type VehicleData } from "@/validations/vehicle";

const MAX_IMAGES = 30;
const idSchema = z.string().min(1).max(40);
type Tx = Prisma.TransactionClient;

function revalidateAdmin(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/veiculos");
  revalidatePath("/admin/estoque");
  if (id) revalidatePath(`/admin/veiculos/${id}`);
}

async function resolveRefs(tx: Tx | typeof prisma, data: VehicleData) {
  const model = await tx.vehicleModel.findUnique({
    where: { id: data.modelId },
    include: { brand: { select: { id: true, name: true } } },
  });
  if (!model || model.brandId !== data.brandId) return null;
  let categoryId = data.categoryId ?? model.categoryId ?? null;
  if (categoryId && !(await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) categoryId = null;
  return { brandName: model.brand.name, modelName: model.name, categoryId };
}

async function uniqueSlug(tx: Tx | typeof prisma, base: string, excludeId?: string) {
  let slug = base.slice(0, 120);
  for (let i = 2; ; i++) {
    const hit = await tx.vehicle.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base.slice(0, 115)}-${i}`;
  }
}

function buildSlug(brand: string, model: string, version: string, modelYear: number, code: string) {
  return `${slugify(`${brand} ${model} ${version} ${modelYear}`)}-${code.toLowerCase()}`;
}

/** Campos comuns persistidos (sem publicação/status, que dependem de permissão) */
function baseData(data: VehicleData, categoryId: string | null) {
  return {
    brandId: data.brandId,
    modelId: data.modelId,
    categoryId,
    version: data.version,
    manufactureYear: data.manufactureYear,
    modelYear: data.modelYear,
    condition: data.condition,
    mileage: data.mileage,
    plate: data.plate,
    price: data.price,
    promoPrice: data.promoPrice,
    acceptsTrade: data.acceptsTrade,
    financingAvailable: data.financingAvailable,
    engine: data.engine,
    power: data.power,
    fuel: data.fuel,
    transmission: data.transmission,
    steering: data.steering,
    drivetrain: data.drivetrain,
    doors: data.doors,
    seats: data.seats,
    color: data.color,
    consumption: data.consumption,
    features: data.features,
    description: data.description,
    internalNotes: data.internalNotes,
    highlights: data.highlights,
    conservation: data.conservation,
  };
}

// ─────────────────────────────── Criar ───────────────────────────────

export async function createVehicleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.create");
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;
    const canPublish = can(user, "vehicles.publish");
    const canStock = can(user, "vehicles.stock");

    const vehicle = await prisma.$transaction(async (tx) => {
      const refs = await resolveRefs(tx, data);
      if (!refs) throw new z.ZodError([{ code: "custom", path: ["modelId"], message: "Modelo não pertence à marca selecionada", input: data.modelId }]);
      let code = data.internalCode;
      if (code) {
        if (await tx.vehicle.findUnique({ where: { internalCode: code }, select: { id: true } })) {
          throw new z.ZodError([{ code: "custom", path: ["internalCode"], message: "Código interno já utilizado", input: code }]);
        }
      } else {
        code = await nextInternalCode(tx);
      }
      const status: VehicleStatus = canStock && data.status !== "SOLD" ? data.status : "AVAILABLE";
      const slug = await uniqueSlug(tx, buildSlug(refs.brandName, refs.modelName, data.version, data.modelYear, code));
      const v = await tx.vehicle.create({
        data: {
          ...baseData(data, refs.categoryId),
          slug,
          internalCode: code,
          status,
          // Sem fotos ainda: a publicação é feita após o envio das imagens
          published: false,
          featured: canPublish ? data.featured : false,
          isOffer: canPublish ? data.isOffer : false,
          offerLabel: canPublish && data.isOffer ? data.offerLabel : null,
          createdById: user.id,
        },
      });
      await recordMovement(tx, { vehicleId: v.id, type: "CREATED", toStatus: status, userId: user.id });
      return { ...v, label: `${refs.brandName} ${refs.modelName} ${data.version}` };
    });

    await logActivity({
      userId: user.id,
      action: "vehicle.create",
      entity: "Vehicle",
      entityId: vehicle.id,
      summary: `Cadastrou ${vehicle.label} (${vehicle.internalCode})`,
    });
    revalidateAdmin();
    return ok({ id: vehicle.id }, "Veículo cadastrado. Agora adicione as fotos.");
  });
}

// ─────────────────────────────── Atualizar ───────────────────────────────

export async function updateVehicleAction(vehicleId: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.edit");
    const id = idSchema.parse(vehicleId);
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;
    const canPublish = can(user, "vehicles.publish");
    const canStock = can(user, "vehicles.stock");

    const current = await prisma.vehicle.findUnique({ where: { id }, include: { _count: { select: { images: true } } } });
    if (!current) return fail("Veículo não encontrado.");

    const result = await prisma.$transaction(async (tx) => {
      const refs = await resolveRefs(tx, data);
      if (!refs) throw new z.ZodError([{ code: "custom", path: ["modelId"], message: "Modelo não pertence à marca selecionada", input: data.modelId }]);

      const code = data.internalCode || current.internalCode;
      if (code !== current.internalCode && (await tx.vehicle.findUnique({ where: { internalCode: code }, select: { id: true } }))) {
        throw new z.ZodError([{ code: "custom", path: ["internalCode"], message: "Código interno já utilizado", input: code }]);
      }

      const identityChanged =
        data.brandId !== current.brandId ||
        data.modelId !== current.modelId ||
        data.version !== current.version ||
        data.modelYear !== current.modelYear ||
        code !== current.internalCode;
      const slug = identityChanged
        ? await uniqueSlug(tx, buildSlug(refs.brandName, refs.modelName, data.version, data.modelYear, code), id)
        : current.slug;

      // Status: apenas quem tem permissão de estoque altera
      let status = current.status;
      const statusData: Prisma.VehicleUpdateInput = {};
      if (canStock && data.status !== current.status) {
        status = data.status;
        if (status === "SOLD") {
          statusData.soldAt = new Date();
          statusData.soldBy = { connect: { id: user.id } };
          statusData.soldPrice = data.promoPrice ?? data.price;
        } else if (current.status === "SOLD") {
          statusData.soldAt = null;
          statusData.soldPrice = null;
          statusData.soldBy = { disconnect: true };
        }
      }

      // Publicação: apenas quem tem permissão de publicação altera
      let published = current.published;
      const pubData: Prisma.VehicleUpdateInput = {};
      if (canPublish) {
        published = data.published;
        if (published && status === "SOLD") published = false;
        if (published && current._count.images === 0) {
          throw new z.ZodError([{ code: "custom", path: ["published"], message: "Adicione ao menos uma foto antes de publicar", input: true }]);
        }
        pubData.featured = data.featured;
        pubData.isOffer = data.isOffer;
        pubData.offerLabel = data.isOffer ? data.offerLabel : null;
      }
      if (status === "SOLD") published = false;
      pubData.published = published;
      if (published && !current.publishedAt) pubData.publishedAt = new Date();

      const { brandId, modelId, categoryId, ...rest } = baseData(data, refs.categoryId);
      await tx.vehicle.update({
        where: { id },
        data: {
          ...rest,
          brand: { connect: { id: brandId } },
          model: { connect: { id: modelId } },
          category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
          internalCode: code,
          slug,
          status,
          ...statusData,
          ...pubData,
        },
      });

      // Histórico
      const priceChanged =
        toNumber(current.price) !== data.price ||
        (current.promoPrice === null ? null : toNumber(current.promoPrice)) !== data.promoPrice;
      const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
      let recorded = false;
      if (status !== current.status) {
        await recordMovement(tx, {
          vehicleId: id,
          type: status === "SOLD" ? "SOLD" : "STATUS_CHANGED",
          fromStatus: current.status,
          toStatus: status,
          userId: user.id,
        });
        recorded = true;
      }
      if (priceChanged) {
        await recordMovement(tx, {
          vehicleId: id,
          type: "PRICE_CHANGED",
          userId: user.id,
          note: `De ${fmt(toNumber(current.price))}${current.promoPrice ? ` (promo ${fmt(toNumber(current.promoPrice))})` : ""} para ${fmt(data.price)}${data.promoPrice ? ` (promo ${fmt(data.promoPrice)})` : ""}`,
        });
        recorded = true;
      }
      if (published !== current.published) {
        await recordMovement(tx, { vehicleId: id, type: published ? "PUBLISHED" : "UNPUBLISHED", userId: user.id });
        recorded = true;
      }
      if (canPublish && data.featured !== current.featured) {
        await recordMovement(tx, { vehicleId: id, type: data.featured ? "FEATURED" : "UNFEATURED", userId: user.id });
        recorded = true;
      }
      if (!recorded) await recordMovement(tx, { vehicleId: id, type: "UPDATED", userId: user.id });

      return { slug, label: `${refs.brandName} ${refs.modelName} ${data.version}` };
    });

    await logActivity({
      userId: user.id,
      action: "vehicle.update",
      entity: "Vehicle",
      entityId: id,
      summary: `Editou ${result.label} (${current.internalCode})`,
    });
    revalidateStore(result.slug);
    if (result.slug !== current.slug) revalidateStore(current.slug);
    revalidateAdmin(id);
    return ok(undefined, "Alterações salvas.");
  });
}

// ─────────────────────────────── Duplicar ───────────────────────────────

export async function duplicateVehicleAction(vehicleId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.create");
    const id = idSchema.parse(vehicleId);
    const src = await prisma.vehicle.findUnique({
      where: { id },
      include: { images: { orderBy: { order: "asc" } }, brand: true, model: true },
    });
    if (!src) return fail("Veículo não encontrado.");

    const copy = await prisma.$transaction(async (tx) => {
      const code = await nextInternalCode(tx);
      const slug = await uniqueSlug(tx, buildSlug(src.brand.name, src.model.name, src.version, src.modelYear, code));
      const v = await tx.vehicle.create({
        data: {
          slug,
          internalCode: code,
          brandId: src.brandId,
          modelId: src.modelId,
          categoryId: src.categoryId,
          version: src.version,
          manufactureYear: src.manufactureYear,
          modelYear: src.modelYear,
          condition: src.condition,
          mileage: src.mileage,
          plate: null, // placa é única por veículo físico
          price: src.price,
          promoPrice: src.promoPrice,
          acceptsTrade: src.acceptsTrade,
          financingAvailable: src.financingAvailable,
          status: "AVAILABLE",
          engine: src.engine,
          power: src.power,
          fuel: src.fuel,
          transmission: src.transmission,
          steering: src.steering,
          drivetrain: src.drivetrain,
          doors: src.doors,
          seats: src.seats,
          color: src.color,
          consumption: src.consumption,
          features: src.features,
          description: src.description,
          internalNotes: src.internalNotes,
          highlights: src.highlights,
          conservation: src.conservation,
          published: false,
          featured: false,
          isOffer: false,
          createdById: user.id,
          // As cópias apontam para o mesmo arquivo; sem storageKey para não apagá-lo ao excluir a cópia
          images: { create: src.images.map((img) => ({ url: img.url, storageKey: null, order: img.order, width: img.width, height: img.height })) },
        },
      });
      await recordMovement(tx, { vehicleId: v.id, type: "DUPLICATED", toStatus: "AVAILABLE", userId: user.id, note: `Cópia de ${src.internalCode}` });
      return v;
    });

    await logActivity({
      userId: user.id,
      action: "vehicle.duplicate",
      entity: "Vehicle",
      entityId: copy.id,
      summary: `Duplicou ${src.brand.name} ${src.model.name} ${src.version} (${src.internalCode} → ${copy.internalCode})`,
    });
    revalidateAdmin();
    return ok({ id: copy.id }, `Cadastro duplicado como ${copy.internalCode}.`);
  });
}

// ─────────────────────────────── Excluir ───────────────────────────────

export async function deleteVehicleAction(vehicleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.delete");
    const id = idSchema.parse(vehicleId);
    const v = await prisma.vehicle.findUnique({
      where: { id },
      include: { images: true, brand: true, model: true, _count: { select: { quotes: true } } },
    });
    if (!v) return fail("Veículo não encontrado.");
    if (v.status === "SOLD") return fail("Veículos vendidos não podem ser excluídos: o histórico de vendas é preservado.");
    if (v._count.quotes > 0) {
      return fail(`Este veículo possui ${v._count.quotes} orçamento(s) vinculado(s). Retire-o do site em vez de excluir.`);
    }
    await prisma.vehicle.delete({ where: { id } });
    // Remove arquivos apenas se nenhum outro veículo usa a mesma URL
    for (const img of v.images) {
      if (!img.storageKey) continue;
      const shared = await prisma.vehicleImage.count({ where: { url: img.url } });
      if (!shared) await deleteStoredImage(img.storageKey);
    }
    await logActivity({
      userId: user.id,
      action: "vehicle.delete",
      entity: "Vehicle",
      entityId: id,
      summary: `Excluiu ${v.brand.name} ${v.model.name} ${v.version} (${v.internalCode})`,
    });
    revalidateStore(v.slug);
    revalidateAdmin();
    return ok(undefined, "Veículo excluído.");
  });
}

// ─────────────────────────────── Status do estoque ───────────────────────────────

export async function changeVehicleStatusAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.stock");
    const parsed = vehicleStatusChangeSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;
    const v = await prisma.vehicle.findUnique({ where: { id: data.vehicleId }, include: { brand: true, model: true } });
    if (!v) return fail("Veículo não encontrado.");
    if (v.status === data.status) return fail("O veículo já está com este status.");

    if (data.soldById) {
      const seller = await prisma.user.findUnique({ where: { id: data.soldById }, select: { active: true } });
      if (!seller?.active) return fail("Vendedor inválido.");
    }
    let quote: { id: string; status: string; protocol: string } | null = null;
    if (data.status === "SOLD" && data.quoteId) {
      quote = await prisma.quote.findFirst({
        where: { id: data.quoteId, vehicleId: v.id },
        select: { id: true, status: true, protocol: true },
      });
      if (!quote) return fail("Orçamento não encontrado para este veículo.");
    }

    await prisma.$transaction(async (tx: Tx) => {
      const update: Prisma.VehicleUpdateInput = { status: data.status };
      if (data.status === "SOLD") {
        update.soldAt = new Date();
        update.soldPrice = data.soldPrice ?? v.promoPrice ?? v.price;
        update.soldBy = { connect: { id: data.soldById ?? user.id } };
        update.published = false; // sai automaticamente da listagem pública
      } else if (v.status === "SOLD") {
        update.soldAt = null;
        update.soldPrice = null;
        update.soldBy = { disconnect: true };
      }
      await tx.vehicle.update({ where: { id: v.id }, data: update });
      await recordMovement(tx, {
        vehicleId: v.id,
        type: data.status === "SOLD" ? "SOLD" : "STATUS_CHANGED",
        fromStatus: v.status,
        toStatus: data.status,
        userId: user.id,
        note: data.note,
      });
      if (data.status === "SOLD" && v.published) {
        await recordMovement(tx, { vehicleId: v.id, type: "UNPUBLISHED", userId: user.id, note: "Retirado automaticamente após a venda" });
      }
      if (quote) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: "FINISHED", convertedToSale: true, closedAt: new Date() },
        });
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.id,
            type: "STATUS_CHANGED",
            fromStatus: quote.status as never,
            toStatus: "FINISHED",
            userId: user.id,
            note: `Venda concluída do veículo ${v.internalCode}`,
          },
        });
      }
    });

    await logActivity({
      userId: user.id,
      action: "vehicle.status",
      entity: "Vehicle",
      entityId: v.id,
      summary: `Alterou status de ${v.brand.name} ${v.model.name} (${v.internalCode}): ${vehicleStatusLabels[v.status]} → ${vehicleStatusLabels[data.status]}`,
      details: quote ? { quote: quote.protocol } : undefined,
    });
    revalidateStore(v.slug);
    revalidateAdmin(v.id);
    if (quote) revalidatePath("/admin/orcamentos");
    return ok(undefined, `Status alterado para ${vehicleStatusLabels[data.status]}.`);
  });
}

/** Dados para o diálogo de alteração de status: equipe ativa e orçamentos em aberto do veículo */
export async function getStatusDialogDataAction(vehicleId: string): Promise<
  ActionResult<{
    staff: { id: string; name: string }[];
    quotes: { id: string; protocol: string; name: string }[];
    price: number;
  }>
> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.stock");
    const id = idSchema.parse(vehicleId);
    const v = await prisma.vehicle.findUnique({ where: { id }, select: { price: true, promoPrice: true } });
    if (!v) return fail("Veículo não encontrado.");
    const seesQuotes = can(user, "quotes.viewAll") || can(user, "quotes.view");
    const [staff, quotes] = await Promise.all([
      getActiveStaff(),
      seesQuotes
        ? prisma.quote.findMany({
            where: {
              vehicleId: id,
              status: { notIn: ["FINISHED", "CANCELED"] },
              ...(can(user, "quotes.viewAll") ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: { id: true, protocol: true, name: true },
          })
        : [],
    ]);
    return ok({ staff, quotes, price: toNumber(v.promoPrice ?? v.price) });
  });
}

// ─────────────────────────────── Imagens ───────────────────────────────

export type VehicleImageDTO = { id: string; url: string; order: number };

async function listImages(vehicleId: string): Promise<VehicleImageDTO[]> {
  return prisma.vehicleImage.findMany({
    where: { vehicleId },
    orderBy: { order: "asc" },
    select: { id: true, url: true, order: true },
  });
}

async function afterImageChange(user: CurrentUser, vehicleId: string, summary: string) {
  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { slug: true } });
  await logActivity({ userId: user.id, action: "vehicle.images", entity: "Vehicle", entityId: vehicleId, summary });
  revalidateStore(v?.slug);
  revalidateAdmin(vehicleId);
}

/** Recebe um ou mais arquivos em `files` (FormData) */
export async function uploadVehicleImagesAction(vehicleId: string, formData: FormData): Promise<ActionResult<VehicleImageDTO[]>> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.edit");
    const id = idSchema.parse(vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { id: true, _count: { select: { images: true } } } });
    if (!vehicle) return fail("Veículo não encontrado.");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return fail("Nenhuma imagem enviada.");
    if (vehicle._count.images + files.length > MAX_IMAGES) return fail(`Limite de ${MAX_IMAGES} fotos por veículo.`);

    const last = await prisma.vehicleImage.findFirst({ where: { vehicleId: id }, orderBy: { order: "desc" }, select: { order: true } });
    let order = (last?.order ?? -1) + 1;
    const errors: string[] = [];
    for (const file of files) {
      try {
        const stored = await storeImage(file, "vehicles");
        await prisma.vehicleImage.create({
          data: { vehicleId: id, url: stored.url, storageKey: stored.storageKey, width: stored.width, height: stored.height, order: order++ },
        });
      } catch (err) {
        if (err instanceof UploadError) errors.push(`${file.name}: ${err.message}`);
        else throw err;
      }
    }
    const sent = files.length - errors.length;
    if (sent > 0) await afterImageChange(user, id, `Enviou ${sent} foto(s)`);
    if (errors.length && sent === 0) return fail(errors.join(" "));
    return ok(await listImages(id), errors.length ? `Algumas fotos foram recusadas: ${errors.join(" ")}` : `${sent} foto(s) enviada(s).`);
  });
}

export async function deleteVehicleImageAction(imageId: string): Promise<ActionResult<VehicleImageDTO[]>> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.edit");
    const img = await prisma.vehicleImage.findUnique({
      where: { id: idSchema.parse(imageId) },
      include: { vehicle: { select: { id: true, published: true, _count: { select: { images: true } } } } },
    });
    if (!img) return fail("Imagem não encontrada.");
    if (img.vehicle.published && img.vehicle._count.images <= 1) {
      return fail("Um veículo publicado precisa de ao menos uma foto. Retire-o do site antes de remover a última.");
    }
    await prisma.vehicleImage.delete({ where: { id: img.id } });
    if (img.storageKey && !(await prisma.vehicleImage.count({ where: { url: img.url } }))) {
      await deleteStoredImage(img.storageKey);
    }
    // Renormaliza a ordem
    const rest = await prisma.vehicleImage.findMany({ where: { vehicleId: img.vehicleId }, orderBy: { order: "asc" }, select: { id: true } });
    await prisma.$transaction(rest.map((r, i) => prisma.vehicleImage.update({ where: { id: r.id }, data: { order: i } })));
    await afterImageChange(user, img.vehicleId, "Removeu uma foto");
    return ok(await listImages(img.vehicleId), "Foto removida.");
  });
}

/** Define a ordem das fotos; a primeira é a imagem principal */
export async function reorderVehicleImagesAction(vehicleId: string, orderedIds: string[]): Promise<ActionResult<VehicleImageDTO[]>> {
  return runAction(async () => {
    const user = await assertPermission("vehicles.edit");
    const id = idSchema.parse(vehicleId);
    const ids = z.array(idSchema).max(MAX_IMAGES).parse(orderedIds);
    const existing = await prisma.vehicleImage.findMany({ where: { vehicleId: id }, select: { id: true } });
    const set = new Set(existing.map((e) => e.id));
    if (ids.length !== set.size || !ids.every((i) => set.has(i))) return fail("Lista de imagens desatualizada. Recarregue a página.");
    await prisma.$transaction(ids.map((imgId, i) => prisma.vehicleImage.update({ where: { id: imgId }, data: { order: i } })));
    await afterImageChange(user, id, "Reordenou as fotos");
    return ok(await listImages(id), "Ordem das fotos atualizada.");
  });
}

export async function setMainVehicleImageAction(vehicleId: string, imageId: string): Promise<ActionResult<VehicleImageDTO[]>> {
  const pre = await runAction(async () => {
    await assertPermission("vehicles.edit");
    const id = idSchema.parse(vehicleId);
    const images = await prisma.vehicleImage.findMany({ where: { vehicleId: id }, orderBy: { order: "asc" }, select: { id: true } });
    const ids = images.map((i) => i.id);
    if (!ids.includes(imageId)) return fail("Imagem não encontrada.");
    return ok([imageId, ...ids.filter((i) => i !== imageId)]);
  });
  if (!pre.ok) return pre;
  return reorderVehicleImagesAction(vehicleId, pre.data ?? []);
}
