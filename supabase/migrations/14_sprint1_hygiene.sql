-- =========================================================
-- 14_sprint1_hygiene.sql  |  RotaMIS - Sprint 1 Hijyen & Bütünlük
-- Çalıştırma sırası: 14 (Supabase SQL Editor'de güvenle çalıştırılabilir, idempotent)
-- =========================================================

-- ---------- 1. tasks.ever_completed_at + Seri Sömürüsü Koruması (D1) ----------
-- Bir görev ilk kez tamamlandığında ever_completed_at damgalanır ve geri alınsa bile silinmez.
-- Böylece aynı görev geri alınıp ertesi gün tekrar işaretlenerek seri (streak) sahte biçimde uzatılamaz.
alter table public.tasks
  add column if not exists ever_completed_at timestamptz;

update public.tasks
   set ever_completed_at = coalesce(completed_at, now())
 where status = 'completed'
   and ever_completed_at is null;

create or replace function public.tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Tamamlanmış (mühürlü) sprintteki görevlerin durumu bir daha değiştirilemez
  if old.sprint_id is not null and old.status is distinct from new.status then
    if exists (
      select 1 from public.sprints s
       where s.id = old.sprint_id and s.status = 'completed'
    ) then
      raise exception 'Tamamlanmış bir sprintteki görevlerin durumu değiştirilemez.';
    end if;
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
    if old.ever_completed_at is null then
      new.ever_completed_at := now();
    end if;
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.tasks_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount int;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.award_xp(new.user_id, new.xp_reward, 'task_completed', new.id);

    -- Seri yalnızca görevin İLK tamamlanışında güncellenir (sömürü koruması)
    if old.ever_completed_at is null then
      perform public.register_activity(new.user_id);
    end if;

    perform public.check_and_award_badges(new.user_id);

  elsif old.status = 'completed' and new.status <> 'completed' then
    -- İşaret geri alınırsa XP de geri alınır (rozetler kalıcıdır)
    delete from public.xp_events
     where task_id = new.id and reason = 'task_completed'
    returning amount into v_amount;

    if v_amount is not null then
      update public.profiles
         set total_xp = greatest(total_xp - v_amount, 0)
       where id = new.user_id;
    end if;
  end if;

  return new;
end;
$$;

-- ---------- 2. Kırık Link / Kaynak Sorun Bildirimleri (resource_reports) ----------
create table if not exists public.resource_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid references public.learning_resources(id) on delete set null,
  task_id     uuid references public.tasks(id) on delete set null,
  reason      text not null check (reason in ('broken_link', 'outdated', 'other')),
  note        text check (char_length(note) <= 500),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists resource_reports_unresolved_idx
  on public.resource_reports(resolved, created_at desc);

create unique index if not exists resource_reports_open_user_res_uidx
  on public.resource_reports(user_id, resource_id)
  where resolved = false and resource_id is not null;

alter table public.resource_reports enable row level security;

drop policy if exists "resource_reports: öğrenci kendi bildirimini ekler" on public.resource_reports;
create policy "resource_reports: öğrenci kendi bildirimini ekler"
  on public.resource_reports for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "resource_reports: öğrenci kendi bildirimlerini veya admin hepsini görür" on public.resource_reports;
create policy "resource_reports: öğrenci kendi bildirimlerini veya admin hepsini görür"
  on public.resource_reports for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "resource_reports: admin yönetir" on public.resource_reports;
create policy "resource_reports: admin yönetir"
  on public.resource_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 3. Patika Sıfırlamadan Çalışma Tercihi Güncelleme RPC ----------
create or replace function public.update_student_learning_preferences(
  p_weekly_hours   smallint,
  p_learning_style public.learning_style
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id       uuid := auth.uid();
  v_assessment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Oturum açmanız gerekiyor.';
  end if;

  if p_weekly_hours is null or p_weekly_hours < 1 or p_weekly_hours > 60 then
    raise exception 'Haftalık çalışma süresi 1 ile 60 saat arasında olmalıdır.';
  end if;

  if p_learning_style is null then
    raise exception 'Geçerli bir öğrenme stili seçilmelidir.';
  end if;

  select a.id into v_assessment_id
    from public.assessments a
   where a.user_id = v_user_id
     and a.status = 'completed'
   order by a.completed_at desc nulls last, a.created_at desc
   limit 1;

  if v_assessment_id is null then
    raise exception 'Güncellenecek tamamlanmış değerlendirme bulunamadı.';
  end if;

  update public.assessments
     set weekly_hours   = p_weekly_hours,
         learning_style = p_learning_style,
         updated_at     = now()
   where id = v_assessment_id
     and user_id = v_user_id;
end;
$$;

revoke execute on function public.update_student_learning_preferences(smallint, public.learning_style) from public, anon;
grant execute on function public.update_student_learning_preferences(smallint, public.learning_style) to authenticated;
