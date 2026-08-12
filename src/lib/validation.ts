import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Entrez une adresse e-mail valide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
    confirmPassword: z.string().min(8, "Confirmez votre mot de passe."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const signUpSchema = signInSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, "Le nom affiché doit faire au moins 2 caractères.")
    .max(60, "Le nom affiché est trop long."),
  programme: z
    .string()
    .trim()
    .min(2, "Indiquez votre formation.")
    .max(80, "La formation est trop longue."),
  studyYear: z.string().trim().min(1, "Choisissez votre année."),
});

export const resourceSchema = z.object({
  title: z.string().trim().min(5, "Le titre doit faire au moins 5 caractères.").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Ajoutez une description utile pour les autres étudiants.")
    .max(2000, "La description est trop longue."),
  kind: z.enum(["course", "exam", "project", "summary", "other"]),
  subject: z.string().trim().min(2, "Indiquez la matière.").max(80),
  programme: z.string().trim().min(2, "Indiquez la formation.").max(80),
  studyYear: z.string().trim().min(1, "Choisissez l’année concernée."),
  linkUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/[^\s]+$/i.test(value), {
      message: "Le lien doit commencer par http:// ou https://.",
    }),
});

export const commentSchema = z.object({
  body: z.string().trim().min(2, "Le commentaire est trop court.").max(1000),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").max(60, "Le nom de la collection est trop long."),
  description: z.string().trim().max(160, "La description est trop longue."),
});

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Vérifiez les champs du formulaire.";
}
