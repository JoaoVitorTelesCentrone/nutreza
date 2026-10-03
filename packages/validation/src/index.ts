import { z } from "zod";
import { questionTypes } from "@nutreza/domain";

export const mobileSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const questionnaireSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().default(""),
});

export const questionSchema = z.object({
  prompt: z.string().trim().min(2).max(1000),
  type: z.enum(questionTypes),
  required: z.boolean().default(false),
  helpText: z.string().trim().max(500).optional().nullable(),
});

export const assignmentAnswerSchema = z.object({
  questionId: z.string().uuid(),
  textValue: z.string().max(5000).optional().nullable(),
  numericValue: z.number().finite().optional().nullable(),
  dateValue: z.string().date().optional().nullable(),
  optionIds: z.array(z.string().uuid()).max(50).default([]),
});

export type MobileSignInInput = z.infer<typeof mobileSignInSchema>;
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AssignmentAnswerInput = z.infer<typeof assignmentAnswerSchema>;
