"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Upload de imagem única via /api/upload (logos, banners, imagens institucionais) */
export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Enviar imagem",
  className,
  aspect = "aspect-video",
  fit = "cover",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: "brands" | "banners" | "site";
  label?: string;
  className?: string;
  aspect?: string;
  fit?: "cover" | "contain";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione um arquivo de imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem acima de 8 MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Falha no upload.");
      onChange(json.url);
      toast.success("Imagem enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition-colors",
          aspect,
          dragOver ? "border-brand bg-brand-soft" : "border-input",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain p-4")} />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="size-7" />
            <span className="font-medium">{label}</span>
            <span className="text-xs">Arraste ou clique · JPG, PNG, WEBP até 8 MB</span>
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        )}
      </div>
      {value && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImagePlus /> Trocar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={uploading}>
            <Trash2 /> Remover
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </div>
  );
}
