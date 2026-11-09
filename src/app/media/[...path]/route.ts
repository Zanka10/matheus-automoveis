// Serve imagens armazenadas localmente (fallback quando o Cloudinary não está configurado).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/server/services/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const root = path.resolve(UPLOAD_DIR);
  const full = path.resolve(root, ...parts);
  const type = TYPES[path.extname(full).toLowerCase()];
  if (!full.startsWith(root + path.sep) || !type) return new Response("Not found", { status: 404 });
  try {
    const file = await readFile(full);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
