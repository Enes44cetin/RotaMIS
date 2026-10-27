import { z } from "zod";

// ---------- Career Path Schema ----------
export const careerPathSchema = z.object({
  name_tr: z.string().min(2, "Kariyer alanı adı en az 2 karakter olmalıdır"),
  name_en: z.string().optional().default(""),
  slug: z.string().min(2, "Geçerli bir slug belirtilmelidir"),
  description_tr: z.string().optional().default(""),
  description_en: z.string().optional().default(""),
  icon: z.string().optional().default("briefcase"),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type CareerPathFormData = z.input<typeof careerPathSchema>;

// ---------- Skill Schema ----------
export const skillSchema = z.object({
  name_tr: z.string().min(2, "Beceri adı en az 2 karakter olmalıdır"),
  name_en: z.string().optional().default(""),
  slug: z.string().min(2, "Geçerli bir slug belirtilmelidir"),
  category: z.enum(["technical", "business", "soft"]),
  description_tr: z.string().optional().default(""),
  description_en: z.string().optional().default(""),
  icon: z.string().optional().default("sparkles"),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type SkillFormData = z.input<typeof skillSchema>;

// ---------- University Schema ----------
export const universitySchema = z.object({
  name: z.string().min(2, "Üniversite adı en az 2 karakter olmalıdır"),
  city: z.string().optional().default(""),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type UniversityFormData = z.input<typeof universitySchema>;

// ---------- Learning Resource Schema ----------
export const resourceSkillLinkSchema = z.object({
  skill_id: z.string().uuid("Geçerli bir beceri seçilmelidir"),
  min_level: z.coerce.number().int().min(1).max(5).default(1),
  target_level: z.coerce.number().int().min(1).max(5).default(3),
});

export const resourceSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır"),
  provider: z.string().min(2, "Sağlayıcı (örn: BTK Akademi) belirtilmelidir"),
  url: z.string().url("Geçerli bir web adresi (URL) girilmelidir"),
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
  estimated_hours: z.coerce.number().min(0.5).default(4.0),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  gives_certificate: z.boolean().default(false),
  certificate_info: z.string().optional().default(""),
  description: z.string().optional().default(""),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  sort_order: z.coerce.number().int().default(0),
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
