"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Checkbox, Label, Switch } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, applyServerErrors } from "@/components/ui/form";
import { roleLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ADMIN_ONLY, ALL_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/server/auth/permissions";
import { createUserAction, updateUserAction } from "@/server/actions/users";
import { userCreateSchema, userUpdateSchema } from "@/validations/admin";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  extraPermissions: string[];
  revokedPermissions: string[];
};

type FormValues = z.input<typeof userCreateSchema>;

const ROLE_HINT: Record<Role, string> = {
  ADMIN: "Acesso total, incluindo funcionários e configurações.",
  MANAGER: "Veículos, estoque, publicações, orçamentos e relatórios.",
  SELLER: "Visualiza e cadastra veículos e atende orçamentos.",
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  isSelf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: EditableUser;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const editing = Boolean(user);
  const form = useForm<FormValues>({
    resolver: zodResolver((editing ? userUpdateSchema : userCreateSchema) as typeof userCreateSchema),
    defaultValues: blank(user),
  });
  const { register, handleSubmit, control, watch, setValue, setError, reset, formState } = form;
  const [tab, setTab] = useState<"dados" | "permissoes">("dados");

  useEffect(() => {
    if (open) {
      reset(blank(user));
      setTab("dados");
    }
  }, [open, user, reset]);

  const role = watch("role") as Role;
  const extra = (watch("extraPermissions") ?? []) as string[];
  const revoked = (watch("revokedPermissions") ?? []) as string[];
  const base = new Set<string>(ROLE_PERMISSIONS[role]);

  function toggle(p: Permission, checked: boolean) {
    if (base.has(p)) {
      setValue("revokedPermissions", checked ? revoked.filter((x) => x !== p) : [...revoked, p] as never, { shouldDirty: true });
    } else {
      setValue("extraPermissions", checked ? [...extra, p] as never : extra.filter((x) => x !== p), { shouldDirty: true });
    }
  }

  const onSubmit = handleSubmit(
    async (values) => {
      const res = editing ? await updateUserAction(user!.id, values) : await createUserAction(values);
      if (!res.ok) {
        applyServerErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Salvo");
      onOpenChange(false);
      router.refresh();
    },
    () => setTab("dados"),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${user!.name}` : "Novo funcionário"}</DialogTitle>
          <DialogDescription>
            {editing ? "Atualize dados, perfil de acesso e permissões." : "O funcionário deverá trocar a senha provisória no primeiro acesso."}
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
          {(["dados", "permissoes"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("rounded-md px-3 py-1.5 transition", tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}
            >
              {t === "dados" ? "Dados e perfil" : "Permissões"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <div className={cn("grid gap-4 sm:grid-cols-2", tab !== "dados" && "hidden")}>
            <Field label="Nome completo" htmlFor="u-name" error={formState.errors.name?.message} required className="sm:col-span-2">
              <Input id="u-name" {...register("name")} />
            </Field>
            <Field label="E-mail (login)" htmlFor="u-email" error={formState.errors.email?.message} required>
              <Input id="u-email" type="email" autoComplete="off" {...register("email")} />
            </Field>
            <Field label="Telefone" htmlFor="u-phone" error={formState.errors.phone?.message}>
              <Input id="u-phone" inputMode="tel" {...register("phone")} />
            </Field>
            <Field label="Perfil de acesso" htmlFor="u-role" hint={ROLE_HINT[role]} required>
              <NativeSelect id="u-role" disabled={isSelf} {...register("role")}>
                {(Object.keys(roleLabels) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {!editing && (
              <Field
                label="Senha provisória"
                htmlFor="u-password"
                error={formState.errors.password?.message}
                hint="Mín. 8 caracteres com maiúscula, minúscula e número."
                required
              >
                <Input id="u-password" type="text" autoComplete="new-password" {...register("password")} />
              </Field>
            )}
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Label className="mt-1 justify-between rounded-lg border p-3 font-normal sm:col-span-2">
                  <span>
                    <span className="block font-medium">Usuário ativo</span>
                    <span className="text-xs text-muted-foreground">Usuários inativos não conseguem acessar o painel.</span>
                  </span>
                  <Switch checked={!!field.value} disabled={isSelf} onCheckedChange={field.onChange} />
                </Label>
              )}
            />
          </div>

          <div className={cn(tab !== "permissoes" && "hidden")}>
            {role === "ADMIN" ? (
              <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">Administradores possuem acesso total ao painel.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Marcadas por padrão as permissões do perfil <strong>{roleLabels[role]}</strong>. Conceda ou remova acessos individualmente.
                </p>
                <ul className="grid max-h-[45vh] gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const adminOnly = ADMIN_ONLY.includes(p);
                    const fromRole = base.has(p);
                    const checked = fromRole ? !revoked.includes(p) : extra.includes(p);
                    const changed = fromRole ? revoked.includes(p) : extra.includes(p);
                    return (
                      <li key={p}>
                        <Label
                          className={cn(
                            "items-start rounded-lg border p-2.5 font-normal transition-colors",
                            adminOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50",
                            changed && "border-brand/40 bg-brand-soft/60",
                          )}
                        >
                          <Checkbox className="mt-0.5" checked={checked} disabled={adminOnly} onCheckedChange={(v) => toggle(p, v === true)} />
                          <span className="leading-snug">
                            <span className="block text-[13px]">{PERMISSIONS[p]}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {adminOnly ? "Exclusiva do administrador" : fromRole ? (changed ? "Removida deste usuário" : "Do perfil") : changed ? "Concedida individualmente" : "Não incluída no perfil"}
                            </span>
                          </span>
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={formState.isSubmitting}>
              {editing ? "Salvar alterações" : "Cadastrar funcionário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function blank(user?: EditableUser): FormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: user?.role ?? "SELLER",
    active: user?.active ?? true,
    extraPermissions: (user?.extraPermissions ?? []) as FormValues["extraPermissions"],
    revokedPermissions: (user?.revokedPermissions ?? []) as FormValues["revokedPermissions"],
    password: "",
  };
}
