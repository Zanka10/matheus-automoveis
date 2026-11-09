"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, applyServerErrors } from "@/components/ui/form";
import { changePasswordAction } from "@/server/actions/auth";
import { changePasswordSchema, type ChangePasswordInput } from "@/validations/auth";

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const res = await changePasswordAction(values);
    if (res && !res.ok) {
      applyServerErrors(setError, res.fieldErrors);
      toast.error(res.error);
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field label="Senha atual" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="Nova senha" htmlFor="newPassword" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número.">
        <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" variant="brand" loading={isSubmitting} className="mt-2">
        Salvar nova senha
      </Button>
    </form>
  );
}
