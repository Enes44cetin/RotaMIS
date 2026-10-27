-- =========================================================
-- 08_make_admin.sql  |  Bir kullanıcıyı admin yapar
-- Kullanıcı Authentication > Users'ta oluştuktan SONRA çalıştırın.
-- =========================================================
update public.profiles
   set role = 'admin'
 where email = 'senin-epostan@ornek.com';   -- <-- kendi e-postanla değiştir

-- Kontrol: aşağıda kendi e-postanı 'admin' olarak görmelisin
select id, email, role from public.profiles where role = 'admin';
