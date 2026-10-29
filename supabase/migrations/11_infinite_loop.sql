-- =========================================================
-- 11_infinite_loop.sql  |  RotaMIS - Sonsuz Gelişim Döngüsü (Infinite Learning Loop)
-- Çalıştırma sırası: 11 (Supabase SQL Editor'de güvenle çalıştırılabilir, idempotent)
-- =========================================================

-- ---------- 1. Yeni Enum Tipleri ----------
do $$
begin
  create type public.sprint_kind as enum ('standard', 'checkpoint');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sprint_status as enum ('active', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.assessment_kind as enum ('full', 'mini');
exception
  when duplicate_object then null;
end $$;

-- ---------- 2. Sprints Tablosu ----------
create table if not exists public.sprints (
  id                    uuid primary key default gen_random_uuid(),
  roadmap_id            uuid not null references public.roadmaps(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  sprint_number         int not null check (sprint_number >= 1),
  kind                  public.sprint_kind not null default 'standard',
  status                public.sprint_status not null default 'active',
  source_assessment_id  uuid references public.assessments(id) on delete set null,
  matcher_version       text not null default 'rule-v1',
  focus_skill_ids       uuid[] not null default '{}',
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (roadmap_id, sprint_number)
);

create index if not exists sprints_user_roadmap_idx
  on public.sprints(user_id, roadmap_id, sprint_number);

-- Aynı yol haritasında aynı anda en fazla 1 aktif sprint olabilir
create unique index if not exists sprints_one_active_per_roadmap
  on public.sprints(roadmap_id)
  where status = 'active';

drop trigger if exists trg_sprints_updated on public.sprints;
create trigger trg_sprints_updated before update on public.sprints
  for each row execute function public.set_updated_at();

-- ---------- 3. Mevcut Tablolara Yeni Kolonlar ----------
alter table public.tasks
  add column if not exists sprint_id uuid references public.sprints(id) on delete cascade;

create index if not exists tasks_sprint_idx
  on public.tasks(sprint_id, sort_order);

alter table public.assessments
  add column if not exists kind public.assessment_kind not null default 'full';

alter table public.assessments
  add column if not exists sprint_id uuid references public.sprints(id) on delete set null;

create unique index if not exists assessments_one_mini_per_sprint
  on public.assessments(sprint_id)
  where sprint_id is not null and kind = 'mini' and status = 'completed';

-- ---------- 4. Katalog Tükenme / Talep Sinyali Tablosu (Admin Analitiği) ----------
create table if not exists public.catalog_demand (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  career_path_id  uuid references public.career_paths(id) on delete set null,
  skill_id        uuid references public.skills(id) on delete set null,
  current_level   smallint,
  sprint_number   int not null,
  resolved        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists cd_unresolved_idx
  on public.catalog_demand(resolved, created_at desc);

-- ---------- 5. Tamamlanmış Sprintteki Görevlerin Geri Alınmasını Kilitle (Trigger Güncellemesi) ----------
create or replace function public.tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Tamamlanmış (arşivlenmiş) sprintteki görevlerin durumu bir daha değiştirilemez
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
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- ---------- 6. Mevcut Verileri Geri Doldurma (Backfill) ----------
-- Halihazırda oluşturulmuş yol haritalarındaki sprint_id'si boş görevleri Sprint 1'e bağlar.
do $$
declare
  v_rm record;
  v_sprint_id uuid;
begin
  for v_rm in
    select r.id as roadmap_id, r.user_id, r.assessment_id, r.created_at
      from public.roadmaps r
     where exists (
       select 1 from public.tasks t
        where t.roadmap_id = r.id and t.sprint_id is null
     )
  loop
    select s.id into v_sprint_id
      from public.sprints s
     where s.roadmap_id = v_rm.roadmap_id
       and s.sprint_number = 1;

    if v_sprint_id is null then
      insert into public.sprints (
        roadmap_id,
        user_id,
        sprint_number,
        kind,
        status,
        source_assessment_id,
        matcher_version,
        started_at
      ) values (
        v_rm.roadmap_id,
        v_rm.user_id,
        1,
        'standard',
        'active',
        v_rm.assessment_id,
        'legacy-backfill',
        v_rm.created_at
      ) returning id into v_sprint_id;
    end if;

    update public.tasks
       set sprint_id = v_sprint_id
     where roadmap_id = v_rm.roadmap_id
       and sprint_id is null;
  end loop;
end $$;

-- ---------- 7. RPC 1: append_sprint (AI Metin Sentezlemez — Doğrudan Katalogdan Kopyalar) ----------
-- Yalnızca sunucu tarafında (service_role) çağrılır; kaynak metinlerini DB içinden kopyalar.
create or replace function public.append_sprint(
  p_user_id          uuid,
  p_roadmap_id       uuid,
  p_items            jsonb,
  p_matcher_version  text default 'rule-v1',
  p_focus_skill_ids  uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_sprint   record;
  v_last_sprint     record;
  v_next_number     int;
  v_next_kind       public.sprint_kind;
  v_latest_assess   uuid;
  v_new_sprint_id   uuid;
  v_item_count      int;
  v_item            record;
  v_res             record;
  v_skill_id        uuid;
  v_hours           numeric(5,1);
  v_xp              int;
  v_order           int := 0;
begin
  -- 1. Yol haritası doğrulaması
  if not exists (
    select 1 from public.roadmaps r
     where r.id = p_roadmap_id and r.user_id = p_user_id and r.is_active = true
  ) then
    raise exception 'Aktif yol haritası bulunamadı.';
  end if;

  -- 2. Gönderilen kaynak listesi boyut kontrolü (1..6 görev)
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Geçersiz kaynak listesi formatı.';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 6 then
    raise exception 'Bir sprint en az 1, en fazla 6 görev içerebilir.';
  end if;

  -- 3. Aktif sprint varsa tüm görevlerinin tamamlandığını doğrula ve kapat
  select * into v_active_sprint
    from public.sprints s
   where s.roadmap_id = p_roadmap_id
     and s.status = 'active'
   for update;

  if found then
    if exists (
      select 1 from public.tasks t
       where t.sprint_id = v_active_sprint.id
         and t.status not in ('completed', 'skipped')
    ) then
      raise exception 'Mevcut sprintteki tüm görevler tamamlanmadan yeni sprinte geçilemez.';
    end if;

    if v_active_sprint.kind = 'checkpoint' then
      if not exists (
        select 1 from public.assessments a
         where a.sprint_id = v_active_sprint.id
           and a.kind = 'mini'
           and a.status = 'completed'
      ) then
        raise exception 'Döngü sonu Mini Check-Up tamamlanmadan yeni sprint başlatılamaz.';
      end if;
    end if;

    update public.sprints
       set status = 'completed',
           completed_at = coalesce(completed_at, now())
     where id = v_active_sprint.id;
  end if;

  -- 4. Son sprint numarasını kontrol et (checkpoint kapısı doğrulaması dahil)
  select * into v_last_sprint
    from public.sprints s
   where s.roadmap_id = p_roadmap_id
   order by s.sprint_number desc
   limit 1;

  if found then
    if v_last_sprint.kind = 'checkpoint' then
      if not exists (
        select 1 from public.assessments a
         where a.sprint_id = v_last_sprint.id
           and a.kind = 'mini'
           and a.status = 'completed'
      ) then
        raise exception 'Yeni döngüye geçmek için önce Boss Mini Check-Up tamamlanmalıdır.';
      end if;
    end if;
    v_next_number := v_last_sprint.sprint_number + 1;
  else
    v_next_number := 1;
  end if;

  v_next_kind := case
    when (v_next_number % 4) = 0 then 'checkpoint'::public.sprint_kind
    else 'standard'::public.sprint_kind
  end;

  select a.id into v_latest_assess
    from public.assessments a
   where a.user_id = p_user_id
     and a.status = 'completed'
   order by a.completed_at desc
   limit 1;

  -- 5. Yeni sprint satırını oluştur
  insert into public.sprints (
    roadmap_id,
    user_id,
    sprint_number,
    kind,
    status,
    source_assessment_id,
    matcher_version,
    focus_skill_ids
  ) values (
    p_roadmap_id,
    p_user_id,
    v_next_number,
    v_next_kind,
    'active',
    v_latest_assess,
    coalesce(nullif(p_matcher_version, ''), 'rule-v1'),
    coalesce(p_focus_skill_ids, '{}')
  ) returning id into v_new_sprint_id;

  -- 6. Görevleri DOĞRUDAN learning_resources tablosundan kopyalayarak ekle (Sıfır AI Halüsinasyonu)
  for v_item in
    select
      (elem->>'resource_id')::uuid as resource_id,
      nullif(elem->>'skill_id', '')::uuid as requested_skill_id
    from jsonb_array_elements(p_items) as elem
  loop
    select lr.* into v_res
      from public.learning_resources lr
     where lr.id = v_item.resource_id
       and lr.status = 'published';

    if not found then
      raise exception 'Onaylı olmayan veya bulunamayan eğitim kaynağı: %', v_item.resource_id;
    end if;

    -- Aynı yol haritasında aynı kaynağın mükerrer atanmasını engelle
    if exists (
      select 1 from public.tasks t
       where t.roadmap_id = p_roadmap_id
         and t.resource_id = v_res.id
    ) then
      raise exception 'Bu kaynak yol haritasında zaten kullanılmış: %', v_res.id;
    end if;

    -- Hedef beceriyi doğrula veya kaynağın ilk bağlı becerisini al
    v_skill_id := null;
    if v_item.requested_skill_id is not null then
      select rs.skill_id into v_skill_id
        from public.resource_skills rs
       where rs.resource_id = v_res.id
         and rs.skill_id = v_item.requested_skill_id;
    end if;

    if v_skill_id is null then
      select rs.skill_id into v_skill_id
        from public.resource_skills rs
       where rs.resource_id = v_res.id
       limit 1;
    end if;

    v_order := v_order + 1;
    v_hours := coalesce(v_res.estimated_hours, 4.0);
    v_xp := least(100, greatest(15, round(v_hours * 7 + v_res.difficulty * 5)::int));

    insert into public.tasks (
      roadmap_id,
      sprint_id,
      user_id,
      skill_id,
      resource_id,
      title,
      description,
      resource_url,
      resource_type,
      estimated_hours,
      difficulty,
      xp_reward,
      week_number,
      sort_order,
      status
    ) values (
      p_roadmap_id,
      v_new_sprint_id,
      p_user_id,
      v_skill_id,
      v_res.id,
      v_res.title,
      v_res.description,
      v_res.url,
      v_res.resource_type,
      v_hours,
      v_res.difficulty,
      v_xp,
      v_next_number,
      v_order,
      'pending'
    );
  end loop;

  return v_new_sprint_id;
end;
$$;

revoke execute on function public.append_sprint(uuid, uuid, jsonb, text, uuid[]) from public, anon, authenticated;
grant execute on function public.append_sprint(uuid, uuid, jsonb, text, uuid[]) to service_role;

-- ---------- 8. RPC 2: submit_mini_checkup (Carry-Forward Snapshot + Boss Tamamlama) ----------
create or replace function public.submit_mini_checkup(
  p_sprint_id uuid,
  p_ratings   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id            uuid := auth.uid();
  v_sprint             record;
  v_prev_assess        record;
  v_career_path_id     uuid;
  v_new_assessment_id  uuid;
  v_rating_count       int;
  v_r                  record;
begin
  if v_user_id is null then
    raise exception 'Oturum açmanız gerekiyor.';
  end if;

  if p_ratings is null or jsonb_typeof(p_ratings) <> 'array' then
    raise exception 'Geçersiz puanlama verisi.';
  end if;

  v_rating_count := jsonb_array_length(p_ratings);
  if v_rating_count < 1 or v_rating_count > 12 then
    raise exception 'En az 1, en fazla 12 beceri puanlanabilir.';
  end if;

  -- 1. Sprintin kullanıcıya ait, checkpoint türünde ve tüm görevlerinin tamamlanmış olduğunu doğrula
  select * into v_sprint
    from public.sprints s
   where s.id = p_sprint_id
     and s.user_id = v_user_id
   for update;

  if not found then
    raise exception 'Sprint bulunamadı.';
  end if;

  if v_sprint.kind <> 'checkpoint' then
    raise exception 'Mini Check-Up yalnızca kontrol noktası (4. sprint) sonunda yapılabilir.';
  end if;

  if exists (
    select 1 from public.assessments a
     where a.sprint_id = v_sprint.id
       and a.kind = 'mini'
       and a.status = 'completed'
  ) then
    raise exception 'Bu kontrol noktası için Mini Check-Up zaten tamamlanmış.';
  end if;

  if exists (
    select 1 from public.tasks t
     where t.sprint_id = v_sprint.id
       and t.status not in ('completed', 'skipped')
  ) then
    raise exception 'Mini Check-Up kilidini açmak için bu sprintteki tüm görevleri tamamlamalısın.';
  end if;

  -- 2. Önceki en son tamamlanan değerlendirmeyi (tercihler + taşınacak beceri puanları için) al
  select * into v_prev_assess
    from public.assessments a
   where a.user_id = v_user_id
     and a.status = 'completed'
   order by a.completed_at desc
   limit 1;

  select coalesce(v_prev_assess.career_path_id, p.target_career_path_id)
    into v_career_path_id
    from public.profiles p
   where p.id = v_user_id;

  if v_career_path_id is null then
    raise exception 'Hedef kariyer alanı bulunamadı.';
  end if;

  -- Varsa yarım kalmış eski taslağı temizle (unique draft index çakışmasını önler)
  delete from public.assessments
   where user_id = v_user_id
     and status = 'draft';

  -- 3. Yeni Mini Check-Up taslağı oluştur (öğrenci tercihlerini koruyarak taşı)
  insert into public.assessments (
    user_id,
    status,
    kind,
    sprint_id,
    current_step,
    class_year,
    career_path_id,
    secondary_career_path_id,
    has_internship,
    weekly_hours,
    learning_style,
    target_date,
    goals_note
  ) values (
    v_user_id,
    'draft',
    'mini',
    v_sprint.id,
    5,
    v_prev_assess.class_year,
    v_career_path_id,
    v_prev_assess.secondary_career_path_id,
    v_prev_assess.has_internship,
    v_prev_assess.weekly_hours,
    v_prev_assess.learning_style,
    v_prev_assess.target_date,
    v_prev_assess.goals_note
  ) returning id into v_new_assessment_id;

  -- 4. Önceki tüm beceri puanlarını yeni değerlendirmeye taşı (Carry-Forward Snapshot)
  if v_prev_assess.id is not null then
    insert into public.assessment_skill_ratings (assessment_id, skill_id, level)
    select v_new_assessment_id, r.skill_id, r.level
      from public.assessment_skill_ratings r
     where r.assessment_id = v_prev_assess.id;
  end if;

  -- 5. Öğrencinin bu Mini Check-Up'ta verdiği yeni puanları yaz / güncelle
  for v_r in
    select
      (elem->>'skill_id')::uuid as skill_id,
      (elem->>'level')::smallint as level
    from jsonb_array_elements(p_ratings) as elem
  loop
    if v_r.level < 1 or v_r.level > 5 then
      raise exception 'Beceri puanı 1 ile 5 arasında olmalıdır.';
    end if;

    if not exists (select 1 from public.skills sk where sk.id = v_r.skill_id and sk.is_active = true) then
      raise exception 'Geçersiz beceri kimliği: %', v_r.skill_id;
    end if;

    insert into public.assessment_skill_ratings (assessment_id, skill_id, level)
    values (v_new_assessment_id, v_r.skill_id, v_r.level)
    on conflict (assessment_id, skill_id)
    do update set level = excluded.level;
  end loop;

  -- 6. Değerlendirmeyi 'completed' yap (trg_assessments_after_complete otomatik +50 XP ve rozet verir!)
  update public.assessments
     set status = 'completed'
   where id = v_new_assessment_id;

  -- 7. Checkpoint sprintini tamamlandı olarak mühürle
  update public.sprints
     set status = 'completed',
         completed_at = coalesce(completed_at, now())
   where id = v_sprint.id;

  return jsonb_build_object(
    'assessment_id', v_new_assessment_id,
    'sprint_id', v_sprint.id,
    'xp_awarded', 50
  );
end;
$$;

revoke execute on function public.submit_mini_checkup(uuid, jsonb) from public, anon;
grant execute on function public.submit_mini_checkup(uuid, jsonb) to authenticated;

-- ---------- 9. Row Level Security (RLS) ----------
alter table public.sprints        enable row level security;
alter table public.catalog_demand enable row level security;

drop policy if exists "sprints: kendi sprintlerini veya admin hepsini görür" on public.sprints;
create policy "sprints: kendi sprintlerini veya admin hepsini görür"
  on public.sprints for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "sprints: admin yönetir" on public.sprints;
create policy "sprints: admin yönetir"
  on public.sprints for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog_demand: sadece admin okur ve yönetir" on public.catalog_demand;
create policy "catalog_demand: sadece admin okur ve yönetir"
  on public.catalog_demand for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 10. Sonsuz Döngü İçin Zenginleştirilmiş Başlangıç Kataloğu (Mükerrer Kayıt Yapmaz) ----------
-- Öğrencilerin 4+ sprint boyunca kesintisiz ilerleyebilmesi için temel YBS becerilerine onaylı kaynaklar ekler.
do $$
declare
  v_rec record;
  v_skill_id uuid;
  v_res_id uuid;
begin
  for v_rec in
    select * from (values
      ('İleri Excel: Pivot Tablolar, Power Query ve Veri Analizi', 'Microsoft Learn', 'https://learn.microsoft.com/training/modules/get-transform-data-power-bi/', 'course'::public.task_resource_type, 'tr', 'free', 5.0, 2, 'Kurumsal raporlama için veri temizleme, birleştirme ve dinamik özet tablo pratikleri.', false, 'excel', 1, 4),
      ('İş Analistleri İçin Gereksinim Mühendisliği ve User Story Yazımı', 'Atlassian University', 'https://www.atlassian.com/agile/project-management/user-stories', 'article'::public.task_resource_type, 'en', 'free', 3.5, 2, 'INVEST kriterlerine uygun kullanıcı hikayeleri, kabul kriterleri ve kapsam analizi rehberi.', false, 'requirements-analysis', 1, 4),
      ('Agile & Scrum Temelleri: Sprint Planlama ve Retrospektif', 'Scrum.org', 'https://www.scrum.org/pathway/scrum-master/', 'course'::public.task_resource_type, 'en', 'free', 6.0, 2, 'Çevik ürün geliştirme ritüelleri, backlog önceliklendirme ve Scrum rolleri öğrenme yolu.', false, 'agile-scrum', 1, 4),
      ('Uygulamalı Veri Görselleştirme ve Hikaye Anlatımı Projesi', 'Kaggle Learn', 'https://www.kaggle.com/learn/data-visualization', 'project'::public.task_resource_type, 'en', 'free', 5.0, 2, 'Gerçek veri setleri üzerinde doğru grafik seçimi ve yönetici özeti panosu oluşturma.', true, 'bi-tools', 2, 5),
      ('SQL Performans, Window Functions ve Analitik Sorgular', 'Mode SQL Tutorial', 'https://mode.com/sql-tutorial/sql-window-functions/', 'practice'::public.task_resource_type, 'en', 'free', 5.5, 3, 'OVER, PARTITION BY, LAG/LEAD ve kümülatif metriklerle ileri seviye analitik SQL egzersizleri.', false, 'sql', 2, 5),
      ('Kurumsal ERP Süreçlerine Giriş (SAP S/4HANA Genel Bakış)', 'SAP Learning', 'https://learning.sap.com/learning-journeys/discovering-sap-business-technology-platform', 'course'::public.task_resource_type, 'en', 'free', 6.5, 2, 'Tedarikten tahsilata (O2C / P2P) kurumsal kaynak planlama modüllerinin entegrasyonu.', true, 'erp', 1, 4),
      ('BT Projelerinde Kapsam, Risk ve Paydaş Yönetimi', 'Google / Coursera Audit', 'https://www.PMI.org/kickoff', 'course'::public.task_resource_type, 'en', 'free', 4.5, 2, 'PMI Kickoff interaktif modülü ile proje başlatma, zaman çizelgesi ve risk matrisi hazırlama.', true, 'project-management', 1, 4),
      ('Python ile Keşifsel Veri Analizi (EDA) Vaka Çalışması', 'freeCodeCamp', 'https://www.freecodecamp.org/learn/data-analysis-with-python/', 'project'::public.task_resource_type, 'en', 'free', 8.0, 3, 'NumPy, Pandas ve Matplotlib kullanarak uçtan uca gerçek dünya veri analizi projesi.', true, 'python', 2, 5),
      ('YBS Uzmanları İçin Finansal Tablolar ve Maliyet Analizi', 'Khan Academy', 'https://tr.khanacademy.org/economics-finance-domain/core-finance/accounting-and-financial-stateme', 'video'::public.task_resource_type, 'tr', 'free', 4.0, 1, 'Bilanço, gelir tablosu, nakit akışı ve yatırım getirisi (ROI) kavramlarının iş analiziyle bağı.', false, 'finance-basics', 1, 3),
      ('Paydaş İletişimi ve Teknik Olmayan Ekiplere Sunum Sanatı', 'MIT OpenCourseWare', 'https://ocw.mit.edu/courses/15-279-management-communication-for-undergraduates-fall-2012/', 'article'::public.task_resource_type, 'en', 'free', 3.5, 2, 'Veri bulgularını ve teknik mimari kararları iş birimlerine ikna edici biçimde aktarma ilkeleri.', false, 'communication', 1, 4),
      ('Yapılandırılmış Problem Çözme ve Kök Neden Analizi (5 Neden & Balık Kılçığı)', 'MindTools', 'https://www.mindtools.com/ag6p79v/root-cause-analysis', 'practice'::public.task_resource_type, 'en', 'free', 3.0, 2, 'Karmaşık iş ve sistem darboğazlarını parçalara ayırarak kök neden tespiti yapma pratiği.', false, 'problem-solving', 1, 4),
      ('Süreç İyileştirme: As-Is / To-Be Analizi ve Darboğaz Tespiti', 'IBM Documentation', 'https://www.ibm.com/topics/business-process-modeling', 'article'::public.task_resource_type, 'en', 'free', 4.0, 3, 'Mevcut süreç haritasından hedef süreç tasarımına geçiş ve otomasyon fırsatlarının belirlenmesi.', false, 'process-modeling', 2, 5),
      ('İlişkisel Veritabanı Normalizasyon (1NF-3NF) ve İndeksleme Tasarımı', 'PostgreSQL Tutorial', 'https://www.postgresqltutorial.com/postgresql-getting-started/', 'practice'::public.task_resource_type, 'en', 'free', 5.0, 2, 'Tablo şeması tasarımı, yabancı anahtar kısıtları ve sorgu planı okuma temelleri.', false, 'database-design', 2, 4),
      ('Global Teknoloji Ekipleri İçin İş İngilizcesi ve Dokümantasyon', 'British Council LearnEnglish', 'https://learnenglish.britishcouncil.org/business-english', 'practice'::public.task_resource_type, 'en', 'free', 4.5, 2, 'Toplantı yönetimi, teknik doküman yazımı ve asenkron yazılı iletişim kalıpları.', false, 'english', 1, 4)
    ) as t(title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate, skill_slug, min_lvl, target_lvl)
  loop
    if not exists (select 1 from public.learning_resources lr where lr.url = v_rec.url) then
      insert into public.learning_resources (
        title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate, status
      ) values (
        v_rec.title, v_rec.provider, v_rec.url, v_rec.resource_type, v_rec.language, v_rec.pricing,
        v_rec.estimated_hours, v_rec.difficulty, v_rec.description, v_rec.gives_certificate, 'published'
      ) returning id into v_res_id;

      select id into v_skill_id from public.skills where slug = v_rec.skill_slug;
      if v_skill_id is not null and v_res_id is not null then
        insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
        values (v_res_id, v_skill_id, v_rec.min_lvl, v_rec.target_lvl)
        on conflict do nothing;
      end if;
    end if;
  end loop;
end $$;

