import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "Ver todos",
  align = "left",
  tone = "dark",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  href?: string;
  hrefLabel?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand">
            <span className="h-px w-6 bg-brand" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className={cn("text-balance text-3xl font-extrabold leading-[1.1] sm:text-4xl", tone === "light" ? "text-white" : "text-foreground")}>
          {title}
        </h2>
        {description && <p className={cn("mt-3 text-base", tone === "light" ? "text-white/65" : "text-muted-foreground")}>{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 text-sm font-semibold transition-colors",
            tone === "light" ? "text-white hover:text-white/80" : "text-foreground hover:text-brand",
          )}
        >
          {hrefLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
