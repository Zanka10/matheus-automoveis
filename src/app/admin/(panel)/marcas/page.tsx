import { PageHeader } from "@/components/admin/page-header";
import { BrandsManager, type BrandDTO, type CategoryDTO } from "@/components/admin/brands/brands-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";

export const metadata = { title: "Marcas e modelos" };

export default async function BrandsPage() {
  await requirePermission("brands.manage");
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { vehicles: true } },
        models: {
          orderBy: { name: "asc" },
          include: { category: { select: { name: true } }, _count: { select: { vehicles: true } } },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { models: true, vehicles: true } } },
    }),
  ]);

  const brandDTO: BrandDTO[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    logoUrl: b.logoUrl,
    vehicleCount: b._count.vehicles,
    models: b.models.map((m) => ({
      id: m.id,
      name: m.name,
      categoryId: m.categoryId,
      categoryName: m.category?.name ?? null,
      vehicleCount: m._count.vehicles,
    })),
  }));
  const categoryDTO: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    modelCount: c._count.models,
    vehicleCount: c._count.vehicles,
  }));

  return (
    <>
      <PageHeader
        title="Marcas e modelos"
        description="Cadastros usados no formulário de veículos e nos filtros da loja pública."
      />
      <BrandsManager brands={brandDTO} categories={categoryDTO} />
    </>
  );
}
