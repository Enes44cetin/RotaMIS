-- =========================================================
-- 07_seed_demo_catalog.sql  |  RotaMIS - DEMO katalog verisi (İSTEĞE BAĞLI)
-- Çalıştırma sırası: 7
--
-- AMAÇ: Admin paneli hazır olana kadar uygulamayı test edebilmek için
-- örnek üniversite, kariyer alanı, beceri ve sektör beklentisi ekler.
-- Tüm kayıtlar data_source = 'demo' olarak işaretlenir; gerçek veriler
-- geldiğinde admin panelinden düzenlenebilir veya pasifleştirilebilir.
-- Gerçek verileri kendiniz girmek isterseniz bu dosyayı ÇALIŞTIRMAYIN.
-- Tekrar çalıştırmak güvenlidir.
-- =========================================================

-- ---------- Örnek üniversiteler (admin panelinden tam liste girilecek) ----------
insert into public.universities (name, city, sort_order) values
  ('Boğaziçi Üniversitesi',   'İstanbul', 1),
  ('Marmara Üniversitesi',    'İstanbul', 2),
  ('Kadir Has Üniversitesi',  'İstanbul', 3),
  ('Gazi Üniversitesi',       'Ankara',   4),
  ('Dokuz Eylül Üniversitesi','İzmir',    5),
  ('Sakarya Üniversitesi',    'Sakarya',  6)
on conflict (name) do nothing;

-- ---------- Örnek kariyer alanları ----------
insert into public.career_paths (slug, name_tr, name_en, description_tr, description_en, icon, sort_order) values
  ('data-analyst',       'Veri Analisti',       'Data Analyst',       'Veriden içgörü üreterek karar süreçlerini destekler.',             'Turns data into insights that support decisions.',        'bar-chart-3',    1),
  ('business-analyst',   'İş Analisti',         'Business Analyst',   'İş ihtiyaçlarını teknik gereksinimlere dönüştürür.',               'Translates business needs into technical requirements.',  'clipboard-list', 2),
  ('erp-consultant',     'ERP Danışmanı',       'ERP Consultant',     'SAP/Oracle gibi ERP sistemlerinin kurulum ve uyarlamasını yapar.', 'Implements and customizes ERP systems like SAP/Oracle.',  'boxes',          3),
  ('product-manager',    'Ürün Yöneticisi',     'Product Manager',    'Dijital ürünlerin vizyonunu ve yol haritasını yönetir.',           'Owns the vision and roadmap of digital products.',        'rocket',         4),
  ('it-project-manager', 'BT Proje Yöneticisi', 'IT Project Manager', 'Teknoloji projelerini zaman, bütçe ve kapsam içinde yönetir.',     'Delivers technology projects on time, budget and scope.', 'kanban-square',  5)
on conflict (slug) do nothing;

-- ---------- Örnek beceriler ----------
insert into public.skills (slug, category, name_tr, name_en, icon, sort_order) values
  -- Teknik
  ('sql',                   'technical', 'SQL',                              'SQL',                            'database',       1),
  ('python',                'technical', 'Python',                           'Python',                         'code',           2),
  ('excel',                 'technical', 'İleri Excel',                      'Advanced Excel',                 'sheet',          3),
  ('bi-tools',              'technical', 'BI Araçları (Power BI / Tableau)', 'BI Tools (Power BI / Tableau)',  'pie-chart',      4),
  ('erp',                   'technical', 'ERP Sistemleri (SAP vb.)',         'ERP Systems (SAP etc.)',         'boxes',          5),
  ('web-fundamentals',      'technical', 'Web Temelleri (HTML/CSS/JS)',      'Web Fundamentals (HTML/CSS/JS)', 'globe',          6),
  ('database-design',       'technical', 'Veritabanı Tasarımı',              'Database Design',                'network',        7),
  ('cloud-basics',          'technical', 'Bulut Temelleri',                  'Cloud Basics',                   'cloud',          8),
  -- İşletme & Süreç
  ('process-modeling',      'business',  'Süreç Modelleme (BPMN)',           'Process Modeling (BPMN)',        'workflow',       10),
  ('requirements-analysis', 'business',  'Gereksinim Analizi',               'Requirements Analysis',          'list-checks',    11),
  ('project-management',    'business',  'Proje Yönetimi',                   'Project Management',             'gantt-chart',    12),
  ('agile-scrum',           'business',  'Agile / Scrum',                    'Agile / Scrum',                  'refresh-cw',     13),
  ('finance-basics',        'business',  'Finans & Muhasebe Temelleri',      'Finance & Accounting Basics',    'landmark',       14),
  ('industry-knowledge',    'business',  'Sektör / İş Alanı Bilgisi',        'Industry / Domain Knowledge',    'building-2',     15),
  -- Sosyal
  ('communication',         'soft',      'İletişim',                         'Communication',                  'message-circle', 20),
  ('teamwork',              'soft',      'Takım Çalışması',                  'Teamwork',                       'users',          21),
  ('problem-solving',       'soft',      'Problem Çözme',                    'Problem Solving',                'lightbulb',      22),
  ('presentation',          'soft',      'Sunum Becerisi',                   'Presentation',                   'presentation',   23),
  ('time-management',       'soft',      'Zaman Yönetimi',                   'Time Management',                'clock',          24),
  ('english',               'soft',      'İngilizce',                        'English',                        'languages',      25)
on conflict (slug) do nothing;

-- ---------- Örnek sektör beklentileri: ortak sosyal beceriler ----------
insert into public.career_path_skill_requirements (career_path_id, skill_id, required_level, importance, data_source)
select cp.id, s.id, v.lvl, v.imp, 'demo'
  from public.career_paths cp
 cross join (values
   ('communication',   4, 3),
   ('teamwork',        4, 2),
   ('problem-solving', 4, 3),
   ('presentation',    3, 2),
   ('time-management', 3, 2),
   ('english',         4, 3)
 ) as v(skill_slug, lvl, imp)
  join public.skills s on s.slug = v.skill_slug
 where cp.slug in ('data-analyst', 'business-analyst', 'erp-consultant', 'product-manager', 'it-project-manager')
on conflict (career_path_id, skill_id) do nothing;

-- ---------- Örnek sektör beklentileri: kariyere özel ----------
insert into public.career_path_skill_requirements (career_path_id, skill_id, required_level, importance, data_source)
select cp.id, s.id, v.lvl, v.imp, 'demo'
  from (values
    -- Veri Analisti
    ('data-analyst', 'sql', 5, 3), ('data-analyst', 'python', 4, 3), ('data-analyst', 'excel', 4, 2),
    ('data-analyst', 'bi-tools', 5, 3), ('data-analyst', 'database-design', 3, 2),
    ('data-analyst', 'industry-knowledge', 3, 2),
    -- İş Analisti
    ('business-analyst', 'sql', 3, 2), ('business-analyst', 'excel', 4, 2), ('business-analyst', 'bi-tools', 3, 2),
    ('business-analyst', 'process-modeling', 5, 3), ('business-analyst', 'requirements-analysis', 5, 3),
    ('business-analyst', 'agile-scrum', 4, 2),
    -- ERP Danışmanı
    ('erp-consultant', 'erp', 5, 3), ('erp-consultant', 'sql', 3, 2), ('erp-consultant', 'database-design', 3, 1),
    ('erp-consultant', 'process-modeling', 4, 3), ('erp-consultant', 'finance-basics', 4, 3),
    ('erp-consultant', 'industry-knowledge', 4, 2), ('erp-consultant', 'requirements-analysis', 4, 2),
    -- Ürün Yöneticisi
    ('product-manager', 'sql', 3, 1), ('product-manager', 'web-fundamentals', 3, 2), ('product-manager', 'bi-tools', 3, 2),
    ('product-manager', 'requirements-analysis', 4, 3), ('product-manager', 'agile-scrum', 5, 3),
    ('product-manager', 'industry-knowledge', 4, 3),
    -- BT Proje Yöneticisi
    ('it-project-manager', 'project-management', 5, 3), ('it-project-manager', 'agile-scrum', 5, 3),
    ('it-project-manager', 'cloud-basics', 2, 1), ('it-project-manager', 'finance-basics', 3, 2),
    ('it-project-manager', 'requirements-analysis', 3, 2)
  ) as v(path_slug, skill_slug, lvl, imp)
  join public.career_paths cp on cp.slug = v.path_slug
  join public.skills s        on s.slug  = v.skill_slug
on conflict (career_path_id, skill_id) do nothing;
