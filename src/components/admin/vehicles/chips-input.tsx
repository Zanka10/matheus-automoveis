"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Lista editável de itens (opcionais, diferenciais) com sugestões clicáveis */
export function ChipsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Adicionar item",
  max = 120,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());

  const add = (raw: string) => {
    const items = raw
      .split(/[\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const item of items) if (!next.some((v) => v.toLowerCase() === item.toLowerCase()) && next.length < max) next.push(item.slice(0, 120));
    onChange(next);
    setDraft("");
  };
  const toggle = (s: string) => (has(s) ? onChange(value.filter((v) => v.toLowerCase() !== s.toLowerCase())) : add(s));

  return (
    <div className="flex flex-col gap-3">
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => {
            const on = has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  on ? "border-brand/40 bg-brand-soft text-brand" : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                )}
              >
                {on ? <Check className="size-3" /> : <Plus className="size-3" />}
                {s}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) add(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => draft.trim() && add(draft)}>
          <Plus /> Adicionar
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li key={item} className="inline-flex items-center gap-1 rounded-md bg-muted py-1 pl-2.5 pr-1 text-xs font-medium">
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`Remover ${item}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
