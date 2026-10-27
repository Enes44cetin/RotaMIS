-- =========================================================
-- 05_views.sql  |  RotaMIS - Dashboard için hazır sorgular
-- Çalıştırma sırası: 5
-- security_invoker = true → view'lar sorgulayan kullanıcının RLS'ine tabidir
-- =========================================================

-- Her kullanıcının en son tamamlanan check-up'ı
create or replace view public.v_latest_assessment
with (security_invoker = true) as
select distinct on (a.user_id) a.*
  from public.assessments a
 where a.status = 'completed'
 order by a.user_id, a.completed_at desc;

-- Beceri bazlı gap analizi (Radar grafiği verisi)
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
  greatest(coalesce(req.required_level, 0) - coalesce(r.level, 0), 0) as gap
from public.v_latest_assessment la
cross join public.skills s
left join public.assessment_skill_ratings r
       on r.assessment_id = la.id and r.skill_id = s.id
left join public.career_path_skill_requirements req
       on req.career_path_id = la.career_path_id and req.skill_id = s.id
where s.is_active
  and (r.level is not null or req.required_level is not null);

-- Kategori bazlı skorlar ve "hazır olma yüzdesi" (Progress bar verisi)
create or replace view public.v_category_scores
with (security_invoker = true) as
select
  user_id,
  assessment_id,
  category,
  round(avg(current_level)::numeric, 2) as avg_current,
  round((avg(required_level) filter (where required_level > 0))::numeric, 2) as avg_required,
  round(
    100.0 * (sum(least(current_level, required_level) * importance) filter (where required_level > 0))
    / nullif((sum(required_level * importance) filter (where required_level > 0)), 0)
  , 1) as readiness_pct
from public.v_skill_gap
group by user_id, assessment_id, category;

-- Check-up geçmişi (zaman içinde gelişim grafiği)
create or replace view public.v_assessment_history
with (security_invoker = true) as
select
  a.user_id,
  a.id            as assessment_id,
  a.completed_at,
  s.category,
  round(avg(r.level)::numeric, 2) as avg_level
from public.assessments a
join public.assessment_skill_ratings r on r.assessment_id = a.id
join public.skills s                   on s.id = r.skill_id
where a.status = 'completed'
group by a.user_id, a.id, a.completed_at, s.category;

-- Anonim kullanıcılar view'lara erişemesin
revoke all on public.v_latest_assessment, public.v_skill_gap,
              public.v_category_scores, public.v_assessment_history from anon;
