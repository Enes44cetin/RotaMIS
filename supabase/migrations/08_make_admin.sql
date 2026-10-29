-- =========================================================
-- 08_make_admin.sql  |  Bir kullanıcıyı admin yapar
-- Kullanıcı Authentication > Users'ta oluştuktan SONRA çalıştırın.
-- =========================================================
update public.profiles
   set role = 'admin'
 where lower(trim(email)) = lower(trim('senin-epostan@ornek.com'));   -- <-- kendi e-postanla değiştir

-- Kontrol: aşağıda kendi e-postanı 'admin' olarak görmelisin
select id, email, role, onboarding_completed from public.profiles where role = 'admin';
