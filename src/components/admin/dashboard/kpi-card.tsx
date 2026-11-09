import Link from "next/link";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  href,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "group flex h-full flex-col justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs transition-all sm:p-5",
        href && "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
            accent ? "bg-brand text-brand-foreground" : "bg-muted text-foreground/70",
          )}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}
