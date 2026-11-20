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

export const markTaskInProgressSchema = z.object({
  taskId: z.string().uuid("Geçersiz görev kimliği."),
});

export const miniCheckupSchema = z.object({
  sprintId: z.string().uuid("Geçersiz sprint kimliği."),
  ratings: z
    .array(
      z.object({
        skillId: z.string().uuid("Geçersiz beceri kimliği."),
        level: z.coerce
          .number()
          .int()
          .min(1, "Puan en az 1 olmalıdır.")
          .max(5, "Puan en fazla 5 olabilir."),
      })
    )
    .min(1, "En az bir beceriyi puanlamalısınız.")
    .max(12, "Tek seferde en fazla 12 beceri puanlanabilir."),
});

export type MiniCheckupInput = z.infer<typeof miniCheckupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Lütfen geçerli bir e-posta adresi girin."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Yeni şifreniz en az 6 karakter olmalıdır.")
      .max(128, "Şifreniz çok uzun."),
    confirmPassword: z.string().min(1, "Lütfen şifrenizi tekrar girin."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Girdiğiniz şifreler birbiriyle eşleşmiyor.",
    path: ["confirmPassword"],
  });

export const skipTaskSchema = z.object({
  taskId: z.string().uuid("Geçersiz görev kimliği."),
});

export const unskipTaskSchema = z.object({
  taskId: z.string().uuid("Geçersiz görev kimliği."),
});

export const reportBrokenResourceSchema = z.object({
  taskId: z.string().uuid("Geçersiz görev kimliği."),
  resourceId: z.string().uuid("Geçersiz kaynak kimliği.").nullable().optional(),
  reason: z.enum(["broken_link", "outdated", "other"], {
    error: "Lütfen bir bildirim nedeni seçin.",
  }),
  note: z
    .string()
    .trim()
    .max(500, "Açıklama notu en fazla 500 karakter olabilir.")
    .optional(),
  skipAfterReport: z.boolean().optional().default(true),
});

export type ReportBrokenResourceInput = z.input<typeof reportBrokenResourceSchema>;

export const studentSettingsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Ad Soyad en az 2 karakter olmalıdır.")
      .max(100, "Ad Soyad en fazla 100 karakter olabilir."),
    universityId: z.union([
      z.literal("other"),
      z.string().uuid("Geçerli bir üniversite seçiniz."),
    ]),
    universityOther: z
      .string()
      .trim()
      .max(150, "Üniversite adı en fazla 150 karakter olabilir.")
      .optional(),
    weeklyHours: z.coerce
      .number()
      .int()
      .min(2, "Haftalık çalışma süresi en az 2 saat olmalıdır.")
      .max(40, "Haftalık çalışma süresi en fazla 40 saat olabilir."),
    learningStyle: z.enum(["video", "reading", "hands_on", "mixed"], {
      error: "Geçerli bir öğrenme stili seçiniz.",
    }),
  })
  .refine(
    (data) =>
      data.universityId !== "other" ||
      (typeof data.universityOther === "string" &&
        data.universityOther.trim().length >= 2),
    {
      message: "Lütfen üniversite adınızı en az 2 karakter olarak yazın.",
      path: ["universityOther"],
    }
  );

export type StudentSettingsInput = z.input<typeof studentSettingsSchema>;



