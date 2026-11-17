-- =========================================================
-- 13_sectoral_dynamic_architecture.sql  |  RotaMIS - Sektörel & Dinamik Değerlendirme Mimarisi
-- Çalıştırma sırası: 13 (Supabase SQL Editor'de güvenle çalıştırılabilir, idempotent)
-- =========================================================

-- ---------- 1. skills Tablosuna Sektörel & Davranışsal Alanlar Ekle ----------
alter table public.skills
  add column if not exists aliases text[] not null default '{}',
  add column if not exists market_category text,
  add column if not exists prompt_tr text,
  add column if not exists level_anchors jsonb not null default '{}'::jsonb;

-- ---------- 2. career_paths Tablosuna Sektör Analizi Meta Alanları Ekle ----------
alter table public.career_paths
  add column if not exists market_summary text,
  add column if not exists total_postings int not null default 0,
  add column if not exists market_scope text not null default 'Yerel',
  add column if not exists scope_warning text;

-- ---------- 3. career_path_skill_requirements Tablosuna Dinamik Radar ve İlan Verisi Alanları Ekle ----------
alter table public.career_path_skill_requirements
  add column if not exists is_radar_axis boolean not null default false,
  add column if not exists axis_order smallint,
  add column if not exists axis_label_tr text,
  add column if not exists demand_pct numeric(5,2),
  add column if not exists mention_count int,
  add column if not exists total_postings int,
  add column if not exists priority_label text,
  add column if not exists display_badge text,
  add column if not exists is_core_checkup boolean not null default true;

create index if not exists cpsr_radar_idx
  on public.career_path_skill_requirements(career_path_id, is_radar_axis, axis_order);

-- ---------- 4. Toplu Veri Yükleme Geçmişi (market_import_batches) Tablosu ----------
create table if not exists public.market_import_batches (
  id                     uuid primary key default gen_random_uuid(),
  career_path_id         uuid references public.career_paths(id) on delete cascade,
  file_name              text,
  market_scope           text not null default 'Yerel',
  role_filter            text not null default 'Geliştirici',
  total_postings         int not null default 0,
  imported_skills_count  int not null default 0,
  radar_axes_count       int not null default 0,
  scope_warning          text,
  summary                jsonb not null default '{}'::jsonb,
  previous_snapshot      jsonb not null default '[]'::jsonb,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index if not exists mib_career_created_idx
  on public.market_import_batches(career_path_id, created_at desc);

alter table public.market_import_batches enable row level security;

drop policy if exists "market_import_batches: sadece admin yönetir" on public.market_import_batches;
create policy "market_import_batches: sadece admin yönetir"
  on public.market_import_batches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 5. v_skill_gap ve v_career_radar Görünümlerini Güncelle ----------
-- ÖNEMLİ DÜZELTME:
-- 1) PostgreSQL'de mevcut view kolon tipleri (05_views.sql ve 10_checkup_fixes.sql içinde
--    coalesce(..., 0) nedeniyle integer/int4 olarak oluşmuştu) birebir "::int" ile korunmuştur.
--    Böylece 42P16 (cannot change data type of view column from integer to smallint) hatası oluşmaz.
-- 2) v_skill_gap artık tüm becerilerle cross join yapmak yerine yalnızca öğrencinin seçtiği
--    meslekte (career_path_skill_requirements) tanımlı olan sektörel becerileri getirir.
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
  -- AI Modülü & Handoff Uyumluluk Alias'ları (tipleri birebir korundu):
  s.name_tr                                               as skill_name_tr,
  coalesce(r.level, 1)::int                               as student_level,
  cp.name_tr                                              as career_path_name,
  -- Yeni Sektörel & Dinamik Radar Alanları:
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
  on r.assessment_id = la.id and r.skill_id = s.id;

revoke all on public.v_skill_gap from anon;

-- Mesleğe özel 6'lı Radar görünümü (sabit axis_order sırasıyla)
create or replace view public.v_career_radar
with (security_invoker = true) as
select
  user_id,
  assessment_id,
  career_path_id,
  career_path_name,
  skill_id,
  skill_slug,
  category,
  name_tr,
  axis_label_tr,
  current_level,
  required_level,
  importance,
  gap,
  axis_order,
  demand_pct,
  priority_label,
  display_badge
from public.v_skill_gap
where is_radar_axis = true
order by coalesce(axis_order, 99) asc, coalesce(demand_pct, 0) desc, importance desc, sort_order asc;

revoke all on public.v_career_radar from anon;

-- ---------- 6. RPC 1: save_requirement_matrix Güncellemesi (Radar Eksenlerini Destekler) ----------
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
  v_req        record;
  v_axis_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem: Bu işlem yalnızca yöneticiler tarafından gerçekleştirilebilir.';
  end if;

  if not exists (select 1 from public.career_paths where id = p_career_path_id) then
    raise exception 'Geçersiz kariyer rotası ID.';
  end if;

  delete from public.career_path_skill_requirements
   where career_path_id = p_career_path_id;

  for v_req in
    select
      (elem->>'skill_id')::uuid as skill_id,
      (elem->>'required_level')::smallint as required_level,
      coalesce((elem->>'importance')::smallint, 2) as importance,
      coalesce((elem->>'is_radar_axis')::boolean, false) as is_radar_axis,
      (elem->>'axis_order')::smallint as axis_order,
      nullif(elem->>'axis_label_tr', '') as axis_label_tr,
      (elem->>'demand_pct')::numeric(5,2) as demand_pct,
      (elem->>'mention_count')::int as mention_count,
      (elem->>'total_postings')::int as total_postings,
      nullif(elem->>'priority_label', '') as priority_label,
      nullif(elem->>'display_badge', '') as display_badge,
      coalesce((elem->>'is_core_checkup')::boolean, true) as is_core_checkup
    from jsonb_array_elements(p_requirements) as elem
  loop
    if v_req.required_level between 1 and 5 and v_req.importance between 1 and 3 then
      insert into public.career_path_skill_requirements (
        career_path_id,
        skill_id,
        required_level,
        importance,
        is_radar_axis,
        axis_order,
        axis_label_tr,
        demand_pct,
        mention_count,
        total_postings,
        priority_label,
        display_badge,
        is_core_checkup,
        data_source,
        updated_at
      ) values (
        p_career_path_id,
        v_req.skill_id,
        v_req.required_level,
        v_req.importance,
        v_req.is_radar_axis,
        v_req.axis_order,
        v_req.axis_label_tr,
        v_req.demand_pct,
        v_req.mention_count,
        v_req.total_postings,
        v_req.priority_label,
        v_req.display_badge,
        v_req.is_core_checkup,
        'admin',
        now()
      );
    end if;
  end loop;

  -- Eğer hiçbir eksen açıkça işaretlenmediyse en yüksek önemli/beklentili ilk 6 beceriyi otomatik radar ekseni yap
  select count(*) into v_axis_count
    from public.career_path_skill_requirements
   where career_path_id = p_career_path_id and is_radar_axis = true;

  if v_axis_count = 0 then
    with top_six as (
      select cpsr.skill_id,
             row_number() over (
               order by coalesce(cpsr.demand_pct, 0) desc, cpsr.importance desc, cpsr.required_level desc, s.sort_order asc
             ) as rn
        from public.career_path_skill_requirements cpsr
        join public.skills s on s.id = cpsr.skill_id
       where cpsr.career_path_id = p_career_path_id
       limit 6
    )
    update public.career_path_skill_requirements cpsr
       set is_radar_axis = true,
           axis_order = top_six.rn::smallint
      from top_six
     where cpsr.career_path_id = p_career_path_id
       and cpsr.skill_id = top_six.skill_id;
  end if;

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

revoke execute on function public.save_requirement_matrix(uuid, jsonb) from public, anon;
grant execute on function public.save_requirement_matrix(uuid, jsonb) to authenticated;

-- ---------- 7. RPC 2: reset_student_career_journey (Meslek Değiştirme & Baştan Check-Up) ----------
create or replace function public.reset_student_career_journey()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Oturum açmanız gerekiyor.';
  end if;

  -- 1. Varsa yarım kalmış taslak değerlendirmeleri sil
  delete from public.assessments
   where user_id = v_user_id
     and status = 'draft';

  -- 2. Aktif yol haritalarını pasife çek (yeni onboarding bittiğinde sıfırdan üretilecek)
  update public.roadmaps
     set is_active = false
   where user_id = v_user_id
     and is_active = true;

  -- 3. Profili tekrar onboarding moduna al
  update public.profiles
     set onboarding_completed = false,
         updated_at = now()
   where id = v_user_id;
end;
$$;

revoke execute on function public.reset_student_career_journey() from public, anon;
grant execute on function public.reset_student_career_journey() to authenticated;

-- ---------- 8. Varsayılan Davranışsal Seviye Tanımları (1-5 Level Anchors) ----------
update public.skills
   set level_anchors = jsonb_build_object(
     '1', 'Bu kavramı/aracı daha önce hiç duymadım veya henüz hiçbir teorik/pratik bilgim yok.',
     '2', 'Kavramı duydum ve ne işe yaradığını biliyorum; hazır örnekleri okuyup temel düzeyde anlayabiliyorum.',
     '3', 'Dokümantasyon veya rehber yardımıyla orta ölçekli senaryoları uygulayabiliyorum.',
     '4', 'Gerçek bir projede bağımsız olarak kullanabiliyor, hata ayıklayıp çözüm üretebiliyorum.',
     '5', 'İleri seviye mimari/optimizasyon kararları alabiliyor ve ekip arkadaşlarıma mentorluk yapabiliyorum.'
   )
 where level_anchors = '{}'::jsonb;

-- ---------- 9. Yeni Kariyer Rotası: Yazılım Geliştirici (Sektör İlan Analizi Verisiyle) ----------
insert into public.career_paths (
  slug,
  name_tr,
  name_en,
  description_tr,
  description_en,
  icon,
  sort_order,
  is_active,
  market_summary,
  total_postings,
  market_scope
) values (
  'software-developer',
  'Yazılım Geliştirici',
  'Software Developer',
  'Kurumsal web, backend, veritabanı ve mikroservis mimarilerinde uçtan uca yazılım çözümleri geliştirir.',
  'Develops end-to-end software solutions across web, backend, database, and microservice architectures.',
  'code-2',
  0,
  true,
  'Yerel & Küresel İlan Analizi · 43 Yerel / 119 Toplam İlan',
  43,
  'Yerel'
)
on conflict (slug) do update
  set name_tr        = excluded.name_tr,
      description_tr = excluded.description_tr,
      icon           = excluded.icon,
      is_active      = true,
      market_summary = excluded.market_summary,
      total_postings = excluded.total_postings,
      market_scope   = excluded.market_scope;

-- Mevcut 5 kariyer rotasına da sektör analizi özet bilgisi ekle
update public.career_paths
   set market_summary = 'Sektör Beklenti Analizi · YBS Kariyer Veri Seti',
       total_postings = 50,
       market_scope   = 'Yerel'
 where market_summary is null;

-- ---------- 10. Yazılım Geliştirici CSV Analizindeki Becerileri Kataloğa Ekle ----------
insert into public.skills (slug, category, market_category, name_tr, name_en, icon, sort_order, aliases, prompt_tr)
values
  ('sql', 'technical', 'temel_teknik_araclar', 'SQL & Veritabanı Sorgulama', 'SQL', 'database', 1,
   array['SQL', 'MSSQL', 'PostgreSQL', 'MySQL', 'T-SQL', 'PL/SQL', 'Oracle'],
   'İlişkisel veritabanlarında (SQL, MSSQL, PostgreSQL) karmaşık JOIN, GROUP BY ve analitik sorgular yazma düzeyin nedir?'),
  ('git', 'technical', 'temel_teknik_araclar', 'Git & Versiyon Kontrolü', 'Git & Version Control', 'git-branch', 2,
   array['Git', 'GitHub', 'GitLab'],
   'Git ile branch yönetimi, merge/rebase, conflict çözümü ve ekip içi ortak kod geliştirme süreçlerindeki hakimiyetin nedir?'),
  ('dotnet-csharp', 'technical', 'temel_teknik_araclar', '.NET & C# Backend Geliştirme', '.NET & C#', 'cpu', 3,
   array['.NET', 'C#', 'ASP.NET', 'Entity Framework'],
   'C# ve .NET (ASP.NET Core / Entity Framework) ekosistemiyle kurumsal backend servisleri geliştirme seviyen nedir?'),
  ('rest-api', 'technical', 'metodoloji_ve_kavramlar', 'REST API & Servis Mimarisi', 'REST API Design', 'webhook', 4,
   array['REST API', 'Swagger', 'GraphQL', 'SOAP'],
   'RESTful API standartlarına uygun uç noktalar (endpoint) tasarlama, kimlik doğrulama, durum kodları ve Swagger dokümantasyonu hazırlama düzeyin nedir?'),
  ('oop-solid', 'technical', 'metodoloji_ve_kavramlar', 'OOP & Tasarım Kalıpları (Design Patterns)', 'OOP & Design Patterns', 'boxes', 5,
   array['OOP', 'Design Patterns', 'SOLID', 'Clean Code', 'Clean Architecture', 'DDD'],
   'Nesne Yönelimli Programlama (OOP) ilkeleri, SOLID prensipleri ve yaygın Tasarım Kalıplarını (Design Patterns) projelerde uygulama seviyen nedir?'),
  ('docker-cicd', 'technical', 'is_odakli_araclar', 'Docker, CI/CD & DevOps', 'Docker & CI/CD', 'container', 6,
   array['Docker', 'CI/CD', 'DevOps', 'Kubernetes', 'Jenkins', 'Azure DevOps', 'Linux'],
   'Uygulamaları Docker ile konteynerize etme ve CI/CD (otomatik derleme/dağıtım) hatlarını kurgulama deneyimin hangi seviyede?'),
  ('java-spring', 'technical', 'temel_teknik_araclar', 'Java & Spring Boot', 'Java & Spring Boot', 'coffee', 7,
   array['Java', 'Spring Boot', 'Hibernate', 'Maven'],
   'Java programlama dili ve Spring Boot / Hibernate ekosistemiyle kurumsal uygulama geliştirme yetkinliğin nedir?'),
  ('javascript-ts', 'technical', 'temel_teknik_araclar', 'JavaScript, TypeScript & React', 'JavaScript, TypeScript & React', 'code', 8,
   array['JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'HTML', 'CSS'],
   'Modern JavaScript/TypeScript ve bileşen tabanlı frontend kütüphaneleriyle (React vb.) dinamik arayüzler geliştirme düzeyin nedir?'),
  ('microservices-messaging', 'technical', 'metodoloji_ve_kavramlar', 'Mikroservis, Redis & Mesaj Kuyrukları', 'Microservices, Redis & Messaging', 'network', 9,
   array['Mikroservis', 'RabbitMQ', 'Redis', 'Kafka', 'Elasticsearch', 'Event-Driven'],
   'Dağıtık sistemler, önbellekleme (Redis) ve mesaj kuyrukları (RabbitMQ / Kafka) ile ölçeklenebilir mikroservis kurgulama bilgin nedir?'),
  ('testing-quality', 'technical', 'metodoloji_ve_kavramlar', 'Unit Test, Code Review & Algoritma', 'Unit Testing & Code Quality', 'shield-check', 10,
   array['Unit Test', 'TDD', 'Code Review', 'Algoritma', 'Veri Yapıları'],
   'Birim testi (Unit Test) yazma, veri yapıları/algoritma analizi ve etkili Code Review yapma alışkanlığın hangi düzeyde?'),
  ('python', 'technical', 'temel_teknik_araclar', 'Python', 'Python', 'code', 11,
   array['Python', 'Django', 'FastAPI', 'Flask'],
   'Python ile veri işleme, otomasyon betikleri veya backend servisleri geliştirme konusunda kendini nerede görüyorsun?'),
  ('agile-scrum', 'business', 'metodoloji_ve_kavramlar', 'Agile & Scrum Çevik Geliştirme', 'Agile & Scrum', 'refresh-cw', 13,
   array['Agile', 'Scrum', 'SDLC', 'Jira'],
   'Agile/Scrum ritüelleri (Sprint planlama, Daily, Retrospektif), Jira takibi ve SDLC süreçlerindeki uygulama deneyimin nedir?'),
  ('english', 'soft', 'yabanci_dil', 'Teknik & İş İngilizcesi', 'Technical & Business English', 'languages', 25,
   array['İngilizce', 'Yabancı Dil'],
   'İngilizce teknik dokümantasyon okuma, global kaynakları takip etme ve yazılı/sözlü teknik iletişim kurma seviyen nedir?')
on conflict (slug) do update
  set market_category = coalesce(excluded.market_category, public.skills.market_category),
      aliases         = excluded.aliases,
      prompt_tr       = coalesce(excluded.prompt_tr, public.skills.prompt_tr);

-- Diğer mevcut YBS becerilerine de sektörel özdeğerlendirme soruları (prompt_tr) ata
update public.skills set prompt_tr = 'Kurumsal raporlama için ileri Excel (Pivot, Power Query, formüller) ile veri temizleme ve analiz yapma düzeyin nedir?' where slug = 'excel' and prompt_tr is null;
update public.skills set prompt_tr = 'Power BI veya Tableau gibi İş Zekâsı (BI) araçlarıyla etkileşimli yönetim panoları (dashboard) ve veri hikayeleştirme hazırlama seviyen nedir?' where slug = 'bi-tools' and prompt_tr is null;
update public.skills set prompt_tr = 'SAP veya Oracle gibi kurumsal kaynak planlama (ERP) modüllerinin işleyişini ve departmanlar arası entegrasyonunu anlama düzeyin nedir?' where slug = 'erp' and prompt_tr is null;
update public.skills set prompt_tr = 'Mevcut iş süreçlerini (As-Is / To-Be) analiz edip BPMN standartlarında görsel süreç akış şemalarıyla modelleme yetkinliğin nedir?' where slug = 'process-modeling' and prompt_tr is null;
update public.skills set prompt_tr = 'Paydaşlardan iş ihtiyaçlarını toplama, kapsam belirleme ve teknik ekipler için net User Story / kabul kriterleri yazma düzeyin nedir?' where slug = 'requirements-analysis' and prompt_tr is null;
update public.skills set prompt_tr = 'Teknoloji projelerinde zaman çizelgesi, kapsam, görev dağılımı ve olası riskleri planlayıp takip etme becerin hangi seviyede?' where slug = 'project-management' and prompt_tr is null;
update public.skills set prompt_tr = 'Gelir tablosu, maliyet analizi, bütçe ve yatırım getirisi (ROI) gibi temel finans kavramlarını teknoloji kararlarıyla ilişkilendirme düzeyin nedir?' where slug = 'finance-basics' and prompt_tr is null;
update public.skills set prompt_tr = 'İlişkisel veritabanı şema tasarımı, ER diyagramları, normalizasyon (1NF-3NF) ve indeksleme mantığına hakimiyetin nedir?' where slug = 'database-design' and prompt_tr is null;
update public.skills set prompt_tr = 'AWS, Azure veya GCP gibi bulut platformlarının temel servislerini ve modern dağıtım kavramlarını anlama düzeyin nedir?' where slug = 'cloud-basics' and prompt_tr is null;
update public.skills set prompt_tr = 'HTML, CSS ve temel web çalışma prensiplerini (HTTP, DOM, tarayıcı mimarisi) kavrama ve uygulama düzeyin nedir?' where slug = 'web-fundamentals' and prompt_tr is null;
update public.skills set prompt_tr = 'Farklı iş kollarının (finans, e-ticaret, üretim, lojistik) operasyonel süreçlerini ve sektörel dinamiklerini anlama düzeyin nedir?' where slug = 'industry-knowledge' and prompt_tr is null;
update public.skills set prompt_tr = 'Teknik bulguları ve karmaşık sistem kararlarını teknik olmayan iş birimlerine sade ve ikna edici biçimde aktarma becerin nedir?' where slug = 'communication' and prompt_tr is null;
update public.skills set prompt_tr = 'Karmaşık iş veya yazılım darboğazlarını kök neden analiziyle parçalara ayırıp sistematik çözüm üretme becerin hangi düzeyde?' where slug = 'problem-solving' and prompt_tr is null;
update public.skills set prompt_tr = 'Çok disiplinli teknoloji ve iş ekiplerinde uyumlu çalışma, geri bildirim alma/verme ve ortak hedefe katkı sağlama düzeyin nedir?' where slug = 'teamwork' and prompt_tr is null;
update public.skills set prompt_tr = 'Analiz sonuçlarını veya proje çıktılarını yöneticilere ve ekip arkadaşlarına yapılandırılmış bir akışla sunma becerin nedir?' where slug = 'presentation' and prompt_tr is null;
update public.skills set prompt_tr = 'Birden fazla görev ve teslim tarihi arasında önceliklendirme yaparak zamanını verimli yönetme alışkanlığın hangi düzeyde?' where slug = 'time-management' and prompt_tr is null;

-- ---------- 11. Yazılım Geliştirici Rotası İçin Gerçek İlan Verisi Matrisi (6 Radar Ekseni + Tamamlayıcı Beceriler) ----------
do $$
declare
  v_dev_id uuid;
begin
  select id into v_dev_id from public.career_paths where slug = 'software-developer';
  if v_dev_id is not null then
    delete from public.career_path_skill_requirements where career_path_id = v_dev_id;

    insert into public.career_path_skill_requirements (
      career_path_id, skill_id, required_level, importance,
      is_radar_axis, axis_order, axis_label_tr,
      demand_pct, mention_count, total_postings, priority_label, display_badge,
      is_core_checkup, data_source
    )
    select
      v_dev_id,
      s.id,
      v.req_lvl,
      v.imp,
      v.is_axis,
      v.ax_order,
      v.ax_label,
      v.pct,
      v.cnt,
      43,
      v.prio,
      v.badge,
      v.is_core,
      'market_import'
    from (values
      -- 6 ANA RADAR EKSENİ (En çok istenen 6 temel yetkinlik)
      ('sql',                    5, 3, true,  1, 'SQL & Veritabanı',    58.1, 25, 'Çok istenen',  '%58 · 43 ilanın 25''inde', true),
      ('git',                    4, 3, true,  2, 'Git & Versiyon',      51.2, 22, 'Çok istenen',  '%51 · 43 ilanın 22''sinde', true),
      ('dotnet-csharp',          4, 3, true,  3, '.NET & C#',           46.5, 20, 'Sık istenen',  '%47 · 43 ilanın 20''sinde', true),
      ('rest-api',               4, 3, true,  4, 'REST API',            44.2, 19, 'Sık istenen',  '%44 · 43 ilanın 19''unda',  true),
      ('oop-solid',              4, 3, true,  5, 'OOP & Mimari',        32.6, 14, 'Sık istenen',  '%33 · 43 ilanın 14''ünde',  true),
      ('docker-cicd',            3, 2, true,  6, 'Docker & CI/CD',      30.2, 13, 'Sık istenen',  '%30 · 43 ilanın 13''ünde',  true),
      -- TAMAMLAYICI SEKTÖREL YETKİNLİKLER (Dinamik Check-Up ve Görev Eşleştirici Havuzu)
      ('english',                4, 3, false, null, 'İngilizce',        55.8, 24, 'Çok istenen',  '%56 · 43 ilanın 24''ünde',  true),
      ('java-spring',            3, 2, false, null, 'Java & Spring',    32.6, 14, 'Sık istenen',  '%33 · 43 ilanın 14''ünde',  true),
      ('agile-scrum',            3, 2, false, null, 'Agile & Scrum',    27.9, 12, 'Sık istenen',  '%28 · 43 ilanın 12''sinde', true),
      ('microservices-messaging',3, 2, false, null, 'Mikroservis & MQ', 27.9, 12, 'Sık istenen',  '%28 · 43 ilanın 12''sinde', true),
      ('javascript-ts',          3, 2, false, null, 'JS / TS & React',  25.6, 11, 'Sık istenen',  '%26 · 43 ilanın 11''inde',  true),
      ('python',                 3, 2, false, null, 'Python',           20.9,  9, 'Fark yaratan', '%21 · 43 ilanın 9''unda',   false),
      ('testing-quality',        3, 2, false, null, 'Unit Test & Kalite',20.9, 9, 'Fark yaratan', '%21 · 43 ilanın 9''unda',   true)
    ) as v(slug, req_lvl, imp, is_axis, ax_order, ax_label, pct, cnt, prio, badge, is_core)
    join public.skills s on s.slug = v.slug;
  end if;
end $$;

-- ---------- 12. Mevcut 5 Kariyer Rotasının Her Birine Mesleğe Özel 6 Radar Ekseni Ata ----------
do $$
declare
  v_rec record;
begin
  -- Önce mevcut rotalardaki radar ekseni işaretlerini sıfırla
  update public.career_path_skill_requirements
     set is_radar_axis = false,
         axis_order = null
   where career_path_id in (
     select id from public.career_paths
      where slug in ('data-analyst', 'business-analyst', 'erp-consultant', 'product-manager', 'it-project-manager')
   );

  for v_rec in
    select * from (values
      -- 1) Veri Analisti (6 Özel Eksen)
      ('data-analyst', 'sql',               1, 'SQL & Sorgulama',    68.0, 'Çok istenen', '%68 · Sektör Standardı'),
      ('data-analyst', 'bi-tools',          2, 'Power BI / Tableau', 62.0, 'Çok istenen', '%62 · Çok İstenen'),
      ('data-analyst', 'python',            3, 'Python & Veri',      54.0, 'Çok istenen', '%54 · Çok İstenen'),
      ('data-analyst', 'excel',             4, 'İleri Excel',        49.0, 'Sık istenen', '%49 · Sık İstenen'),
      ('data-analyst', 'database-design',   5, 'Veri Modelleme',     36.0, 'Sık istenen', '%36 · Sık İstenen'),
      ('data-analyst', 'problem-solving',   6, 'Analitik Çözüm',     42.0, 'Sık istenen', '%42 · Sık İstenen'),

      -- 2) İş Analisti (6 Özel Eksen)
      ('business-analyst', 'requirements-analysis', 1, 'Gereksinim Analizi', 66.0, 'Çok istenen', '%66 · Sektör Standardı'),
      ('business-analyst', 'process-modeling',      2, 'Süreç Modelleme',    58.0, 'Çok istenen', '%58 · Çok İstenen'),
      ('business-analyst', 'agile-scrum',           3, 'Agile & Scrum',      52.0, 'Çok istenen', '%52 · Çok İstenen'),
      ('business-analyst', 'sql',                   4, 'SQL & Veri Okuma',   44.0, 'Sık istenen', '%44 · Sık İstenen'),
      ('business-analyst', 'bi-tools',              5, 'Raporlama & BI',     38.0, 'Sık istenen', '%38 · Sık İstenen'),
      ('business-analyst', 'communication',         6, 'Paydaş İletişimi',   60.0, 'Çok istenen', '%60 · Çok İstenen'),

      -- 3) ERP Danışmanı (6 Özel Eksen)
      ('erp-consultant', 'erp',                   1, 'ERP (SAP / Oracle)', 72.0, 'Çok istenen', '%72 · Sektör Standardı'),
      ('erp-consultant', 'process-modeling',      2, 'Kurumsal Süreçler',  56.0, 'Çok istenen', '%56 · Çok İstenen'),
      ('erp-consultant', 'finance-basics',        3, 'Finans & Muhasebe',  50.0, 'Çok istenen', '%50 · Çok İstenen'),
      ('erp-consultant', 'requirements-analysis', 4, 'İhtiyaç Analizi',    45.0, 'Sık istenen', '%45 · Sık İstenen'),
      ('erp-consultant', 'sql',                   5, 'Veritabanı & SQL',   39.0, 'Sık istenen', '%39 · Sık İstenen'),
      ('erp-consultant', 'industry-knowledge',    6, 'Sektör Bilgisi',     42.0, 'Sık istenen', '%42 · Sık İstenen'),

      -- 4) Ürün Yöneticisi (6 Özel Eksen)
      ('product-manager', 'requirements-analysis', 1, 'Ürün & User Story',  64.0, 'Çok istenen', '%64 · Sektör Standardı'),
      ('product-manager', 'agile-scrum',           2, 'Agile & Backlog',    60.0, 'Çok istenen', '%60 · Çok İstenen'),
      ('product-manager', 'industry-knowledge',    3, 'Pazar & Ürün Stratejisi', 52.0, 'Çok istenen', '%52 · Çok İstenen'),
      ('product-manager', 'bi-tools',              4, 'Ürün Metrikleri & BI', 44.0, 'Sık istenen', '%44 · Sık İstenen'),
      ('product-manager', 'web-fundamentals',      5, 'Teknoloji Okuryazarlığı', 36.0, 'Sık istenen', '%36 · Sık İstenen'),
      ('product-manager', 'communication',         6, 'Paydaş & Ekip Liderliği', 58.0, 'Çok istenen', '%58 · Çok İstenen'),

      -- 5) BT Proje Yöneticisi (6 Özel Eksen)
      ('it-project-manager', 'project-management',    1, 'Proje & Risk Yönetimi', 70.0, 'Çok istenen', '%70 · Sektör Standardı'),
      ('it-project-manager', 'agile-scrum',           2, 'Agile & Scrum',         62.0, 'Çok istenen', '%62 · Çok İstenen'),
      ('it-project-manager', 'requirements-analysis', 3, 'Kapsam Analizi',        48.0, 'Sık istenen', '%48 · Sık İstenen'),
      ('it-project-manager', 'finance-basics',        4, 'Bütçe & Maliyet',       42.0, 'Sık istenen', '%42 · Sık İstenen'),
      ('it-project-manager', 'communication',         5, 'Paydaş Yönetimi',       58.0, 'Çok istenen', '%58 · Çok İstenen'),
      ('it-project-manager', 'cloud-basics',          6, 'BT & Bulut Altyapısı',  32.0, 'Fark yaratan','%32 · Fark Yaratan')
    ) as t(path_slug, skill_slug, ax_order, ax_label, pct, prio, badge)
  loop
    insert into public.career_path_skill_requirements (
      career_path_id, skill_id, required_level, importance,
      is_radar_axis, axis_order, axis_label_tr,
      demand_pct, priority_label, display_badge, is_core_checkup, data_source
    )
    select
      cp.id, s.id, 4, 3,
      true, v_rec.ax_order, v_rec.ax_label,
      v_rec.pct, v_rec.prio, v_rec.badge, true, 'market_import'
    from public.career_paths cp,
         public.skills s
    where cp.slug = v_rec.path_slug
      and s.slug = v_rec.skill_slug
    on conflict (career_path_id, skill_id) do update
      set is_radar_axis  = true,
          axis_order     = excluded.axis_order,
          axis_label_tr  = excluded.axis_label_tr,
          demand_pct     = excluded.demand_pct,
          priority_label = excluded.priority_label,
          display_badge  = excluded.display_badge,
          is_core_checkup= true;
  end loop;
end $$;

-- ---------- 13. Yazılım Geliştirici Becerileri İçin Onaylı Eğitim Kaynakları (Katalog) ----------
do $$
declare
  v_rec record;
  v_skill_id uuid;
  v_res_id uuid;
begin
  for v_rec in
    select * from (values
      ('Git ve GitHub ile Versiyon Kontrolü ve Ekip Çalışması', 'BTK Akademi / GitHub Skills', 'https://skills.github.com/', 'practice'::public.task_resource_type, 'en', 'free', 3.5, 1, 'Projelerde kod geçmişini yönetme, branch açma, Pull Request oluşturma ve ekip içi ortak çalışma adımlarını interaktif olarak uygula.', true, 'git', 1, 4),
      ('C# ve .NET Core ile Modern Backend Geliştirme Temelleri', 'Microsoft Learn', 'https://learn.microsoft.com/tr-tr/training/paths/build-dotnet-applications-csharp/', 'course'::public.task_resource_type, 'tr', 'free', 4.5, 2, 'Sektörde en çok aranan kurumsal geliştirme ortamlarından .NET ve C# ile uygulama mimarisini adım adım öğren.', true, 'dotnet-csharp', 1, 4),
      ('RESTful API Tasarımı ve Servis Haberleşmesi Rehberi', 'Microsoft Architecture Guide', 'https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design', 'article'::public.task_resource_type, 'en', 'free', 3.0, 2, 'Web ve mobil uygulamaların arka planda sunucularla nasıl standart, güvenli ve temiz biçimde konuştuğunu örneklerle incele.', false, 'rest-api', 1, 4),
      ('Nesne Yönelimli Programlama (OOP), SOLID ve Tasarım Kalıpları', 'Refactoring.Guru', 'https://refactoring.guru/design-patterns', 'article'::public.task_resource_type, 'en', 'free', 4.0, 2, 'Sürdürülebilir ve temiz yazılım mimarisi kurmak için OOP ilkelerini ve en sık kullanılan Design Pattern örneklerini görsel hikayelerle keşfet.', false, 'oop-solid', 1, 4),
      ('Yeni Başlayanlar İçin Docker, Konteyner ve CI/CD Kültürü', 'Docker Curriculum', 'https://docker-curriculum.com/', 'practice'::public.task_resource_type, 'en', 'free', 4.0, 2, 'Yazdığın bir uygulamanın her bilgisayarda ve sunucuda aynı şekilde çalışmasını sağlayan Docker konteyner mantığını uygula.', false, 'docker-cicd', 1, 4),
      ('Java ve Spring Boot ile Kurumsal Servis Geliştirmeye Giriş', 'Spring Academy', 'https://spring.academy/paths/spring-certified-professional-2023', 'course'::public.task_resource_type, 'en', 'free', 4.5, 2, 'Bankacılık ve büyük ölçekli kurumsal sistemlerin omurgası olan Java & Spring Boot ekosistemini resmi öğrenme patikasıyla tanı.', true, 'java-spring', 1, 4),
      ('Modern JavaScript, TypeScript ve React ile Arayüz Geliştirme', 'React Resmi Dokümantasyonu', 'https://react.dev/learn', 'practice'::public.task_resource_type, 'en', 'free', 4.0, 2, 'Bileşen tabanlı modern web arayüzlerinin nasıl inşa edildiğini interaktif kod örnekleriyle tarayıcıda deneyimle.', false, 'javascript-ts', 1, 4),
      ('Mikroservis Mimarisi, Redis Önbellekleme ve Mesaj Kuyrukları (RabbitMQ)', 'RabbitMQ Tutorials', 'https://www.rabbitmq.com/tutorials', 'article'::public.task_resource_type, 'en', 'free', 3.5, 2, 'Yüksek trafikli sistemlerin kilitlenmeden çalışmasını sağlayan asenkron mesajlaşma ve önbellekleme mimarisini kavra.', false, 'microservices-messaging', 1, 4),
      ('Yazılımda Kalite: Unit Test, Code Review ve Temiz Kod Pratikleri', 'Google Engineering Practices', 'https://google.github.io/eng-practices/review/', 'article'::public.task_resource_type, 'en', 'free', 3.0, 1, 'Profesyonel yazılım ekiplerinde kod inceleme (Code Review) kültürünü ve birim testi alışkanlığını Google mühendislik rehberinden oku.', false, 'testing-quality', 1, 4)
    ) as t(title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate, skill_slug, min_lvl, target_lvl)
  loop
    select id into v_res_id from public.learning_resources where url = v_rec.url limit 1;

    if v_res_id is null then
      insert into public.learning_resources (
        title, provider, url, resource_type, language, pricing, estimated_hours, difficulty, description, gives_certificate, status
      ) values (
        v_rec.title, v_rec.provider, v_rec.url, v_rec.resource_type, v_rec.language, v_rec.pricing,
        v_rec.estimated_hours, v_rec.difficulty, v_rec.description, v_rec.gives_certificate, 'published'
      ) returning id into v_res_id;
    end if;

    select id into v_skill_id from public.skills where slug = v_rec.skill_slug;
    if v_skill_id is not null and v_res_id is not null then
      insert into public.resource_skills (resource_id, skill_id, min_level, target_level)
      values (v_res_id, v_skill_id, v_rec.min_lvl, v_rec.target_lvl)
      on conflict (resource_id, skill_id) do nothing;
    end if;
  end loop;
end $$;

