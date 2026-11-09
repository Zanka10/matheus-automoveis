"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { loginAction } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="mt-8 flex flex-col gap-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <Field label="E-mail" htmlFor="email" error={errors?.email?.[0]}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" autoComplete="username" required className="h-11 pl-9" placeholder="voce@empresa.com.br" />
        </div>
      </Field>
      <Field label="Senha" htmlFor="password" error={errors?.password?.[0]}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-11 pl-9 pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      {state && !state.ok && !errors && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="brand" size="lg" loading={pending} className="mt-2">
        Entrar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Esqueceu a senha? Solicite a redefinição ao administrador da loja.
      </p>
    </form>
  );
}
