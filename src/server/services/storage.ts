import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type StoredImage = { url: string; storageKey: string; width?: number; height?: number };

export class UploadError extends Error {}

const useCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Confere a assinatura real do arquivo (magic bytes), não apenas o MIME declarado pelo navegador */
function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp" && /avi[fs]/.test(buf.subarray(8, 12).toString("ascii"))) return "image/avif";
  return null;
}

function safeFolder(folder: string) {
  return folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
}

export async function storeImage(file: File, folder: string): Promise<StoredImage> {
  if (!file || typeof file.arrayBuffer !== "function") throw new UploadError("Arquivo inválido.");
  if (file.size === 0) throw new UploadError("Arquivo vazio.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Imagem acima de 8 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buffer);
  if (!mime || !ALLOWED[mime]) throw new UploadError("Formato não suportado. Envie JPG, PNG, WEBP ou AVIF.");
  const dir = safeFolder(folder);

  if (useCloudinary) {
    const result = await new Promise<{ secure_url: string; public_id: string; width: number; height: number }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `${process.env.CLOUDINARY_FOLDER ?? "matheus-automoveis"}/${dir}`,
              resource_type: "image",
              transformation: [{ width: 2400, height: 2400, crop: "limit", quality: "auto", fetch_format: "auto" }],
            },
            (err, res) => (err || !res ? reject(err ?? new Error("upload falhou")) : resolve(res)),
          )
          .end(buffer);
      },
    );
    return { url: result.secure_url, storageKey: `cloudinary:${result.public_id}`, width: result.width, height: result.height };
  }

  // Fallback local (desenvolvimento): arquivos fora de /public, servidos pela rota /media
  const name = `${randomUUID()}.${ALLOWED[mime]}`;
  await mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, dir, name), buffer);
  return { url: `/media/${dir}/${name}`, storageKey: `local:${dir}/${name}` };
}

export async function deleteStoredImage(storageKey: string | null | undefined) {
  if (!storageKey) return;
  try {
    if (storageKey.startsWith("cloudinary:") && useCloudinary) {
      await cloudinary.uploader.destroy(storageKey.slice("cloudinary:".length));
    } else if (storageKey.startsWith("local:")) {
      const rel = storageKey.slice("local:".length);
      const full = path.resolve(UPLOAD_DIR, rel);
      if (full.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) await unlink(full);
    }
  } catch (err) {
    console.error("[storage] falha ao remover", storageKey, err);
  }
}
