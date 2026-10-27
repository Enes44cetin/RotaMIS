-- =========================================================
-- 00_reset_DIKKAT.sql  |  RotaMIS nesnelerinin TAMAMINI SİLER
-- SADECE kurulum yarıda hata verirse ve sıfırdan başlamak istersen çalıştır.
-- auth.users (kayıtlı kullanıcılar) SİLİNMEZ; sadece uygulama tabloları silinir.
-- Sonrasında 01'den itibaren tekrar çalıştır.
-- =========================================================
drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.v_assessment_history cascade;
drop view if exists public.v_category_scores    cascade;
drop view if exists public.v_skill_gap          cascade;
drop view if exists public.v_latest_assessment  cascade;

drop table if exists public.xp_events                      cascade;
drop table if exists public.user_badges                    cascade;
drop table if exists public.badges                         cascade;
drop table if exists public.tasks                          cascade;
drop table if exists public.roadmaps                       cascade;
drop table if exists public.assessment_skill_ratings       cascade;
drop table if exists public.assessments                    cascade;
drop table if exists public.career_path_skill_requirements cascade;
drop table if exists public.skills                         cascade;
drop table if exists public.profiles                       cascade;
drop table if exists public.career_paths                   cascade;
drop table if exists public.universities                   cascade;

drop function if exists public.assessments_after_complete()  cascade;
drop function if exists public.assessments_before_update()   cascade;
drop function if exists public.tasks_after_status_change()   cascade;
drop function if exists public.tasks_before_update()         cascade;
drop function if exists public.check_and_award_badges(uuid)  cascade;
drop function if exists public.register_activity(uuid)       cascade;
drop function if exists public.award_xp(uuid, int, public.xp_reason, uuid, uuid, uuid) cascade;
drop function if exists public.handle_new_user()             cascade;
drop function if exists public.is_admin()                    cascade;
drop function if exists public.set_updated_at()              cascade;

drop type if exists public.xp_reason          cascade;
drop type if exists public.roadmap_source     cascade;
drop type if exists public.task_resource_type cascade;
drop type if exists public.task_status        cascade;
drop type if exists public.learning_style     cascade;
drop type if exists public.assessment_status  cascade;
drop type if exists public.skill_category     cascade;
drop type if exists public.user_role          cascade;
