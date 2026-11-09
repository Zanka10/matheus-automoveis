"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  deleteVehicleImageAction,
  reorderVehicleImagesAction,
  setMainVehicleImageAction,
  uploadVehicleImagesAction,
  type VehicleImageDTO,
} from "@/server/actions/vehicles";

const MAX = 30;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Pending = { key: string; name: string; preview: string; state: "queued" | "uploading" | "error"; error?: string };

export function ImageManager({ vehicleId, initialImages }: { vehicleId: string; initialImages: VehicleImageDTO[] }) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [toDelete, setToDelete] = useState<VehicleImageDTO | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = queue.some((q) => q.state === "uploading" || q.state === "queued");

  useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const room = MAX - images.length - queue.filter((q) => q.state !== "error").length;
    if (room <= 0) return toast.error(`Limite de ${MAX} fotos por veículo.`);
    const accepted = files.slice(0, room);
    if (files.length > room) toast.warning(`Apenas ${room} foto(s) adicionada(s) — limite de ${MAX}.`);

    const items = accepted.map((file) => {
      const error = !ACCEPT.includes(file.type) ? "Formato não suportado" : file.size > MAX_BYTES ? "Acima de 8 MB" : undefined;
      return {
        file,
        pending: {
          key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          preview: URL.createObjectURL(file),
          state: error ? "error" : "queued",
          error,
        } as Pending,
      };
    });
    setQueue((q) => [...q, ...items.map((i) => i.pending)]);

    let sent = 0;
    for (const { file, pending } of items) {
      if (pending.state === "error") continue;
      setQueue((q) => q.map((p) => (p.key === pending.key ? { ...p, state: "uploading" } : p)));
      const fd = new FormData();
      fd.append("files", file);
      const res = await uploadVehicleImagesAction(vehicleId, fd);
      if (res.ok && res.data) {
        sent++;
        setImages(res.data);
        URL.revokeObjectURL(pending.preview);
        setQueue((q) => q.filter((p) => p.key !== pending.key));
      } else {
        setQueue((q) => q.map((p) => (p.key === pending.key ? { ...p, state: "error", error: res.ok ? "Falha" : res.error } : p)));
      }
    }
    if (sent) {
      toast.success(`${sent} foto(s) enviada(s).`);
      router.refresh();
    }
  }

  async function persistOrder(next: VehicleImageDTO[], prev: VehicleImageDTO[]) {
    setImages(next);
    setBusy(true);
    const res = await reorderVehicleImagesAction(vehicleId, next.map((i) => i.id));
    setBusy(false);
    if (res.ok && res.data) {
      setImages(res.data);
      router.refresh();
    } else {
      setImages(prev);
      toast.error(res.ok ? "Falha ao reordenar." : res.error);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void persistOrder(next, images);
  }

  async function makeMain(img: VehicleImageDTO) {
    setBusy(true);
    const res = await setMainVehicleImageAction(vehicleId, img.id);
    setBusy(false);
    if (res.ok && res.data) {
      setImages(res.data);
      toast.success("Imagem principal definida.");
      router.refresh();
    } else toast.error(res.ok ? "Falha." : res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDropActive(false);
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dropActive ? "border-brand bg-brand-soft" : "border-input bg-muted/30",
        )}
      >
        <span className="grid size-11 place-items-center rounded-full bg-card text-brand shadow-xs">
          <UploadCloud className="size-5" />
        </span>
        <p className="text-sm font-medium">Arraste as fotos aqui ou</p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={images.length >= MAX}>
          <ImagePlus /> Selecionar arquivos
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WEBP ou AVIF · até 8 MB cada · {images.length}/{MAX} fotos
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length === 0 && queue.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="size-4" /> Nenhuma foto enviada. É necessário ao menos uma foto para publicar o veículo.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            A primeira foto é a <strong>imagem principal</strong>. Arraste para reordenar ou use as setas.
          </p>
          <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", busy && "pointer-events-none opacity-70")}>
            {images.map((img, i) => (
              <li
                key={img.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) move(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-muted shadow-xs transition",
                  dragIndex === i && "opacity-40",
                  overIndex === i && dragIndex !== i && "ring-2 ring-brand",
                )}
              >
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url.includes("images.unsplash.com") ? img.url.replace(/w=\d+/, "w=480") : img.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  <span className="absolute left-2 top-2 flex items-center gap-1">
                    <span className="grid size-6 cursor-grab place-items-center rounded-md bg-black/55 text-white active:cursor-grabbing" title="Arraste para reordenar">
                      <GripVertical className="size-3.5" />
                    </span>
                    {i === 0 ? (
                      <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Principal</span>
                    ) : (
                      <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{i + 1}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 border-t bg-card p-1.5">
                  <div className="flex">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Mover para a esquerda">
                      <ArrowLeft />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Mover para a direita">
                      <ArrowRight />
                    </Button>
                  </div>
                  <div className="flex">
                    {i !== 0 && (
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => makeMain(img)} aria-label="Definir como principal" title="Definir como principal">
                        <Star />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setToDelete(img)}
                      aria-label="Excluir foto"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
            {queue.map((p) => (
              <li key={p.key} className="relative overflow-hidden rounded-xl border bg-muted">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={p.name} className={cn("size-full object-cover", p.state !== "error" && "opacity-50")} />
                  <div className="absolute inset-0 grid place-items-center">
                    {p.state === "error" ? (
                      <span className="mx-2 rounded-md bg-destructive px-2 py-1 text-center text-[11px] font-medium text-white">{p.error}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                        <Loader2 className="size-3 animate-spin" />
                        {p.state === "uploading" ? "Enviando…" : "Na fila"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 border-t bg-card p-1.5 pl-2.5">
                  <span className="truncate text-[11px] text-muted-foreground">{p.name}</span>
                  {p.state === "error" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Descartar"
                      onClick={() => {
                        URL.revokeObjectURL(p.preview);
                        setQueue((q) => q.filter((x) => x.key !== p.key));
                      }}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {uploading && <p className="text-xs text-muted-foreground">Enviando fotos… mantenha esta página aberta.</p>}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir esta foto?"
        description="A imagem será removida definitivamente do veículo."
        confirmLabel="Excluir foto"
        onConfirm={async () => {
          if (!toDelete) return;
          const res = await deleteVehicleImageAction(toDelete.id);
          if (res.ok && res.data) {
            setImages(res.data);
            toast.success("Foto removida.");
            router.refresh();
          } else toast.error(res.ok ? "Falha." : res.error);
        }}
      />
    </div>
  );
}
