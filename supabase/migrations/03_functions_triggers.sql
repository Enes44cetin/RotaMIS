-- =========================================================
-- 03_functions_triggers.sql  |  RotaMIS - İş kuralları
-- Çalıştırma sırası: 3
-- =========================================================

-- ---------- updated_at otomatik güncelleme ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_universities_updated before update on public.universities
  for each row execute function public.set_updated_at();
create trigger trg_career_paths_updated before update on public.career_paths
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_skills_updated before update on public.skills
  for each row execute function public.set_updated_at();
create trigger trg_cpsr_updated before update on public.career_path_skill_requirements
  for each row execute function public.set_updated_at();
create trigger trg_assessments_updated before update on public.assessments
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- Admin kontrolü (RLS içinde kullanılır, recursion'ı önler) ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Yeni kullanıcı kaydında otomatik profil oluşturma ----------
-- Frontend signUp sırasında options.data = { full_name, locale, kvkk_accepted } gönderecek.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, preferred_locale, kvkk_accepted_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' in ('tr', 'en')
         then new.raw_user_meta_data ->> 'locale' else 'tr' end,
    case when new.raw_user_meta_data ->> 'kvkk_accepted' = 'true' then now() else null end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- XP verme (dahili) ----------
create or replace function public.award_xp(
  p_user_id       uuid,
  p_amount        int,
  p_reason        public.xp_reason,
  p_task_id       uuid default null,
  p_assessment_id uuid default null,
  p_badge_id      uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;

  insert into public.xp_events (user_id, amount, reason, task_id, assessment_id, badge_id)
  values (p_user_id, p_amount, p_reason, p_task_id, p_assessment_id, p_badge_id);

  update public.profiles
     set total_xp = total_xp + p_amount
   where id = p_user_id;
end;
$$;

-- ---------- Günlük seri (streak) güncelleme (dahili) ----------
create or replace function public.register_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today  date := (now() at time zone 'Europe/Istanbul')::date;
  v_last   date;
  v_streak int;
begin
  select last_activity_date, current_streak
    into v_last, v_streak
    from public.profiles
   where id = p_user_id
   for update;

  if v_last = v_today then
    return;                          -- bugün zaten aktif
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;        -- seri devam ediyor
  else
    v_streak := 1;                   -- seri yeniden başlıyor
  end if;

  update public.profiles
     set current_streak     = v_streak,
         longest_streak     = greatest(longest_streak, v_streak),
         last_activity_date = v_today
   where id = p_user_id;
end;
$$;

-- ---------- Rozet kontrolü ve verme (dahili) ----------
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_badge  record;
  v_tasks  int;
  v_assess int;
  v_xp     int;
  v_streak int;
  v_metric int;
begin
  select count(*) into v_tasks
    from public.tasks where user_id = p_user_id and status = 'completed';
  select count(*) into v_assess
    from public.assessments where user_id = p_user_id and status = 'completed';
  select total_xp, longest_streak into v_xp, v_streak
    from public.profiles where id = p_user_id;

  for v_badge in
    select b.*
      from public.badges b
     where b.is_active
       and not exists (
         select 1 from public.user_badges ub
          where ub.user_id = p_user_id and ub.badge_id = b.id
       )
     order by b.sort_order
  loop
    v_metric := case v_badge.criteria_type
                  when 'tasks_completed'       then v_tasks
                  when 'xp_total'              then v_xp
                  when 'streak_days'           then v_streak
                  when 'assessments_completed' then v_assess
                  else 0
                end;

    if v_metric >= v_badge.criteria_value then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, v_badge.id)
      on conflict do nothing;

      if v_badge.xp_bonus > 0 then
        perform public.award_xp(p_user_id, v_badge.xp_bonus, 'badge_earned', null, null, v_badge.id);
      end if;
    end if;
  end loop;
end;
$$;

-- ---------- Görev: completed_at yönetimi (BEFORE) ----------
create or replace function public.tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();

-- ---------- Görev: XP / seri / rozet (AFTER) ----------
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
    perform public.register_activity(new.user_id);
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

create trigger trg_tasks_after_status_change
  after update of status on public.tasks
  for each row
  when (old.status is distinct from new.status)
  execute function public.tasks_after_status_change();

-- ---------- Check-up: doğrulama + completed_at (BEFORE) ----------
create or replace function public.assessments_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' and new.status = 'draft' then
    raise exception 'Tamamlanmış bir check-up tekrar taslağa alınamaz.';
  end if;

  if new.status = 'completed' and old.status = 'draft' then
    if new.career_path_id is null then
      raise exception 'Check-up tamamlanmadan önce bir kariyer alanı seçilmelidir.';
    end if;
    if not exists (select 1 from public.assessment_skill_ratings where assessment_id = new.id) then
      raise exception 'Check-up tamamlanmadan önce en az bir beceri puanlanmalıdır.';
    end if;
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_assessments_before_update
  before update on public.assessments
  for each row execute function public.assessments_before_update();

-- ---------- Check-up: profil + XP + rozet (AFTER) ----------
create or replace function public.assessments_after_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set onboarding_completed  = true,
         target_career_path_id = new.career_path_id
   where id = new.user_id;

  perform public.award_xp(new.user_id, 50, 'assessment_completed', null, new.id);
  perform public.register_activity(new.user_id);
  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

create trigger trg_assessments_after_complete
  after update of status on public.assessments
  for each row
  when (old.status = 'draft' and new.status = 'completed')
  execute function public.assessments_after_complete();

-- ---------- Dahili fonksiyonları dışarıdan çağrılamaz yap ----------
revoke execute on function public.award_xp(uuid, int, public.xp_reason, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.register_activity(uuid)                                 from public, anon, authenticated;
revoke execute on function public.check_and_award_badges(uuid)                            from public, anon, authenticated;
revoke execute on function public.handle_new_user()                                       from public, anon, authenticated;
