"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

export function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Input de telefone com máscara brasileira — compatível com register() do React Hook Form */
export const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ onChange, ...props }, ref) => (
  <Input
    ref={ref}
    type="tel"
    inputMode="tel"
    autoComplete="tel"
    placeholder="(00) 00000-0000"
    maxLength={15}
    {...props}
    onChange={(e) => {
      e.target.value = maskPhone(e.target.value);
      onChange?.(e);
    }}
  />
));
PhoneInput.displayName = "PhoneInput";
