"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { assertPermission } from "@/server/auth/session";
import { fail, ok, runAction, zodFail, type ActionResult } from "@/server/action";
import { logActivity } from "@/server/services/activity";
import { revalidateStore } from "@/server/revalidate";
import { brandSchema, categorySchema, modelSchema } from "@/validations/admin";

const idSchema = z.string().min(1).max(40);

function refresh() {
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/veiculos");
  revalidateStore();
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// ─────────────────────────────── Marcas ───────────────────────────────

export async function saveBrandAction(brandId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const parsed = brandSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const { name, logoUrl } = parsed.data;
    const slug = slugify(name);
    if (!slug) return fail("Nome inválido.", { name: ["Nome inválido"] });
    const clash = await prisma.brand.findFirst({
      where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }], NOT: brandId ? { id: brandId } : undefined },
      select: { id: true },
    });
    if (clash) return fail("Já existe uma marca com este nome.", { name: ["Marca já cadastrada"] });

    const brand = brandId
      ? await prisma.brand.update({ where: { id: idSchema.parse(brandId) }, data: { name, slug, logoUrl } })
      : await prisma.brand.create({ data: { name, slug, logoUrl } });
    await logActivity({
      userId: user.id,
      action: brandId ? "brand.update" : "brand.create",
      entity: "Brand",
      entityId: brand.id,
      summary: `${brandId ? "Editou" : "Cadastrou"} a marca ${name}`,
    });
    refresh();
    return ok({ id: brand.id }, brandId ? "Marca atualizada." : "Marca cadastrada.");
  });
}

export async function deleteBrandAction(brandId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const brand = await prisma.brand.findUnique({
      where: { id: idSchema.parse(brandId) },
      include: { _count: { select: { models: true, vehicles: true } } },
    });
    if (!brand) return fail("Marca não encontrada.");
    if (brand._count.vehicles > 0) {
      return fail(`Não é possível excluir: ${plural(brand._count.vehicles, "veículo vinculado", "veículos vinculados")} à marca ${brand.name}.`);
    }
    if (brand._count.models > 0) {
      return fail(`Não é possível excluir: a marca possui ${plural(brand._count.models, "modelo cadastrado", "modelos cadastrados")}. Exclua os modelos primeiro.`);
    }
    await prisma.brand.delete({ where: { id: brand.id } });
    await logActivity({ userId: user.id, action: "brand.delete", entity: "Brand", entityId: brand.id, summary: `Excluiu a marca ${brand.name}` });
    refresh();
    return ok(undefined, "Marca excluída.");
  });
}

// ─────────────────────────────── Modelos ───────────────────────────────

export async function saveModelAction(modelId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const parsed = modelSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const { brandId, name, categoryId } = parsed.data;
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
    if (!brand) return fail("Marca não encontrada.");
    if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
      return fail("Categoria inválida.");
    }
    const slug = slugify(name);
    if (!slug) return fail("Nome inválido.", { name: ["Nome inválido"] });
    const clash = await prisma.vehicleModel.findFirst({
      where: { brandId, slug, NOT: modelId ? { id: modelId } : undefined },
      select: { id: true },
    });
    if (clash) return fail(`O modelo ${name} já existe para ${brand.name}.`, { name: ["Modelo já cadastrado"] });

    let model;
    if (modelId) {
      const current = await prisma.vehicleModel.findUnique({ where: { id: idSchema.parse(modelId) }, include: { _count: { select: { vehicles: true } } } });
      if (!current) return fail("Modelo não encontrado.");
      if (current.brandId !== brandId && current._count.vehicles > 0) {
        return fail("Não é possível mover para outra marca um modelo com veículos vinculados.");
      }
      model = await prisma.vehicleModel.update({ where: { id: current.id }, data: { brandId, name, slug, categoryId } });
    } else {
      model = await prisma.vehicleModel.create({ data: { brandId, name, slug, categoryId } });
    }
    await logActivity({
      userId: user.id,
      action: modelId ? "model.update" : "model.create",
      entity: "VehicleModel",
      entityId: model.id,
      summary: `${modelId ? "Editou" : "Cadastrou"} o modelo ${brand.name} ${name}`,
    });
    refresh();
    return ok({ id: model.id }, modelId ? "Modelo atualizado." : "Modelo cadastrado.");
  });
}

export async function deleteModelAction(modelId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const model = await prisma.vehicleModel.findUnique({
      where: { id: idSchema.parse(modelId) },
      include: { brand: { select: { name: true } }, _count: { select: { vehicles: true } } },
    });
    if (!model) return fail("Modelo não encontrado.");
    if (model._count.vehicles > 0) {
      return fail(`Não é possível excluir: ${plural(model._count.vehicles, "veículo vinculado", "veículos vinculados")} ao modelo ${model.name}.`);
    }
    await prisma.vehicleModel.delete({ where: { id: model.id } });
    await logActivity({ userId: user.id, action: "model.delete", entity: "VehicleModel", entityId: model.id, summary: `Excluiu o modelo ${model.brand.name} ${model.name}` });
    refresh();
    return ok(undefined, "Modelo excluído.");
  });
}

// ─────────────────────────────── Categorias ───────────────────────────────

export async function saveCategoryAction(categoryId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const { name } = parsed.data;
    const slug = slugify(name);
    if (!slug) return fail("Nome inválido.", { name: ["Nome inválido"] });
    const clash = await prisma.category.findFirst({
      where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }], NOT: categoryId ? { id: categoryId } : undefined },
      select: { id: true },
    });
    if (clash) return fail("Já existe uma categoria com este nome.", { name: ["Categoria já cadastrada"] });
    const category = categoryId
      ? await prisma.category.update({ where: { id: idSchema.parse(categoryId) }, data: { name, slug } })
      : await prisma.category.create({ data: { name, slug } });
    await logActivity({
      userId: user.id,
      action: categoryId ? "category.update" : "category.create",
      entity: "Category",
      entityId: category.id,
      summary: `${categoryId ? "Editou" : "Cadastrou"} a categoria ${name}`,
    });
    refresh();
    return ok({ id: category.id }, categoryId ? "Categoria atualizada." : "Categoria cadastrada.");
  });
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertPermission("brands.manage");
    const category = await prisma.category.findUnique({
      where: { id: idSchema.parse(categoryId) },
      include: { _count: { select: { vehicles: true, models: true } } },
    });
    if (!category) return fail("Categoria não encontrada.");
    const { vehicles, models } = category._count;
    if (vehicles > 0 || models > 0) {
      const parts = [vehicles && plural(vehicles, "veículo", "veículos"), models && plural(models, "modelo", "modelos")].filter(Boolean);
      return fail(`Não é possível excluir: a categoria ${category.name} está em uso por ${parts.join(" e ")}.`);
    }
    await prisma.category.delete({ where: { id: category.id } });
    await logActivity({ userId: user.id, action: "category.delete", entity: "Category", entityId: category.id, summary: `Excluiu a categoria ${category.name}` });
    refresh();
    return ok(undefined, "Categoria excluída.");
  });
}
