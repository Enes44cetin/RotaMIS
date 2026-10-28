import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Lütfen geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Lütfen şifrenizi girin."),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ad Soyad en az 2 karakter olmalıdır.")
    .max(100, "Ad Soyad en fazla 100 karakter olabilir."),
  email: z.string().trim().email("Lütfen geçerli bir e-posta adresi girin."),
  password: z
    .string()
    .min(6, "Şifreniz en az 6 karakter olmalıdır.")
    .max(128, "Şifreniz çok uzun."),
  kvkk: z.literal(true, {
    error: "Devam etmek için KVKK ve Aydınlatma Metnini onaylamalısınız.",
  }),
});

export const onboardingAssessmentSchema = z.object({
  step: z.coerce.number().int().min(1).max(5),
  classYear: z.coerce.number().int().min(0).max(5).optional(),
  careerPathId: z.string().uuid("Geçerli bir kariyer rotası seçiniz.").optional(),
  secondaryCareerPathId: z.string().uuid().optional(),
  universityId: z.string().uuid().optional(),
  universityOther: z.string().trim().max(150, "Üniversite adı en fazla 150 karakter olabilir.").optional(),
  hasInternship: z.boolean().optional(),
  ratings: z
    .record(z.string().uuid(), z.coerce.number().int().min(1).max(5))
    .optional(),
  weeklyHours: z.coerce.number().int().min(1).max(60).optional(),
  learningStyle: z.enum(["video", "reading", "hands_on", "mixed"]).optional(),
  targetDate: z.string().optional(),
  goalsNote: z.string().trim().max(1000, "Not alanı en fazla 1000 karakter olabilir.").optional(),
  isFinal: z.boolean().optional(),
});

export type OnboardingAssessmentInput = z.infer<typeof onboardingAssessmentSchema>;

export const toggleTaskStatusSchema = z.object({
  taskId: z.string().uuid("Geçersiz görev kimliği."),
  currentStatus: z.enum(["pending", "in_progress", "completed", "skipped"]),
});

