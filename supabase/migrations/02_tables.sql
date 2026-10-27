-- =========================================================
-- 02_tables.sql  |  RotaMIS - Tablolar, ilişkiler, indeksler
-- Çalıştırma sırası: 2
-- =========================================================

-- ---------- Üniversiteler (katalog, admin yönetir) ----------
create table public.universities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  city        text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Kariyer alanları (katalog, admin yönetir) ----------
create table public.career_paths (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_tr         text not null,
  name_en         text not null,
  description_tr  text,
  description_en  text,
  icon            text,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- Profiller (auth.users ile 1-1) ----------
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text not null,
  full_name              text,
  avatar_url             text,
  university_id          uuid references public.universities(id) on delete set null,
  university_other       text check (char_length(university_other) <= 150), -- "Listede yok" seçilirse
  role                   public.user_role not null default 'student',
  preferred_locale       text not null default 'tr' check (preferred_locale in ('tr', 'en')),
  target_career_path_id  uuid references public.career_paths(id) on delete set null,
  onboarding_completed   boolean not null default false,
  kvkk_accepted_at       timestamptz,
  total_xp               int not null default 0 check (total_xp >= 0),
  current_streak         int not null default 0 check (current_streak >= 0),
  longest_streak         int not null default 0 check (longest_streak >= 0),
  last_activity_date     date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_university_idx on public.profiles(university_id);

-- ---------- Beceriler (katalog, admin yönetir) ----------
create table public.skills (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  category        public.skill_category not null,
  name_tr         text not null,
  name_en         text not null,
  description_tr  text,
  description_en  text,
  icon            text,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index skills_category_idx on public.skills(category, sort_order);

-- ---------- Sektör beklentileri (kariyer × beceri, admin yönetir) ----------
create table public.career_path_skill_requirements (
  career_path_id  uuid not null references public.career_paths(id) on delete cascade,
  skill_id        uuid not null references public.skills(id) on delete cascade,
  required_level  smallint not null check (required_level between 1 and 5),
  importance      smallint not null default 2 check (importance between 1 and 3), -- 1: iyi olur, 3: kritik
  data_source     text not null default 'manual',
  last_synced_at  timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (career_path_id, skill_id)
);
create index cpsr_skill_idx on public.career_path_skill_requirements(skill_id);

-- ---------- Check-up (değerlendirme) kayıtları ----------
create table public.assessments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  status                    public.assessment_status not null default 'draft',
  current_step              smallint not null default 1 check (current_step between 1 and 5),
  -- Adım 1: Temel bilgiler
  class_year                smallint check (class_year between 0 and 5), -- 0: Hazırlık, 5: Mezun
  career_path_id            uuid references public.career_paths(id) on delete set null,
  secondary_career_path_id  uuid references public.career_paths(id) on delete set null,
  has_internship            boolean,
  -- Adım 5: Hedefler & tercihler
  weekly_hours              smallint check (weekly_hours between 1 and 60),
  learning_style            public.learning_style,
  target_date               date,
  goals_note                text check (char_length(goals_note) <= 1000),
  -- Zaman damgaları
  started_at                timestamptz not null default now(),
  completed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index assessments_user_idx on public.assessments(user_id, completed_at desc);
-- Her kullanıcının aynı anda en fazla 1 taslağı olabilir
create unique index assessments_one_draft_per_user on public.assessments(user_id) where status = 'draft';

-- ---------- Check-up beceri puanları (Adım 2-3-4) ----------
create table public.assessment_skill_ratings (
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  skill_id       uuid not null references public.skills(id) on delete cascade,
  level          smallint not null check (level between 1 and 5),
  created_at     timestamptz not null default now(),
  primary key (assessment_id, skill_id)
);
create index asr_skill_idx on public.assessment_skill_ratings(skill_id);

-- ---------- AI yol haritaları ----------
create table public.roadmaps (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  assessment_id     uuid references public.assessments(id) on delete set null,
  career_path_id    uuid references public.career_paths(id) on delete set null,
  title             text not null,
  summary           text,
  source            public.roadmap_source not null default 'mock',
  model_version     text,
  generation_input  jsonb,             -- AI'a gönderilen girdinin anlık görüntüsü (debug/denetim)
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index roadmaps_user_idx on public.roadmaps(user_id, created_at desc);
-- Her kullanıcının en fazla 1 aktif yol haritası
create unique index roadmaps_one_active_per_user on public.roadmaps(user_id) where is_active;

-- ---------- Görevler ----------
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  roadmap_id       uuid not null references public.roadmaps(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade, -- RLS performansı için
  skill_id         uuid references public.skills(id) on delete set null,
  title            text not null,
  description      text,
  resource_url     text,
  resource_type    public.task_resource_type not null default 'other',
  estimated_hours  numeric(5,1) check (estimated_hours >= 0),
  difficulty       smallint not null default 1 check (difficulty between 1 and 3),
  xp_reward        int not null default 10 check (xp_reward between 0 and 500),
  week_number      smallint check (week_number >= 1),
  sort_order       int not null default 0,
  status           public.task_status not null default 'pending',
  completed_at     timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_roadmap_idx on public.tasks(roadmap_id, week_number, sort_order);

-- ---------- Rozetler (katalog, admin yönetir) ----------
create table public.badges (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_tr         text not null,
  name_en         text not null,
  description_tr  text,
  description_en  text,
  icon            text,
  criteria_type   text not null check (criteria_type in ('tasks_completed', 'xp_total', 'streak_days', 'assessments_completed')),
  criteria_value  int not null check (criteria_value > 0),
  xp_bonus        int not null default 0 check (xp_bonus >= 0),
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------- Kullanıcı rozetleri ----------
create table public.user_badges (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_id   uuid not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- XP hareketleri (defter / ledger) ----------
create table public.xp_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  amount         int not null check (amount > 0),
  reason         public.xp_reason not null,
  task_id        uuid references public.tasks(id) on delete set null,
  assessment_id  uuid references public.assessments(id) on delete set null,
  badge_id       uuid references public.badges(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events(user_id, created_at desc);
-- Aynı görev / check-up için çift XP verilmesini engeller
create unique index xp_events_task_unique       on public.xp_events(task_id)       where reason = 'task_completed';
create unique index xp_events_assessment_unique on public.xp_events(assessment_id) where reason = 'assessment_completed';
