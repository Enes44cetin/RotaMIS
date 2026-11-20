-- =========================================================
-- 15_lean_scalable_tasks.sql  |  RotaMIS - Yalın & 20 Mesleğe Ölçeklenen Görev Motoru
-- Çalıştırma sırası: 15 (Supabase SQL Editor'de güvenle çalıştırılabilir, idempotent)
-- =========================================================

-- ---------- 1. Gizli Beceri (%99 Hazırlık Skoru) Hatasını Düzelt ----------
-- Check-up ekranında sorulmayan (is_core_checkup = false) hiçbir beceri arka planda Seviye 1
-- sayılıp hazırlık skorunu %99'a düşürmemeli ve hayalet açık üretmemelidir.
update public.career_path_skill_requirements
   set is_core_checkup = true
 where is_core_checkup = false;

-- v_skill_gap görünümünü mevcut kolon sırası ve ::int tiplerini BİREBİR koruyarak güncelle (42P16 koruması)
create or replace view public.v_skill_gap
with (security_invoker = true) as
select
  la.user_id,
  la.id                                                   as assessment_id,
  la.career_path_id,
  s.id                                                    as skill_id,
  s.slug                                                  as skill_slug,
  s.category,
  s.name_tr,
  s.name_en,
  s.sort_order,
  coalesce(r.level, 1)::int                               as current_level,
  coalesce(req.required_level, 0)::int                    as required_level,
  coalesce(req.importance, 1)::int                        as importance,
  greatest(coalesce(req.required_level, 0) - coalesce(r.level, 1), 0)::int as gap,
  s.name_tr                                               as skill_name_tr,
  coalesce(r.level, 1)::int                               as student_level,
  cp.name_tr                                              as career_path_name,
  req.is_radar_axis                                       as is_radar_axis,
  req.axis_order::int                                     as axis_order,
  coalesce(nullif(req.axis_label_tr, ''), s.name_tr)      as axis_label_tr,
  req.demand_pct                                          as demand_pct,
  req.mention_count                                       as mention_count,
  req.total_postings                                      as total_postings,
  req.priority_label                                      as priority_label,
  req.display_badge                                       as display_badge,
  req.is_core_checkup                                     as is_core_checkup,
  s.prompt_tr                                             as prompt_tr,
  s.level_anchors                                         as level_anchors
from public.v_latest_assessment la
join public.career_path_skill_requirements req
  on req.career_path_id = la.career_path_id
join public.skills s
  on s.id = req.skill_id and s.is_active = true
left join public.career_paths cp
  on cp.id = la.career_path_id
left join public.assessment_skill_ratings r
  on r.assessment_id = la.id and r.skill_id = s.id
where (req.is_core_checkup = true or r.level is not null);

revoke all on public.v_skill_gap from anon;

-- ---------- 2. Her Beceri İçin 3 Kademeli Yalın Görev Üretici Fonksiyon ----------
-- 20+ meslek eklendiğinde her beceri için tek tek hikâyeli kurs yazmak yerine,
-- beceriye bağlı 3 standart yetkinlik kademesini (Temel 1->2, Uygulama 2->4, İleri 4->5) otomatik üretir.
create or replace function public.ensure_lean_skill_resources(
  p_skill_id uuid,
  p_slug     text,
  p_name_tr  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier   record;
  v_res_id uuid;
  v_url    text;
begin
  if p_skill_id is null or p_slug is null or p_name_tr is null then
    return;
  end if;

  for v_tier in
    select * from (values
      (
        1,
        p_name_tr || ' — Temel Yetkinlik',
        p_name_tr || ' alanında temel kavramları ve çalışma prensiplerini kavrayarak başlangıç seviyesini tamamla.',
        'practice'::public.task_resource_type,
        3.0::numeric(5,1),
        1::smallint,
        25::int,
        1::smallint,
        2::smallint
      ),
      (
        2,
        p_name_tr || ' — Uygulama & Pratik',
        p_name_tr || ' yetkinliğini gerçek senaryolar ve pratik uygulamalarla bağımsız kullanabilecek düzeye taşı.',
        'practice'::public.task_resource_type,
        4.0::numeric(5,1),
        2::smallint,
        40::int,
        2::smallint,
        4::smallint
      ),
      (
        3,
        p_name_tr || ' — İleri Seviye & Sektör Standardı',
        p_name_tr || ' alanında karmaşık problemleri çözebilecek ve mimari kararlar alabilecek sektör uzmanlığı düzeyine ulaş.',
        'project'::public.task_resource_type,
        5.0::numeric(5,1),
        3::smallint,
        60::int,
        4::smallint,
        5::smallint
      )
    ) as t(tier_num, title, description, res_type, hours, diff, xp, min_lvl, target_lvl)
  loop
    v_url := 'https://rotamis.local/skill/' || p_slug || '/tier-' || v_tier.tier_num;
    v_res_id := null;

    select lr.id into v_res_id
      from public.learning_resources lr
     where lr.url = v_url
     limit 1;

    if v_res_id is null then
      insert into public.learning_resources (
        title,
        provider,
        url,
        resource_type,
        language,
        pricing,
        estimated_hours,
        difficulty,
        xp_reward,
        gives_certificate,
        description,
        status,
        link_status,
        sort_order
      ) values (
        v_tier.title,
        'RotaMIS Yetkinlik Hedefi',
        v_url,
        v_tier.res_type,
        'tr',
        'free',
        v_tier.hours,
        v_tier.diff,
        v_tier.xp,
        false,
        v_tier.description,
        'published',
        'ok',
        v_tier.tier_num * 10
      ) returning id into v_res_id;
    else
      update public.learning_resources
         set title           = v_tier.title,
             description     = v_tier.description,
             resource_type   = v_tier.res_type,
             estimated_hours = v_tier.hours,
             difficulty      = v_tier.diff,
             xp_reward       = v_tier.xp,
             status          = 'published',
             link_status     = 'ok'
       where id = v_res_id;
    end if;

    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, p_skill_id, v_tier.min_lvl, v_tier.target_lvl)
    on conflict (resource_id, skill_id) do update
      set min_level    = excluded.min_level,
          target_level = excluded.target_level;
  end loop;
end;
$$;

revoke execute on function public.ensure_lean_skill_resources(uuid, text, text) from public, anon, authenticated;

-- ---------- 3. skills Tablosu Trigger'ı (Yeni Meslek / Beceri Eklendiğinde Otomatik Çalışır) ----------
create or replace function public.trg_fn_skills_ensure_lean_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active = true then
    perform public.ensure_lean_skill_resources(new.id, new.slug, new.name_tr);
  end if;
  return new;
end;
$$;

revoke execute on function public.trg_fn_skills_ensure_lean_resources() from public, anon, authenticated;

drop trigger if exists trg_skills_ensure_lean_resources on public.skills;
create trigger trg_skills_ensure_lean_resources
  after insert or update of slug, name_tr, is_active on public.skills
  for each row
  execute function public.trg_fn_skills_ensure_lean_resources();

-- ---------- 4. Eski Hikâyeli Kaynakları Arşivle & Tüm Mevcut Beceriler İçin Yalın Görevleri Üret ----------
update public.learning_resources
   set status = 'archived'
 where url not like 'https://rotamis.local/skill/%';

do $$
declare
  v_sk record;
begin
  for v_sk in
    select id, slug, name_tr
      from public.skills
     where is_active = true
  loop
    perform public.ensure_lean_skill_resources(v_sk.id, v_sk.slug, v_sk.name_tr);
  end loop;
end $$;

-- ---------- 5. Öğrencilerin Mevcut Açık Görevlerini de Yalın Başlıklarla Senkronize Et ----------
update public.tasks t
   set resource_id     = lr.id,
       title           = lr.title,
       description     = lr.description,
       resource_url    = lr.url,
       resource_type   = lr.resource_type,
       estimated_hours = lr.estimated_hours,
       difficulty      = lr.difficulty,
       xp_reward       = coalesce(lr.xp_reward, t.xp_reward)
  from public.skills s,
       public.learning_resources lr
 where t.skill_id = s.id
   and t.status in ('pending', 'in_progress')
   and lr.url = 'https://rotamis.local/skill/' || s.slug || '/tier-' || least(3, greatest(1, coalesce(t.difficulty, 1)));
