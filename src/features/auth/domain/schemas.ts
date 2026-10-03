import { z } from "zod";

export const emailSchema = z.email("Informe um e-mail válido.");
export const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.");
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe sua senha.") });
export const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal("on", { error: "Aceite os termos para continuar." }),
});
export const clinicSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do consultório.").max(120),
  profissional: z.string().trim().min(2, "Informe seu nome." ).max(120),
});
