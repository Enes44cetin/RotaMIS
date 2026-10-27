-- =========================================================
-- 09_admin.sql  |  RotaMIS - Admin Paneli, Eğitim/Sertifika Kataloğu & Denetim
-- Çalıştırma sırası: 9
-- =========================================================

-- ---------- 1. Eğitim, Kurs ve Sertifika Kataloğu ----------
create table if not exists public.learning_resources (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  provider          text not null, -- Coursera, BTK Akademi, Udemy, Kaggle, Microsoft Learn vb.
  url               text not null,
  resource_type     public.task_resource_type not null default 'course',
  language          text not null default 'tr' check (language in ('tr', 'en', 'mixed')),
  pricing           text not null default 'free' check (pricing in ('free', 'freemium', 'paid')),
  estimated_hours   numeric(5,1) default 4.0 check (estimated_hours >= 0),
  difficulty        smallint not null default 1 check (difficulty between 1 and 3),
  gives_certificate boolean not null default false,
  certificate_info  text,
  description       text,
  status            text not null default 'published' check (status in ('draft', 'published', 'archived')),
  last_checked_at   timestamptz,
  link_status       text not null default 'unknown' check (link_status in ('unknown', 'ok', 'broken')),
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists lr_status_idx on public.learning_resources(status, sort_order);
create index if not exists lr_type_idx on public.learning_resources(resource_type);

-- Trigger: learning_resources updated_at
drop trigger if exists trg_learning_resources_updated on public.learning_resources;
create trigger trg_learning_resources_updated before update on public.learning_resources
  for each row execute function public.set_updated_at();

-- ---------- 2. Kaynak ↔ Beceri Bağlantısı (Çoka-Çok) ----------
create table if not exists public.resource_skills (
  resource_id   uuid not null references public.learning_resources(id) on delete cascade,
  skill_id      uuid not null references public.skills(id) on delete cascade,
  min_level     smallint not null default 1 check (min_level between 1 and 5),
  target_level  smallint not null default 3 check (target_level between 1 and 5),
  created_at    timestamptz not null default now(),
  primary key (resource_id, skill_id),
  check (target_level >= min_level)
);

create index if not exists rs_skill_idx on public.resource_skills(skill_id);

-- ---------- 3. Görevlere Kaynak Referansı (tasks.resource_id) ----------
alter table public.tasks
  add column if not exists resource_id uuid references public.learning_resources(id) on delete set null;

create index if not exists tasks_resource_idx on public.tasks(resource_id);

-- ---------- 4. Admin Denetim Kaydı (Audit Log) ----------
create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references public.profiles(id) on delete cascade,
  action       text not null, -- 'update_matrix', 'create_career_path', 'archive_skill', vb.
  entity_type  text not null, -- 'matrix', 'career_path', 'skill', 'university', 'resource'
  entity_id    text,
  details      jsonb not null default '{}'::jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

create index if not exists aal_created_idx on public.admin_audit_log(created_at desc);
create index if not exists aal_admin_idx on public.admin_audit_log(admin_id);

-- ---------- 5. Sektör Matrisi Atomik Kaydetme RPC Fonksiyonu ----------
create or replace function public.save_requirement_matrix(
  p_career_path_id uuid,
  p_requirements   jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req record;
begin
  -- 1. Admin yetkisi doğrula
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem: Bu işlem yalnızca yöneticiler tarafından gerçekleştirilebilir.';
  end if;

  -- 2. Kariyer rotasının var olduğunu doğrula
  if not exists (select 1 from public.career_paths where id = p_career_path_id) then
    raise exception 'Geçersiz kariyer rotası ID.';
  end if;

  -- 3. Mevcut matris satırlarını bu kariyer rotası için temizle
  delete from public.career_path_skill_requirements
   where career_path_id = p_career_path_id;

  -- 4. Yeni gereksinimleri yerleştir
  for v_req in
    select
      (elem->>'skill_id')::uuid as skill_id,
      (elem->>'required_level')::smallint as required_level,
      coalesce((elem->>'importance')::smallint, 2) as importance
    from jsonb_array_elements(p_requirements) as elem
  loop
    if v_req.required_level between 1 and 5 and v_req.importance between 1 and 3 then
      insert into public.career_path_skill_requirements (
        career_path_id,
        skill_id,
        required_level,
        importance,
        data_source,
        updated_at
      ) values (
        p_career_path_id,
        v_req.skill_id,
        v_req.required_level,
        v_req.importance,
        'admin',
        now()
      );
    end if;
  end loop;

  -- 5. Audit log kaydı düş
  insert into public.admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    auth.uid(),
    'update_matrix',
    'career_path',
    p_career_path_id::text,
    jsonb_build_object(
      'career_path_id', p_career_path_id,
      'requirements_count', jsonb_array_length(p_requirements),
      'timestamp', now()
    )
  );
end;
$$;

-- ---------- 6. Row Level Security (RLS) ----------
alter table public.learning_resources enable row level security;
alter table public.resource_skills    enable row level security;
alter table public.admin_audit_log    enable row level security;

-- learning_resources
create policy "resources: aktifleri herkes, admin hepsini görür"
  on public.learning_resources for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "resources: admin ekler"
  on public.learning_resources for insert to authenticated
  with check (public.is_admin());

create policy "resources: admin günceller"
  on public.learning_resources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "resources: admin siler"
  on public.learning_resources for delete to authenticated
  using (public.is_admin());

-- resource_skills
create policy "resource_skills: giriş yapan herkes okur"
  on public.resource_skills for select to authenticated
  using (true);

create policy "resource_skills: admin ekler"
  on public.resource_skills for insert to authenticated
  with check (public.is_admin());

create policy "resource_skills: admin günceller"
  on public.resource_skills for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "resource_skills: admin siler"
  on public.resource_skills for delete to authenticated
  using (public.is_admin());

-- admin_audit_log (salt okunur denetim defteri)
create policy "audit_log: sadece admin okur"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin());

create policy "audit_log: admin ekler"
  on public.admin_audit_log for insert to authenticated
  with check (public.is_admin());

-- ---------- 7. Başlangıç Eğitim & Sertifika Verisi (Seed) ----------
-- Daha önce onboarding.ts içinde sabit kodlanmış olan kaliteli kaynaklar kataloğa aktarılıyor.

do $$
declare
  v_sql_id      uuid;
  v_python_id   uuid;
  v_bpmn_id     uuid;
  v_bi_id       uuid;
  v_db_id       uuid;
  v_comm_id     uuid;
  v_res_id      uuid;
begin
  select id into v_sql_id    from public.skills where slug = 'sql';
  select id into v_python_id from public.skills where slug = 'python';
  select id into v_bpmn_id   from public.skills where slug = 'process-modeling';
  select id into v_bi_id     from public.skills where slug = 'bi-tools';
  select id into v_db_id     from public.skills where slug = 'database-design';
  select id into v_comm_id   from public.skills where slug = 'communication';

  -- 1. SQLBolt
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'SQL Temelleri & İnteraktif Egzersizler',
    'SQLBolt',
    'https://sqlbolt.com/',
    'practice',
    'en',
    'free',
    4.5,
    1,
    'Tarayıcı üzerinden SELECT, JOIN ve toplama fonksiyonları ile interaktif SQL pratiği.',
    false
  ) returning id into v_res_id;

  if v_sql_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_sql_id, 1, 3) on conflict do nothing;
  end if;

  -- 2. Kaggle Pandas
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'Pandas ile Veri Analizi ve Manipülasyonu',
    'Kaggle Learn',
    'https://www.kaggle.com/learn/pandas',
    'course',
    'en',
    'free',
    6.0,
    2,
    'DataFrame filtreleme, gruplama, eksik veri temizleme ve özetleme mikro kursu.',
    true
  ) returning id into v_res_id;

  if v_python_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_python_id, 1, 3) on conflict do nothing;
  end if;

  -- 3. Camunda BPMN
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'BPMN 2.0 ile İş Süreçleri Modelleme Rehberi',
    'Camunda',
    'https://camunda.com/bpmn/',
    'project',
    'en',
    'free',
    4.0,
    2,
    'Havuz, kulvar, olay ve ağ geçitleri ile uçtan uca iş süreci modelleme eğitimi.',
    false
  ) returning id into v_res_id;

  if v_bpmn_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_bpmn_id, 1, 4) on conflict do nothing;
  end if;

  -- 4. Microsoft Learn Power BI
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'Power BI ile Veri Modelleme ve Dashboard Tasarımı',
    'Microsoft Learn',
    'https://learn.microsoft.com/training/powerplatform/power-bi',
    'course',
    'tr',
    'free',
    7.0,
    2,
    'İş zekası raporları, DAX formülleri ve interaktif görselleştirme modülleri.',
    true
  ) returning id into v_res_id;

  if v_bi_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_bi_id, 1, 4) on conflict do nothing;
  end if;

  -- 5. Lucidchart Veri Modelleme
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'Entity Relationship (ER) Şemaları & Veri Modelleme Temelleri',
    'Lucidchart',
    'https://www.lucidchart.com/pages/er-diagrams',
    'article',
    'en',
    'free',
    3.0,
    1,
    'Varlık, nitelik ve ilişkilerin (1-1, 1-N, N-N) modellenmesi ve normalizasyon ilkeleri.',
    false
  ) returning id into v_res_id;

  if v_db_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_db_id, 1, 3) on conflict do nothing;
  end if;

  -- 6. BTK Akademi SQL (Türkçe Örnek)
  insert into public.learning_resources (
    title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate
  ) values (
    'Sıfırdan İleri Seviye SQL Sorgulama',
    'BTK Akademi',
    'https://www.btkakademi.gov.tr/',
    'course',
    'tr',
    'free',
    12.0,
    2,
    'İlişkisel veritabanı yönetimi, karmaşık alt sorgular ve performans optimizasyonu.',
    true
  ) returning id into v_res_id;

  if v_sql_id is not null and v_res_id is not null then
    insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
    values (v_res_id, v_sql_id, 1, 4) on conflict do nothing;
  end if;

end $$;
