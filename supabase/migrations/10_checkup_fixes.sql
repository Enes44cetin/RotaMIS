-- =========================================================
-- 10_checkup_fixes.sql  |  RotaMIS - Sistem Check-Up & AI Entegrasyon Yaması
-- Çalıştırma sırası: 10 (Supabase SQL Editor'de güvenle çalıştırılabilir)
-- =========================================================

-- 1. roadmap_source enum tipine 'ai' değerini ekle (hem 'gemini' hem 'ai' sorunsuz çalışsın)
alter type public.roadmap_source add value if not exists 'ai';

-- 2. v_skill_gap görünümünü hem mevcut kod ('name_tr', 'current_level')
--    hem de AI modülü ('skill_name_tr', 'student_level', 'career_path_name')
--    ile %100 uyumlu olacak şekilde genişlet (mevcut kolon sırası korunur, yeni kolonlar sona eklenir)
create or replace view public.v_skill_gap
with (security_invoker = true) as
select
  la.user_id,
  la.id                                   as assessment_id,
  la.career_path_id,
  s.id                                    as skill_id,
  s.slug                                  as skill_slug,
  s.category,
  s.name_tr,
  s.name_en,
  s.sort_order,
  coalesce(r.level, 0)                    as current_level,
  coalesce(req.required_level, 0)         as required_level,
  coalesce(req.importance, 1)             as importance,
  greatest(coalesce(req.required_level, 0) - coalesce(r.level, 0), 0) as gap,
  -- AI Modülü & Handoff Uyumluluk Alias'ları:
  s.name_tr                               as skill_name_tr,
  coalesce(r.level, 0)                    as student_level,
  cp.name_tr                              as career_path_name
from public.v_latest_assessment la
cross join public.skills s
left join public.career_paths cp
       on cp.id = la.career_path_id
left join public.assessment_skill_ratings r
       on r.assessment_id = la.id and r.skill_id = s.id
left join public.career_path_skill_requirements req
       on req.career_path_id = la.career_path_id and req.skill_id = s.id
where s.is_active
  and (r.level is not null or req.required_level is not null);

-- 3. View ve RPC güvenlik izinlerini sıkılaştır
revoke all on public.v_skill_gap from anon;
revoke execute on function public.save_requirement_matrix(uuid, jsonb) from public, anon;
grant execute on function public.save_requirement_matrix(uuid, jsonb) to authenticated;

