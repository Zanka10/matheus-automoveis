import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";
import { getSitemapVehicles } from "@/server/services/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/veiculos"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/orcamento"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: siteUrl("/sobre"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/contato"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  try {
    const vehicles = await getSitemapVehicles();
    return [
      ...staticPages,
      ...vehicles.map((v) => ({ url: siteUrl(`/veiculos/${v.slug}`), lastModified: v.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch {
    return staticPages;
  }
}
