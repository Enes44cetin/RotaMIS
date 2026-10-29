import { z } from "zod";

export const uuidSchema = z.string().uuid("Geçersiz kayıt kimliği (UUID)");

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const safeHttpUrlSchema = z
  .string()
  .url("Geçerli bir web adresi (URL) girilmelidir")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL yalnızca http:// veya https:// ile başlamalıdır" }
  );

// ---------- Career Path Schema ----------
export const careerPathSchema = z.object({
  name_tr: z.string().trim().min(2, "Kariyer alanı adı en az 2 karakter olmalıdır").max(120),
  name_en: z.string().trim().optional().default(""),
  slug: z
    .string()
    .trim()
    .min(2, "Geçerli bir slug belirtilmelidir")
    .max(100)
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir"),
  description_tr: z.string().trim().max(1000).optional().default(""),
  description_en: z.string().trim().max(1000).optional().default(""),
  icon: z.string().trim().max(50).optional().default("briefcase"),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export type CareerPathFormData = z.input<typeof careerPathSchema>;

// ---------- Skill Schema ----------
export const skillSchema = z.object({
  name_tr: z.string().trim().min(2, "Beceri adı en az 2 karakter olmalıdır").max(120),
  name_en: z.string().trim().optional().default(""),
  slug: z
    .string()
    .trim()
    .min(2, "Geçerli bir slug belirtilmelidir")
    .max(100)
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir"),
  category: z.enum(["technical", "business", "soft"]),
  description_tr: z.string().trim().max(1000).optional().default(""),
  description_en: z.string().trim().max(1000).optional().default(""),
  icon: z.string().trim().max(50).optional().default("sparkles"),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export type SkillFormData = z.input<typeof skillSchema>;

// ---------- University Schema ----------
export const universitySchema = z.object({
  name: z.string().trim().min(2, "Üniversite adı en az 2 karakter olmalıdır").max(150),
  city: z.string().trim().max(80).optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export type UniversityFormData = z.input<typeof universitySchema>;

export const mergeUniversitySchema = z.object({
  rawName: z.string().trim().min(1, "Eşleştirilecek üniversite adı boş olamaz").max(150),
  action: z.enum(["merge_existing", "create_new"]),
  targetUniversityId: z.string().uuid().optional(),
  newUniversityName: z.string().trim().max(150).optional(),
  city: z.string().trim().max(80).optional(),
});

// ---------- Learning Resource Schema ----------
export const resourceSkillLinkSchema = z
  .object({
    skill_id: z.string().uuid("Geçerli bir beceri seçilmelidir"),
    min_level: z.coerce.number().int().min(1).max(5).default(1),
    target_level: z.coerce.number().int().min(1).max(5).default(3),
  })
  .refine((data) => data.target_level >= data.min_level, {
    message: "Hedef seviye, başlangıç seviyesinden küçük olamaz",
    path: ["target_level"],
  });

export const resourceSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır").max(200),
  provider: z.string().trim().min(2, "Sağlayıcı (örn: BTK Akademi) belirtilmelidir").max(100),
  url: safeHttpUrlSchema,
  resource_type: z.enum([
    "course",
    "article",
    "video",
    "project",
    "certification",
    "practice",
    "other",
  ]),
  language: z.enum(["tr", "en", "mixed"]).default("tr"),
  pricing: z.enum(["free", "freemium", "paid"]).default("free"),
  estimated_hours: z.coerce.number().min(0.5).max(500).default(4.0),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  xp_reward: z
    .preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? null : Number(val),
      z.number().int().min(10, "XP en az 10 olmalıdır").max(500, "XP en fazla 500 olabilir").nullable()
    )
    .optional()
    .default(null),
  gives_certificate: z.boolean().default(false),
  certificate_info: z.string().trim().max(250).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  skills: z.array(resourceSkillLinkSchema).default([]),
});

export type ResourceFormData = z.infer<typeof resourceSchema>;

// ---------- Requirement Matrix Schema ----------
export const matrixRequirementItemSchema = z.object({
  skill_id: z.string().uuid(),
  required_level: z.coerce.number().int().min(1).max(5),
  importance: z.coerce.number().int().min(1).max(3).default(2),
});

export const saveMatrixSchema = z.object({
  career_path_id: z.string().uuid(),
  requirements: z.array(matrixRequirementItemSchema),
});

export type SaveMatrixFormData = z.infer<typeof saveMatrixSchema>;

export const copyMatrixSchema = z
  .object({
    sourceCareerPathId: z.string().uuid("Geçersiz kaynak kariyer rotası"),
    targetCareerPathId: z.string().uuid("Geçersiz hedef kariyer rotası"),
  })
  .refine((d) => d.sourceCareerPathId !== d.targetCareerPathId, {
    message: "Kaynak ve hedef kariyer rotası aynı olamaz",
  });
