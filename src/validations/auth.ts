import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha").max(200),
});

export const strongPassword = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .max(100, "Máximo de 100 caracteres")
  .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
  .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
  .regex(/[0-9]/, "Inclua ao menos um número");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
