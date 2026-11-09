// Upload genérico de imagens (logos de marcas, banners, imagens institucionais).
// Imagens de veículos usam server actions próprias do módulo de veículos.
import { NextResponse } from "next/server";
import { assertPermission, AuthorizationError } from "@/server/auth/session";
import type { Permission } from "@/server/auth/permissions";
import { storeImage, UploadError } from "@/server/services/storage";
import { logActivity } from "@/server/services/activity";

const FOLDER_PERMISSION: Record<string, Permission> = {
  brands: "brands.manage",
  banners: "content.manage",
  site: "content.manage",
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const folder = String(form.get("folder") ?? "");
    const permission = FOLDER_PERMISSION[folder];
    if (!permission) return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
    const user = await assertPermission(permission);

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    const stored = await storeImage(file, folder);
    await logActivity({
      userId: user.id,
      action: "upload.image",
      entity: "Upload",
      summary: `Imagem enviada (${folder})`,
      details: { url: stored.url },
    });
    return NextResponse.json({ url: stored.url });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[upload]", err);
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
