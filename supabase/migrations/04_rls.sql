-- =========================================================
-- 04_rls.sql  |  RotaMIS - Row Level Security
-- Çalıştırma sırası: 4
-- Not: (select auth.uid()) kalıbı Supabase'in önerdiği performans optimizasyonudur.
-- =========================================================

alter table public.universities                   enable row level security;
alter table public.profiles                       enable row level security;
alter table public.career_paths                   enable row level security;
alter table public.skills                         enable row level security;
alter table public.career_path_skill_requirements enable row level security;
alter table public.assessments                    enable row level security;
alter table public.assessment_skill_ratings       enable row level security;
alter table public.roadmaps                       enable row level security;
alter table public.tasks                          enable row level security;
alter table public.badges                         enable row level security;
alter table public.user_badges                    enable row level security;
alter table public.xp_events                      enable row level security;

-- ================= PROFILES =================
create policy "profiles: kendi profilini veya admin hepsini görür"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: kendi profilini günceller"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sütun bazlı kısıt: öğrenci role / XP / streak alanlarını DEĞİŞTİREMEZ
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, university_id, university_other, preferred_locale, target_career_path_id, kvkk_accepted_at)
  on public.profiles to authenticated;

-- ================= KATALOG: universities =================
create policy "universities: aktifleri herkes, admin hepsini görür"
  on public.universities for select to authenticated
  using (is_active or public.is_admin());
create policy "universities: admin ekler"
  on public.universities for insert to authenticated
  with check (public.is_admin());
create policy "universities: admin günceller"
  on public.universities for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "universities: admin siler"
  on public.universities for delete to authenticated
  using (public.is_admin());

-- ================= KATALOG: career_paths =================
create policy "career_paths: aktifleri herkes, admin hepsini görür"
  on public.career_paths for select to authenticated
  using (is_active or public.is_admin());
create policy "career_paths: admin ekler"
  on public.career_paths for insert to authenticated
  with check (public.is_admin());
create policy "career_paths: admin günceller"
  on public.career_paths for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "career_paths: admin siler"
  on public.career_paths for delete to authenticated
  using (public.is_admin());

-- ================= KATALOG: skills =================
create policy "skills: aktifleri herkes, admin hepsini görür"
  on public.skills for select to authenticated
  using (is_active or public.is_admin());
create policy "skills: admin ekler"
  on public.skills for insert to authenticated
  with check (public.is_admin());
create policy "skills: admin günceller"
  on public.skills for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "skills: admin siler"
  on public.skills for delete to authenticated
  using (public.is_admin());

-- ================= KATALOG: career_path_skill_requirements =================
create policy "requirements: giriş yapan herkes görür"
  on public.career_path_skill_requirements for select to authenticated
  using (true);
create policy "requirements: admin ekler"
  on public.career_path_skill_requirements for insert to authenticated
  with check (public.is_admin());
create policy "requirements: admin günceller"
  on public.career_path_skill_requirements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "requirements: admin siler"
  on public.career_path_skill_requirements for delete to authenticated
  using (public.is_admin());

-- ================= KATALOG: badges =================
create policy "badges: aktifleri herkes, admin hepsini görür"
  on public.badges for select to authenticated
  using (is_active or public.is_admin());
create policy "badges: admin ekler"
  on public.badges for insert to authenticated
  with check (public.is_admin());
create policy "badges: admin günceller"
  on public.badges for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "badges: admin siler"
  on public.badges for delete to authenticated
  using (public.is_admin());

-- ================= ASSESSMENTS =================
create policy "assessments: kendi kayıtlarını veya admin hepsini görür"
  on public.assessments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "assessments: sadece kendine taslak oluşturur"
  on public.assessments for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'draft');

create policy "assessments: sadece kendi taslağını günceller"
  on public.assessments for update to authenticated
  using (user_id = (select auth.uid()) and status = 'draft')
  with check (user_id = (select auth.uid()));

create policy "assessments: sadece kendi taslağını siler"
  on public.assessments for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- ================= ASSESSMENT_SKILL_RATINGS =================
create policy "ratings: kendi puanlarını veya admin hepsini görür"
  on public.assessment_skill_ratings for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.assessments a
       where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  );

create policy "ratings: sadece kendi taslağına ekler"
  on public.assessment_skill_ratings for insert to authenticated
  with check (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_id and a.user_id = (select auth.uid()) and a.status = 'draft'
    )
  );

create policy "ratings: sadece kendi taslağında günceller"
  on public.assessment_skill_ratings for update to authenticated
  using (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_id and a.user_id = (select auth.uid()) and a.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_id and a.user_id = (select auth.uid()) and a.status = 'draft'
    )
  );

create policy "ratings: sadece kendi taslağında siler"
  on public.assessment_skill_ratings for delete to authenticated
  using (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_id and a.user_id = (select auth.uid()) and a.status = 'draft'
    )
  );

-- ================= ROADMAPS =================
-- Öğrenci sadece okur. Yazma işlemleri sunucuda service_role ile (RLS'i bypass eder) yapılır.
create policy "roadmaps: kendi yol haritasını veya admin hepsini görür"
  on public.roadmaps for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "roadmaps: admin yönetir"
  on public.roadmaps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ================= TASKS =================
create policy "tasks: kendi görevlerini veya admin hepsini görür"
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "tasks: kendi görevinin durumunu günceller"
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tasks: admin yönetir"
  on public.tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Sütun bazlı kısıt: öğrenci SADECE status alanını değiştirebilir (xp_reward'ı şişiremez)
revoke update on public.tasks from anon, authenticated;
grant update (status) on public.tasks to authenticated;

-- ================= USER_BADGES & XP_EVENTS (salt okunur) =================
create policy "user_badges: kendi rozetlerini veya admin hepsini görür"
  on public.user_badges for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "xp_events: kendi XP geçmişini veya admin hepsini görür"
  on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
