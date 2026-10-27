-- =========================================================
-- 01_enums.sql  |  RotaMIS - Enum tipleri
-- Çalıştırma sırası: 1
-- =========================================================
create type public.user_role          as enum ('student', 'admin');
create type public.skill_category     as enum ('technical', 'business', 'soft');
create type public.assessment_status  as enum ('draft', 'completed');
create type public.learning_style     as enum ('video', 'reading', 'hands_on', 'mixed');
create type public.task_status        as enum ('pending', 'in_progress', 'completed', 'skipped');
create type public.task_resource_type as enum ('course', 'article', 'video', 'project', 'certification', 'practice', 'other');
create type public.roadmap_source     as enum ('mock', 'gemini', 'admin');
create type public.xp_reason          as enum ('task_completed', 'assessment_completed', 'badge_earned', 'streak_bonus');
