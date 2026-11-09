"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

export function maskCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Input de CPF com máscara 000.000.000-00 — compatível com register() do React Hook Form */
export const CpfInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ onChange, ...props }, ref) => (
  <Input
    ref={ref}
    type="text"
    inputMode="numeric"
    autoComplete="off"
    placeholder="000.000.000-00"
    maxLength={14}
    {...props}
    onChange={(e) => {
      e.target.value = maskCpf(e.target.value);
      onChange?.(e);
    }}
  />
));
CpfInput.displayName = "CpfInput";
