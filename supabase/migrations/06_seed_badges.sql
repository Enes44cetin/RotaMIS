-- =========================================================
-- 06_seed_badges.sql  |  RotaMIS - Başlangıç rozetleri
-- Çalıştırma sırası: 6 (ZORUNLU)
-- Rozetler daha sonra admin panelinden düzenlenebilir. Tekrar çalıştırmak güvenlidir.
-- =========================================================
insert into public.badges (slug, name_tr, name_en, description_tr, description_en, icon, criteria_type, criteria_value, xp_bonus, sort_order) values
  ('first-checkup', 'Yola Çıktın',     'On the Road',    'İlk check-up''ını tamamladın.', 'Completed your first check-up.', 'flag',       'assessments_completed', 1,   0,   1),
  ('first-task',    'İlk Adım',        'First Step',     'İlk görevini tamamladın.',      'Completed your first task.',     'footprints', 'tasks_completed',       1,   10,  2),
  ('task-10',       'İstikrarlı',      'Consistent',     '10 görev tamamladın.',          'Completed 10 tasks.',            'target',     'tasks_completed',       10,  50,  3),
  ('task-50',       'Durdurulamaz',    'Unstoppable',    '50 görev tamamladın.',          'Completed 50 tasks.',            'trophy',     'tasks_completed',       50,  200, 4),
  ('streak-7',      'Haftalık Seri',   'Weekly Streak',  '7 gün üst üste aktif oldun.',   'Active 7 days in a row.',        'flame',      'streak_days',           7,   25,  5),
  ('streak-30',     'Aylık Seri',      'Monthly Streak', '30 gün üst üste aktif oldun.',  'Active 30 days in a row.',       'zap',        'streak_days',           30,  100, 6),
  ('xp-500',        'Yükselen Yıldız', 'Rising Star',    '500 XP topladın.',              'Earned 500 XP.',                 'star',       'xp_total',              500, 0,   7),
  ('checkup-3',     'Kendini Tanıyan', 'Self-Aware',     '3 check-up tamamladın.',        'Completed 3 check-ups.',         'line-chart', 'assessments_completed', 3,   50,  8)
on conflict (slug) do update set
  name_tr = excluded.name_tr, name_en = excluded.name_en,
  description_tr = excluded.description_tr, description_en = excluded.description_en,
  icon = excluded.icon, criteria_type = excluded.criteria_type,
  criteria_value = excluded.criteria_value, xp_bonus = excluded.xp_bonus, sort_order = excluded.sort_order;
