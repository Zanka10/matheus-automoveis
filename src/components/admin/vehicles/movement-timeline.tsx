import type { MovementType, VehicleStatus } from "@prisma/client";
import { movementLabels, vehicleStatusLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOT: Partial<Record<MovementType, string>> = {
  CREATED: "bg-sky-500",
  SOLD: "bg-emerald-500",
  PUBLISHED: "bg-brand",
  UNPUBLISHED: "bg-zinc-400",
  PRICE_CHANGED: "bg-amber-500",
  STATUS_CHANGED: "bg-indigo-500",
};

export type TimelineItem = {
  id: string;
  type: MovementType;
  fromStatus: VehicleStatus | null;
  toStatus: VehicleStatus | null;
  note: string | null;
  createdAt: Date | string;
  user: { name: string } | null;
};

export function MovementTimeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;
  return (
    <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
      {items.map((m) => (
        <li key={m.id} className="relative pl-6">
          <span className={cn("absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-card", DOT[m.type] ?? "bg-zinc-400")} />
          <p className="text-sm font-medium">
            {movementLabels[m.type]}
            {m.fromStatus && m.toStatus && m.fromStatus !== m.toStatus && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {vehicleStatusLabels[m.fromStatus]} → {vehicleStatusLabels[m.toStatus]}
              </span>
            )}
          </p>
          {m.note && <p className="mt-0.5 text-sm text-muted-foreground">{m.note}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(m.createdAt)}
            {m.user ? ` · ${m.user.name}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
