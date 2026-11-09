"use client";

import * as React from "react";
import type { FieldErrors, FieldValues, Path, UseFormSetError } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./primitives";

/** Campo de formulário com label, dica e mensagem de erro acessíveis */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[13px] text-foreground/80">
          {label}
          {required && <span className="text-brand">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Obtém a mensagem de erro de um campo (suporta caminhos aninhados "a.b") */
export function fieldError<T extends FieldValues>(errors: FieldErrors<T>, name: string): string | undefined {
  const node = name.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], errors);
  return (node as { message?: string } | undefined)?.message;
}

/** Aplica no formulário os erros de campo devolvidos por uma server action */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors?: Record<string, string[]>,
) {
  if (!fieldErrors) return;
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (key !== "_") setError(key as Path<T>, { type: "server", message: messages[0] });
  }
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-xs sm:p-6", className)}>
      <header className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}
