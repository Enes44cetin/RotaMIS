# RotaMIS — Sprint 1 Tasarım Dokümanı: Hijyen, Güven ve "Aha Anı"

**Tarih:** 20 Kasım 2026  
**Durum:** Taslak (PO onayı bekleniyor)  
**Kapsam:** Yaklaşım A (Odaklı Sprint 1 — Faz 0 + QW1 + QW5)  
**Hedef Takvim:** 2 haftalık toplam proje takviminin ilk haftası (Sprint 1: ~3–4 gün)  
**AI Modülü Sınırı:** `src/lib/roadmap/matcher/gemini-matcher.ts`, `src/lib/roadmap/matcher/index.ts` ve gelecekteki AI Chatbot modülüne **hiç dokunulmaz** (`emine2539` sorumluluk alanı).

---

## 1. Amaç ve Gerekçe (Intent & Why)

RotaMIS'in sonsuz sprint döngüsü, RLS/trigger tabanlı XP motoru ve dinamik sektörel radar altyapısı güçlüdür; ancak öğrenci uçtan uca akışında ürün kalitesini ve güveni zedeleyen iki temel sorun vardır:
1. **Kırık veya kaçışsız akışlar:** Şifre sıfırlama yok, KVKK metni açılamıyor, kırık link ya da zaten bilinen bir konu sprint kapısını kilitliyor, patika üretilemeyen öğrenci tekrar check-up'a düşüyor, tempo/profil bilgisi patika sıfırlanmadan değiştirilemiyor, seri (streak) hem bayat gösteriliyor hem de tek görevle sömürülebiliyor.
2. **Kayıp "Aha Anı" ve bağlamsız görevler:** Check-up bitiminde öğrenci sonuç özeti görmeden doğrudan dashboard'a düşüyor; görev detayında ise görevin neden seçildiği açıklanmıyor.

**2 Haftalık Proje Kısıtı:** Proje 2 hafta içinde teslime hazır hale geleceği için ağır kapsamlı "Kanıt Ekonomisi" (Proof-of-Skill) tamamen kapsam dışı bırakılmıştır. "Kariyer Uyum Haritası" ise mevcut check-up'ın yalnızca seçilen mesleğin becerilerini puanlaması nedeniyle Sprint 2'ye (Hafta 2) ertelenmiştir.

---

## 2. Hedefler, Kapsam Dışı ve Anti-Hedefler

### Hedefler (Goals)
- Öğrenci akışında **sıfır kilitlenme** (şifre kurtarma, görev atlama, kırık link bildirimi, güvenli onboarding koruması, boş patika kurtarma).
- Öğrencinin profilini, üniversitesini, haftalık çalışma saatini ve öğrenme stilini **mevcut patikasını sıfırlamadan** güncelleyebilmesi.
- Seri (streak) metriğinin **gerçek zamanlı (Europe/Istanbul)** ve **sömürüye kapalı** hale getirilmesi.
- Check-up bitiminde tek seferlik, motive edici bir **Sonuç & Ödül Ekranı** ve her görevde kişiselleştirilmiş **"Neden Bu Görev?"** açıklaması.
- Tüm arayüz metinlerinin ve hata mesajlarının %100 doğal Türkçe olması.

### Kapsam Dışı (Non-Goals)
- Kanıt Ekonomisi (quiz, GitHub/sertifika yükleme, çift katmanlı radar).
- Kariyer Uyum Haritası ve "Kararsızım" keşif check-up dalı (Sprint 2).
- `product_events` analitik event altyapısı.
- AI matcher (`gemini-matcher.ts`, `matcher/index.ts`) ve AI Chatbot.
- `src/proxy.ts`, `src/lib/supabase/middleware.ts` ve `src/lib/auth/require-admin.ts` değişiklikleri.

### Anti-Hedefler (Anti-Goals)
- Henüz `14_sprint1_hygiene.sql` migration'ını Supabase SQL Editor'de çalıştırmamış bir ortamda dashboard veya admin sayfasının çökmesi (**kabul edilemez** — tüm yeni kolon/tablo/RPC çağrılarında güvenli TS fallback zorunludur).
- `src/actions/auth.ts` içindeki `NODE_ENV === "development"` auto-confirm / production kayıt ayrımının bozulması.
- Tamamlanmış (mühürlü) sprintlerdeki görevlerin atlanabilmesi veya geri alınabilmesi.
- Öğrencinin DB'den doğrudan `total_xp`, `current_streak`, `role` veya `tasks.xp_reward` güncelleyebilmesi.

---

## 3. Teknik ve Proje Kısıtları

- **Stack:** Next.js `16.4.6` (App Router, `searchParams` async `Promise`), React `19.3.1`, TypeScript `7` (`strict: true`, `any` yasak), Tailwind CSS `4.3.3`, `@supabase/ssr`, Zod `4`, `lucide-react`, `sonner`, `motion/react` (`useReducedMotion()` destekli).
- **Veri & Güvenlik:** Tüm mutasyonlar `"use server"` Server Actions + `src/lib/validation/student-schemas.ts` Zod şemaları. Bağımsız DB sorguları `Promise.all` ile paralel. Yeni migration: `supabase/migrations/14_sprint1_hygiene.sql` (tamamen idempotent).
- **Çekirdek Dosya Onayı:** `src/actions/auth.ts` düzenlemesi PO tarafından onaylanmıştır; dev/prod kayıt ayrımı aynen korunacaktır.
- **Tasarım Sistemi:** `#0B1F4D` (Navy), `#2F5BFF` (Royal Blue), `#F7F9FC` (sayfa zemini), `#FFFFFF` (kart), `#F59E0B` (vurgu), `rounded-2xl` / `rounded-3xl`, `cn()`.
- **Doğrulama:** `npx tsc --noEmit`, `npm run build` (`next build --webpack`) ve canlı tarayıcıda Chrome DevTools ile görsel/etkileşim/sıfır konsol hatası doğrulaması.

---

## 4. Değerlendirilen Yaklaşımlar

| Yaklaşım | Kapsam | Artılar | Eksiler / Riskler | Karar |
|---|---|---|---|---|
| **Yaklaşım A (Seçilen)** | Faz 0 (analitik hariç) + QW1 (Check-Up Sonuç Ekranı) + QW5 ("Neden Bu Görev?") | 3–4 günde temizce biter; sıfır kilitlenme + yüksek demo etkisi; Hafta 2'de Kariyer Uyum Haritası ve AI entegrasyonu için alan bırakır. | `product_events` analitiği ve Kariyer Uyum Haritası ilk sprintte yer almaz. | **PO tarafından seçildi** |
| **Yaklaşım B** | Yaklaşım A + `product_events` + Check-Up Sonuç Ekranında kısmi Kariyer Uyum Kartı | Tek sprintte daha fazla başlık kapanır. | Mevcut wizard yalnızca seçilen mesleğin becerilerini puanladığı için kısmi uyum skoru yanıltıcı olabilir; takvim 6–7 güne uzar. | Elendi |

---

## 5. Detaylı Tasarım (5 İş Paketi)

### İş Paketi 1: Auth, Şifre Kurtarma ve KVKK (K1, K2, K3)

1. **`AuthActionState` ve Hata Çevirisi (`src/actions/auth.ts` + `src/lib/auth/error-messages.ts`):**
   - `AuthActionState` tipi `{ error?: string | null; success?: string | null }` olarak genişletilir.
   - `translateAuthError(message: string): string` saf yardımcı fonksiyonu yaygın Supabase Auth İngilizce hatalarını (invalid credentials, email not confirmed, user already registered, rate limit, weak/same password, expired link, vb.) doğal Türkçe mesajlara çevirir; bilinmeyen teknik hatalarda jenerik Türkçe mesaj döndürür.
   - `registerAction`: Production akışında `!signUpData.session` durumunda e-posta doğrulaması gerektiğinde artık `error` değil `success: "Kaydınız alındı! E-posta adresinize gönderilen doğrulama bağlantısını onayladıktan sonra giriş yapabilirsiniz."` döndürür. `register/page.tsx` `state.success` varsa yeşil başarı kutusu (`bg-emerald-50 border-emerald-200 text-emerald-800`) gösterir.
   - Dev (`NODE_ENV === "development"`) `createAdminClient()` auto-confirm kayıt ve login davranışı **hiç değiştirilmez**.

2. **Şifremi Unuttum & Şifre Sıfırlama Akışı:**
   - **Login Formu (`src/components/auth/login-form.tsx` + `src/app/(auth)/login/page.tsx`):**
     - Şifre etiketinin sağına `<Link href="/forgot-password">Şifremi unuttum</Link>` eklenir.
     - Query param mesajları desteklenir: `?reset=1` → yeşil banner ("Şifren başarıyla güncellendi. Yeni şifrenle giriş yapabilirsin."), `?error=link_expired` → kırmızı/amber banner ("Bağlantının süresi dolmuş veya geçersiz. Lütfen tekrar şifre sıfırlama talebi oluştur.").
   - **Şifre Sıfırlama Talep Sayfası (`src/app/(auth)/forgot-password/page.tsx`):**
     - `(auth)/layout.tsx` içinde yer alır. E-posta alanı + `requestPasswordResetAction` Server Action (`forgotPasswordSchema` Zod doğrulaması).
     - `requestPasswordResetAction`, `headers()` üzerinden güvenli origin belirler (veya `NEXT_PUBLIC_SITE_URL` varsa onu kullanır) ve `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` })` çağırır.
     - **Hesap tarama (enumeration) koruması:** Supabase rate-limit dışındaki "kullanıcı yok" durumlarında da aynı nötr başarı mesajı döndürülür: *"Eğer bu e-posta adresiyle kayıtlı bir hesabın varsa, şifre sıfırlama bağlantısını gelen kutuna gönderdik."*
   - **Auth Callback Route Handler (`src/app/auth/callback/route.ts`):**
     - `@supabase/ssr` standart PKCE ve OTP akışını destekler:
       - `?code=...` varsa `supabase.auth.exchangeCodeForSession(code)` çağırır.
       - `?token_hash=...&type=...` varsa `supabase.auth.verifyOtp({ token_hash, type })` çağırır.
     - `next` parametresi açık yönlendirme (open-redirect) korumasına tabidir: yalnızca `/` ile başlayan ve `//` ile başlamayan göreli yollar kabul edilir (varsayılan `/dashboard`).
     - Hata durumunda `/login?error=link_expired` adresine yönlendirir.
     - `src/lib/supabase/middleware.ts` ve `src/proxy.ts`'e dokunulmaz (`/auth/callback`, `/forgot-password`, `/reset-password` zaten `isAppRoute` ve `isAuthRoute` dışındadır).
   - **Yeni Şifre Belirleme Sayfası (`src/app/(auth)/reset-password/page.tsx`):**
     - Server Component olarak `supabase.auth.getUser()` kontrolü yapar; geçerli oturum yoksa `/forgot-password` yönlendirmeli açık bir Türkçe uyarı kartı gösterir.
     - Oturum geçerliyse Yeni Şifre + Yeni Şifre (Tekrar) formunu gösterir (`resetPasswordSchema`: min 6 karakter, iki şifre eşleşmeli).
     - `updatePasswordAction` → `supabase.auth.updateUser({ password })` → başarılıysa `/login?reset=1` (veya oturumu koruyarak `/dashboard`) yönlendirmesi yapar. **Karar (Builder'a bırakılmayan):** Recovery oturumu zaten aktif olduğu için `signOut()` yapıp `/login?reset=1` adresine yönlendirilir; böylece öğrenci yeni şifresiyle temiz giriş yapar ve başarı mesajını görür.

3. **KVKK Aydınlatma Metni Modalı (`src/components/auth/kvkk-modal.tsx`):**
   - `register/page.tsx` içindeki **"KVKK Aydınlatma Metni"** metni tıklanabilir bir `<button type="button">` haline getirilir (checkbox'ı yanlışlıkla tetiklememek için `e.preventDefault(); e.stopPropagation()` ile açılır).
   - Modal: `role="dialog"`, `aria-modal="true"`, Escape ve backdrop ile kapatılabilir, `useReducedMotion()` destekli. İçerik: RotaMIS veri sorumlusu kapsamı, işlenen veriler (ad, e-posta, üniversite, beceri özdeğerlendirmesi, görev ilerlemesi), işleme amacı (kişiselleştirilmiş kariyer yol haritası), saklama/haklar (KVKK m.11). Altında "Okudum, Anladım" kapatma butonu.

---

### İş Paketi 2: Akış Kilitlenmelerini Çözme (K8, K9, K12)

1. **`/onboarding` Sayfa Koruması (`src/app/(onboarding)/onboarding/page.tsx`):**
   - Mevcut paralel profil sorgusuna `onboarding_completed` eklenir.
   - `profile?.onboarding_completed === true` ve `profile?.role !== "admin"` ise wizard doğrudan açılmaz; bunun yerine temiz bir bilgi kartı (`OnboardingAlreadyCompletedCard`) gösterilir:
     - Başlık: "Beceri Check-Up'ını Zaten Tamamladın"
     - Açıklama: "Kariyer patikan ve beceri radarın hazır. Devam etmek için paneline dönebilir veya farklı bir meslek seçmek için yolculuğunu sıfırlayabilirsin."
     - Birincil CTA: **"Dashboard'a Dön"** (`/dashboard`)
     - İkincil CTA: **"Hedef Değiştir ve Baştan Başla"** (`resetStudentCareerJourney()` + `router.refresh()`).
   - Admin kullanıcılar mevcut önizleme banner'ı ile `/onboarding` ekranını incelemeye devam edebilir.

2. **Patika Boş Ekranı & Yeniden Deneme (`src/components/dashboard/path/path-empty-state.tsx` + `src/actions/journey.ts`):**
   - `PathEmptyState` artık onboarding'i bitirmiş öğrenciyi `/onboarding`'e geri göndermez!
   - Bunun yerine **"Patikan Hazırlanıyor"** kartı ve **"Patikayı Oluşturmayı Tekrar Dene"** butonu sunar.
   - Yeni Server Action `retryInitialRoadmap()` (`src/actions/journey.ts`):
     - Oturumdaki kullanıcının `v_latest_assessment` kaydından `id` ve `career_path_id` alır.
     - Aktif roadmap yoksa `createAdminClient()` ile oluşturur (mevcut `generateInitialRoadmap` mantığıyla tutarlı, `source` kuralını korur).
     - `createNextSprintForUser(user.id, roadmapId)` çağırır ve `revalidatePath("/dashboard")` yapar.
     - `catalogExhausted: true` dönerse kullanıcıya "Bu kariyer alanı için onaylı eğitim kataloğumuz genişletiliyor, talebin ekibimize iletildi" mesajı gösterilir (admin'e `catalog_demand` zaten yazılır).

3. **Görev Atlama (`skipped`) ve Kırık Link Bildirimi (K12):**
   - **Server Actions (`src/actions/tasks.ts`):**
     - `skipTask(taskId)`:
       - Zod doğrulaması (`skipTaskSchema`).
       - `tasks.status` alanını `"skipped"` yapar (`user_id = user.id`). Mevcut RLS ve sütun yetkisi (`grant update (status)`) doğrudan kullanılır; `tasks` tablosuna ekstra `skip_reason` kolonu **eklenmez** *(Tech Lead kararı: yalnızca kırık link bildirimleri `resource_reports` tablosunda neden + not ile saklanır)*.
       - Mühürlü sprintteki görevleri DB trigger'ı (`tasks_before_update`) reddeder; hata mesajı kullanıcıya Türkçe döner.
       - XP vermez (`tasks_after_status_change` yalnızca `completed` için XP verir; eğer görev önceden `completed` ise XP trigger tarafından zaten geri alınır).
       - **Atlama sınırı *(Tech Lead kararı)*:** 2 haftalık takvimde "sıfır kilitlenme" önceliklendirildiği ve Kanıt Ekonomisi kapsam dışı bırakıldığı için sprint başına atlama limiti konmaz; mevcut `append_sprint` ve `submit_mini_checkup` RPC'lerine dokunulmaz.
       - `revalidatePath("/dashboard")`.
     - `unskipTask(taskId)`: `"skipped"` durumundaki mühürsüz görevi `"pending"` durumuna geri alır.
     - `reportBrokenResource(input: { taskId, resourceId?, reason: "broken_link" | "outdated" | "other", note?, skipAfterReport?: boolean })`:
       - Zod doğrulaması (`reportBrokenResourceSchema`).
       - `resource_reports` tablosuna kayıt ekler (aynı kullanıcı + aynı kaynak için açık bildirim varsa mükerrer hata vermeden başarı döner; tablo henüz migrate edilmemişse sessizce degrade olur ve skip adımını yine çalıştırır).
       - `skipAfterReport === true` ise aynı akışta görevi `"skipped"` yapar ki öğrencinin sprint kapısı anında açılsın!
       - `revalidatePath("/dashboard")` ve `revalidatePath("/admin")`.
   - **Dashboard & Patika Görünümü:**
     - `DashboardShell` (`dashboard-shell.tsx`): `OptimisticAction` union'ına `{ type: "skip"; taskId: string; nextStatus: "skipped" | "pending" }` eklenir; `skipTaskAction`, `unskipTaskAction` ve `reportTaskResource` context metodları açılır.
     - `PathNode` (`path-node.tsx`) & `SprintSection` (`sprint-section.tsx`): `status === "skipped"` olan düğüm nötr gri/slate stilinde, `SkipForward` ikonuyla ve altında **"Atlandı • 0 XP"** rozetiyle gösterilir. (`buildSprints` ve `path-layout.ts` zaten `skipped` görevleri tamamlanmış/geçilmiş sayıp segmenti dolduruyor ve sprint kapısını açıyor!)
     - `TaskDetailSheet` (`task-detail-sheet.tsx`): Mühürsüz ve tamamlanmamış görevlerde ana CTA'nın altında iki ikincil eylem bulunur:
       - **"Zaten Biliyorum / Atla"** (tek tıkla atlar, toast ile geri alma bilgisi verir; atlanmış görev açıldığında "Tekrar Aktif Et" butonu görünür).
       - **"Link Kırık / Sorun Bildir"** (yalnızca `resource_url` varsa): açılır küçük bir inline panel gösterir (neden seçimi + opsiyonel kısa not + "Görevi atla ve patikaya devam et" kutucuğu varsayılan seçili + "Bildir" butonu).
   - **Admin Paneli ve Bildirim Çözümleme (`src/app/admin/page.tsx` + `src/actions/admin/resources.ts`) *(Tech Lead kararı)*:**
     - `Promise.all` sorgu paketine `resource_reports` (unresolved, `resource:learning_resources(id, title, url)`) eklenir; Migration 14 henüz çalıştırılmadıysa hata fırlatmadan boş liste döner (güvenli fallback).
     - "Veri Sağlığı & Dikkat Gerektirenler" bölümüne açık kırık link bildirimi varsa uyarı kartı eklenir (bildirilen kaynak adları, bildirim sayısı, `/admin/resources` bağlantısı ve tek tıkla **"Çözüldü İşaretle"** aksiyonu).
     - **Otomatik & Manuel Çözümleme:** `src/actions/admin/resources.ts` içinde bir kaynak güncellendiğinde (`updateResourceAction`), arşivlendiğinde (`toggleStatusResourceAction` → `archived`) veya silindiğinde (`deleteResourceAction`) o kaynağa ait açık `resource_reports` kayıtları otomatik `resolved = true` yapılır (Migration 14 henüz yoksa hata yutulur). Ek olarak standart admin akışına uygun (`requireAdmin` → Zod → DB → `logAdminAction` → `revalidatePath`) `resolveResourceReportsAction(resourceId)` eklenir.

---

### İş Paketi 3: Profil & Çalışma Temposu Ayarları (K10)

- **Erişim Noktaları:**
  - `DashboardNavbar`: Sağ aksiyon alanına ayarlar butonu (`Settings` ikonu, `aria-label="Profil ve Tempo Ayarları"`).
  - `ProfileGreeting`: "Hedef Değiştir" butonunun yanında küçük "Ayarlar" butonu (veya mobilde profil şeridinde erişilebilir). Her ikisi de `DashboardShell` içindeki `isSettingsOpen` state'ini açar.
- **Bileşen (`src/components/dashboard/profile/profile-settings-modal.tsx`):**
  - `DashboardPage` paralel sorgularına aktif üniversiteler listesi (`universities`) ve `v_latest_assessment` (`weekly_hours`, `learning_style`) eklenir — sıfır waterfall korunur.
  - Düzenlenebilir alanlar:
    - **Ad Soyad** (`full_name`, min 2 / max 100 karakter)
    - **Üniversite** (`university_id` dropdown + `"other"` seçilirse `university_other` input)
    - **Haftalık Çalışma Süresi** (`weekly_hours`, 2–40 saat aralığı slider, 2'şer adım)
    - **Öğrenme Stili** (`hands_on` | `video` | `reading` | `mixed` 4 kart)
  - Bilgilendirme notu: *"Haftalık tempo ve öğrenme stili değişikliklerin mevcut patikanı sıfırlamaz; bir sonraki sprintin oluşturulurken otomatik uygulanır."*
- **Server Action (`src/actions/profile.ts` → `updateStudentSettings`):**
  - Zod doğrulaması (`studentSettingsSchema`).
  - `profiles` tablosunda yalnızca öğrencinin yetkili olduğu kolonlar (`full_name`, `university_id`, `university_other`) güncellenir (column-level `grant update` korunur).
  - `weekly_hours` ve `learning_style` için önce `supabase.rpc("update_student_learning_preferences", { p_weekly_hours, p_learning_style })` çağrılır; Migration 14 henüz uygulanmadıysa güvenli fallback olarak `createAdminClient()` ile **yalnızca `user.id`'nin en son tamamlanan `assessments` kaydı** güncellenir.
  - `revalidatePath("/dashboard")` → toast: "Profil ve çalışma tercihlerin güncellendi."

---

### İş Paketi 4: Seri (Streak) Hijyeni & DB Bütünlüğü (K13, D1)

1. **Veritabanı Migration (`supabase/migrations/14_sprint1_hygiene.sql`):**
   - Tamamen **idempotent** (`if not exists`, `create or replace`, `drop policy if exists`).
   - **Bölüm 1 — `tasks.ever_completed_at` & Seri Sömürüsü Düzeltmesi (D1):**
     - `alter table public.tasks add column if not exists ever_completed_at timestamptz;`
     - Mevcut tamamlanmış görevler için backfill: `update public.tasks set ever_completed_at = coalesce(completed_at, now()) where status = 'completed' and ever_completed_at is null;`
     - `tasks_before_update()`: Görev `completed` olduğunda ve `old.ever_completed_at is null` ise `new.ever_completed_at := now();` (geri alındığında `ever_completed_at` **silinmez**!).
     - `tasks_after_status_change()`: `new.status = 'completed' and old.status <> 'completed'` bloğunda `perform public.register_activity(new.user_id);` çağrısı **yalnızca `old.ever_completed_at is null` ise** çalıştırılır. Böylece bir görev geri alınıp ertesi gün tekrar işaretlense bile seriyi sahte olarak uzatamaz. (XP geri alma ve yeniden verme davranışı korunur.)
   - **Bölüm 2 — `public.resource_reports` Tablosu & RLS:**
     - Kolonlar: `id uuid pk`, `user_id uuid not null references profiles(id) on delete cascade`, `resource_id uuid references learning_resources(id) on delete set null`, `task_id uuid references tasks(id) on delete set null`, `reason text not null check (reason in ('broken_link', 'outdated', 'other'))`, `note text check (char_length(note) <= 500)`, `resolved boolean not null default false`, `created_at timestamptz not null default now()`.
     - Partial unique index: aynı kullanıcı aynı kaynak için birden fazla açık (`resolved = false`) bildirim oluşturamaz.
     - RLS zorunlu: öğrenci kendi bildirimini `insert`/`select` edebilir (`(select auth.uid())`), admin `public.is_admin()` ile hepsini okuyup güncelleyebilir.
   - **Bölüm 3 — `public.update_student_learning_preferences` RPC:**
     - Parametreler: `p_weekly_hours smallint`, `p_learning_style public.learning_style`.
     - `security definer`, `set search_path = ''`, içeride `auth.uid()` kontrolü, `weekly_hours between 1 and 60` kontrolü, en son `status = 'completed'` assessment satırını günceller.
     - `revoke execute ... from public, anon; grant execute ... to authenticated;`

2. **Uygulama Katmanı — Gerçek Seri & Tehlike Bandı (K13):**
   - `dashboard/page.tsx`: `profiles` sorgusuna `last_activity_date` eklenir.
   - `src/lib/gamification.ts`: `computeEffectiveStreak(currentStreak: number, lastActivityDate: string | null, now?: Date)` saf fonksiyonu:
     - `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" })` ile bugünün (`YYYY-MM-DD`) ve dünün tarihini hesaplar (DB'deki `Europe/Istanbul` zaman dilimiyle birebir tutarlı).
     - `lastActivityDate === today` → `{ effectiveStreak: currentStreak, status: "active_today" }`
     - `lastActivityDate === yesterday && currentStreak > 0` → `{ effectiveStreak: currentStreak, status: "at_risk" }`
     - Diğer durumlar → `{ effectiveStreak: 0, status: "broken" }`
   - `DashboardNavbar`, `ProfileCard` (mobil) ve `LevelProgress` artık ham `profile.current_streak` yerine `effectiveStreak` gösterir.
   - `DashboardShell` içindeki optimistic görev tamamlama: öğrenci bugün ilk görevini tamamladığında `streakStatus` anında `"active_today"` olur ve tehlike bandı kaybolur.
   - **Tehlike Bandı:** `streakStatus === "at_risk"` iken `CareerPath` en üstünde kompakt bir amber bant gösterilir: *"🔥 {effectiveStreak} günlük serin tehlikede! Serini korumak için bugün bir görev tamamla."*

---

### İş Paketi 5: Aha Anı — Check-Up Sonuç Modalı & "Neden Bu Görev?" (QW1, QW5)

1. **Check-Up Sonuç Ekranı (`src/components/dashboard/welcome/checkup-result-modal.tsx`):**
   - `saveOnboardingAssessment` (`src/actions/onboarding.ts`) final kayıtta `{ success: true, redirect: "/dashboard?welcome=1" }` döndürür.
   - `DashboardPage` `searchParams: Promise<{ welcome?: string }>` parametresini `await` eder ve `showWelcomeModal={welcome === "1"}` prop'unu geçirir.
   - Modal içeriği:
     - **Üst Kutlama Başlığı (Navy/Royal gradient):** "Check-Up Tamamlandı! Kariyer Haritan Hazır" + ödül çipleri (`+50 XP`, `Seviye {level}`, `🏅 Yola Çıktın`).
     - **Sektör Hazırlık Skoru:** Büyük dairesel yüzde göstergesi (`overallReadiness%`) + seçili kariyer adı (`{careerName}`) + kilometre taşı etiketi (0–39: *Keşif Aşaması*, 40–59: *Gelişim Aşaması*, 60–79: *Staja Hazır*, 80+: *Sektöre Hazır*).
     - **En Büyük 3 Beceri Açığın:** `skillGaps.filter(g => g.gap > 0)` ilk 3 beceri — her birinde beceri adı, `Mevcut: X/5 → Hedef: Y/5`, ve varsa `display_badge` (örn. "İlanların %78'inde"). Açık yoksa "Tüm çekirdek eksenlerde sektör hedefine ulaştın — ileri seviye pekiştirme sprintin hazır!" gösterilir.
     - **Alt CTA:** **"Sprint 1 Hazır — İlk Göreve Başla →"** (modalı kapatır, URL'den `?welcome=1` parametresini `window.history.replaceState` ile temizler ve ilk önerilen görev düğümüne yumuşak kaydırır).

2. **"Neden Bu Görev?" Kartı (`src/lib/path/task-reason.ts` + `TaskDetailSheet`):**
   - Saf yardımcı fonksiyon `buildTaskReason(task: TaskRow, skillGaps: SkillGapRow[], careerName: string)`:
     - `task.skill_id` ile `skillGaps` içinden eşleşen satırı bulur.
     - `gap > 0` ise:
       - Örn: `demand_pct` varsa → *"{careerName} ilanlarının %{Math.round(demand_pct)}'inde aranan **{skillName}** becerindeki {gap} seviyelik açığı ({current}/5 → {required}/5) kapatmak için seçildi."*
       - `demand_pct` yoksa → *"{careerName} hedefindeki **{skillName}** becerisinde sektör beklentisine ({current}/5 → {required}/5) yaklaşman için seçildi."*
     - `gap === 0` ise: *"{careerName} rolündeki **{skillName}** yetkinliğini ({current}/5) pekiştirip bir üst seviyeye taşımak için seçildi."*
     - Eşleşme yoksa: *"{careerName} kariyer patikandaki sektörel yetkinliklerini güçlendirmek için önerildi."*
   - `CareerPath`, `skillGaps` ve `careerName` prop'larını `TaskDetailSheet`'e iletir; görev detay penceresinde "Görev Yönergesi" kutusunun hemen üstünde zarif mavi/indigo bir **"Neden Bu Görev?"** kartı olarak render edilir.

---

## 6. Uygulayıcıya (Builder) Bırakılan Kararlar

- KVKK modalındaki örnek hukuki özet metnin görsel tipografi ve bölümleme detayları (proje renk sistemi içinde).
- `CheckupResultModal` giriş animasyonu ve konfeti/parıltı detayları (`motion/react` + `useReducedMotion()` uyumlu).
- `ProfileSettingsModal` açılış şekli (mobilde bottom-sheet, masaüstünde ortalanmış modal — mevcut `TaskDetailSheet` ve `MiniCheckupSheet` kalıbıyla aynı).
- `student-schemas.ts` içindeki yeni Zod şema isimlendirmeleri ve `admin/page.tsx` kırık link kartının tam yerleşimi.

---

## 7. Doğrulama Kriterleri

- `npx tsc --noEmit` → 0 hata.
- `npm run build` → 0 hata.
- Migration 14 çalıştırılmadan önce **ve** sonra dashboard/admin sayfalarının hatasız açılması (fallback testi).
- Canlı tarayıcıda (Chrome DevTools) sıfır konsol/ağ hatası ile:
  1. `/login` → "Şifremi unuttum" → `/forgot-password` formu.
  2. `/register` → KVKK modalı açma/kapama.
  3. `/onboarding` → tamamlamış öğrenci koruması; yeni check-up sonunda `/dashboard?welcome=1` Sonuç Modalı.
  4. Dashboard → "Neden Bu Görev?", görev atlama (`skipped`) + geri alma, kırık link bildirimi, profil/tempo ayarları kaydetme, bayat seri / tehlike bandı kontrolü.
