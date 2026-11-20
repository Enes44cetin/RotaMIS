# RotaMIS — Yalın & 20 Mesleğe Ölçeklenen Görev Motoru Tasarım Dokümanı

**Tarih:** 20 Kasım 2026  
**Durum:** Taslak (PO onayı bekleniyor)  
**Odak:** Görev içeriklerinin yalınlaştırılması, 20+ mesleğe sıfır el işçiliğiyle ölçeklenmesi, `%99` hazırlık skoru hatasının ve `%100` hazır öğrenciye yol haritası çıkması sorununun giderilmesi.  
**AI Modülü Uyumu:** `src/lib/roadmap/matcher/gemini-matcher.ts` ve `src/lib/roadmap/matcher/index.ts` dosyalarına **hiç dokunulmaz**; AI eşleştirme motoru aktif kalır ve önceden filtrelenmiş temiz aday havuzuyla çok daha isabetli çalışır.

---

## 1. Amaç ve Çözülen Sorunlar

1. **20 Meslek Ölçeklenebilirliği:** Her meslek ve beceri için elle *"Veritabanı Nedir? İlk Tablo Okuma Deneyimi"* gibi hikâyeli kurslar yazmak 20 meslek için imkânsızdır. Bunun yerine her beceri eklendiğinde (CSV import veya admin paneli) veritabanı trigger'ı ile **3 kademeli yalın yetkinlik görevi** otomatik üretilir.
2. **Hepsine 5 Verince `%99` Çıkması Hatası:** `Yazılım Geliştirici` rotasında `python` becerisinin `is_core_checkup = false` olması nedeniyle check-up'ta sorulmayıp `v_skill_gap` içinde `Seviye 1` sayılması düzeltilir. Sorulan tüm sorulara 5 veren öğrencinin skoru **tam `%100`** çıkar.
3. **%100 Hazır (`gap = 0`) Öğrenciye Yol Haritası Çıkması:** Hiçbir beceri açığı olmayan öğrenciye sprint veya görev **üretilmez**; dashboard'da doğrudan **"🏆 Sektör Beklentilerini %100 Karşılıyorsun"** ekranı gösterilir.
4. **Seviye Altı veya Alakasız Görev Atanması:** Öğrencinin mevcut seviyesinin altında kalan (`target_level <= current_level`) veya açığı olmayan (`gap = 0`) becerilerden görev atanması hem AI (`geminiMatcher`) hem de kural motoru (`ruleMatcher`) için kesin olarak engellenir.

---

## 2.AI (`gemini-matcher.ts`) İle Nasıl Çalışır?

- **AI Modülü Aynen Korunur:** `ROTAMIS_MATCHER_MODE=gemini` (veya `ai`) olduğunda görev seçimi ve pedagojik sıralama yine `GeminiResourceMatcher` tarafından yapılır.
- **Neden Eskisinden Çok Daha İyi Çalışır?**
  1. Eskiden yeni bir meslek CSV ile eklendiğinde katalogda o becerilere ait kaynak olmadığı için AI seçebileceği görev bulamıyordu. Artık her yeni beceri eklendiğinde 3 kademeli yalın görev adayı DB'de otomatik oluşacağı için **AI 20 mesleğin tamamında** anında görev seçebilir.
  2. `createNextSprintForUser` (`src/actions/journey.ts`), AI'ı çağırmadan önce aday havuzunu **yalnızca öğrencinin `gap > 0` olan becerilerine ve `target_level > current_level` olan kademelere** daraltır. Böylece AI asla Seviye 4 öğrenciye Seviye 1 görevi seçemez.
  3. Öğrencinin hiç açığı yoksa (`activeGaps.length === 0`), AI boşuna çağrılmaz ve görev üretilmez.

---

## 3. Detaylı Mimari Tasarım

### 3.1 Veritabanı Migration (`supabase/migrations/15_lean_scalable_tasks.sql` — İdempotent)

1. **`v_skill_gap` & Check-Up Tutarlılığı:**
   - Mevcut `career_path_skill_requirements` kayıtlarında `is_core_checkup = true` yapılır (Yazılım Geliştirici'deki gizli `python` açığı kapanır).
   - `v_skill_gap` görünümüne `where (req.is_core_checkup = true or r.level is not null)` koşulu eklenir (mevcut kolon sırası ve `::int` tipleri birebir korunur).
   - `csv-parser.ts` içindeki `isCoreCheckup` varsayılan olarak tüm aktarılan meslek becerileri için `true` yapılır ki yeni yüklenen 20 meslekte de gizli beceri kalmasın.

2. **Yalın 3 Kademeli Görev Şablonu Fonksiyonu ve Trigger'ı (`ensure_lean_skill_resources`):**
   - Her aktif beceri (`public.skills`) için 3 standart kademe tanımlanır:
     - **Kademe 1 (`difficulty = 1`, `min_level = 1`, `target_level = 2`, `estimated_hours = 3.0`):**
       - Başlık: `{Beceri Adı} — Temel Yetkinlik`
       - Açıklama: `{Beceri Adı} alanında temel kavramları ve çalışma prensiplerini kavrayarak başlangıç seviyesini tamamla.`
     - **Kademe 2 (`difficulty = 2`, `min_level = 2`, `target_level = 4`, `estimated_hours = 4.0`):**
       - Başlık: `{Beceri Adı} — Uygulama & Pratik`
       - Açıklama: `{Beceri Adı} yetkinliğini gerçek senaryolar ve pratik uygulamalarla bağımsız kullanabilecek düzeye taşı.`
     - **Kademe 3 (`difficulty = 3`, `min_level = 4`, `target_level = 5`, `estimated_hours = 5.0`):**
       - Başlık: `{Beceri Adı} — İleri Seviye & Sektör Standardı`
       - Açıklama: `{Beceri Adı} alanında karmaşık problemleri çözebilecek ve mimari kararlar alabilecek sektör uzmanlığı düzeyine ulaş.`
   - Otomatik üretilen yalın görevlerin `url` alanı `https://rotamis.local/skill/<slug>/tier-<1|2|3>` şeklinde deterministik ve tekil (unique) bir dahili tanımlayıcı taşır (böylece `on conflict` ve idempotency %100 korunur; arayüz ise `rotamis.local` dahili URL'lerinde dış link kutusunu gizler, yalnızca admin gerçek bir dış eğitim URL'si eklediyse dış link kutusunu gösterir!). `src/actions/admin/resources.ts` içindeki `checkResourceLinksAction` da `rotamis.local` dahili şablon URL'lerini dış HTTP kontrolünden muaf tutup `link_status = 'ok'` olarak işaretler.
   - **`trg_skills_ensure_lean_resources` Trigger'ı:** `public.skills` tablosuna her yeni beceri eklendiğinde veya adı güncellendiğinde bu 3 kademeyi otomatik oluşturur/günceller.
   - **Mevcut Katalog Temizliği:** `09`, `11`, `12` ve `13` numaralı migration'lardaki hikâyeli başlangıç kaynakları arşivlenir (`status = 'archived'`) veya yalın kademelerle değiştirilir; aktif öğrenci görevleri (`tasks`) yeni yalın başlıklarla senkronize edilir.

### 3.2 Eşleştirme ve Sprint Üretimi (`src/actions/journey.ts` & `src/lib/roadmap/matcher/rule-matcher.ts`)

1. **`gap = 0` Kısa Devresi (`src/actions/journey.ts`):**
   - `createNextSprintForUser` içinde `activeGaps = skillGaps.filter((g) => g.gap > 0)` hesaplanır.
   - `activeGaps.length === 0` ise hiçbir sprint/görev oluşturulmaz; mevcut aktif standart sprint varsa tamamlanır ve `{ ok: true, allGapsClosed: true, sprintId: null, sprintNumber: maxSprintNumber }` döner.
2. **Aday Havuzu Ön Filtrelemesi (`src/actions/journey.ts`):**
   - Matcher'a (`matchResourcesForNextSprint`) gönderilen `catalogResources` listesi yalnızca şu koşulu sağlayan kaynak+beceri bağlarıyla filtrelenir:
     - Bağlı beceride `gap > 0` olmalı **VE**
     - `link.target_level > gap.current_level` olmalı (öğrencinin mevcut seviyesinin üstünde bir hedef sunmalı).
   - Böylece `gemini-matcher.ts`'e hiç dokunmadan AI'ın da yalnızca doğru seviyedeki görevleri seçmesi garanti altına alınır.
3. **`rule-matcher.ts` Sadeleştirmesi:**
   - `pickPass` içine `link.target_level <= effectiveCurrent` filtresi eklenir (asla mevcut seviyenin altında görev seçmez).
   - **Tur 3 (`allowZeroGapCareerSkills`)** ve **Tur 4 (`catalog_fallback`)** tamamen kaldırılır. Öğrencinin yalnızca 1 beceride 1 kademelik açığı varsa sprintte yalnızca o 1 görev oluşur.

### 3.3 Arayüz ve UX Güncellemeleri

1. **`MasteryCompletedCard` (`src/components/dashboard/path/mastery-completed-card.tsx`):**
   - Öğrencinin tüm becerilerde `gap === 0` (`overallReadiness === 100` veya aktif açık = 0) olması ve aktif görevlerinin bitmiş/hiç oluşmamış olması durumunda `CareerPath` içinde gösterilir:
     - Başlık: **"🏆 Tebrikler! {careerName} Sektör Beklentilerini %100 Karşılıyorsun"**
     - Açıklama: *"Özdeğerlendirme sonuçlarına göre bu kariyer rotasında kapatman gereken bir yetkinlik açığı bulunmuyor. İstersen değerlendirmeni daha gerçekçi puanlarla güncelleyebilir veya farklı bir kariyer alanını keşfedebilirsin."*
     - Aksiyonlar: **"Değerlendirmemi Güncelle / Baştan Çöz"** ve **"Farklı Kariyer Hedefi Seç"** (`resetStudentCareerJourney()`).
2. **Dinamik Sprint Alt Başlıkları (`src/lib/path/build-sprints.ts`):**
   - Sabit *"Temelleri Atıyoruz"* yerine sprintteki görevlerin zorluk kademesine göre başlık üretilir:
     - `Temel Yetkinlik Adımları` / `Uygulama & Sektör Pratiği` / `İleri Seviye & Sektör Standardı`.
3. **Yalın `TaskDetailSheet` (`src/components/dashboard/task-detail/task-detail-sheet.tsx`):**
   - `task.resource_url` dahili şablon tanımlayıcısı (`rotamis.local`) ise veya boşsa **"Öğrenme Kaynağını Aç"** ve **"Link Kırık / Sorun Bildir"** butonları gizlenir; kart tamamen yalın bir yetkinlik hedefi kartı olarak kalır. Admin özel bir dış URL tanımladıysa dış link butonu görünür.

---

## 4. Doğrulama Kriterleri

- Birim testleri:
  - Tüm sorulara 5 veren (`gap = 0`) öğrencide `ruleMatcher` **0 görev** döndürür.
  - Seviye 3 (`current_level: 3, required_level: 5`) öğrencide `target_level <= 3` olan Temel görevler elenir, yalnızca `target_level > 3` olan görev seçilir.
  - Sadece 1 beceride açığı olan öğrenciye başka becerilerden dolgu görevi eklenmez.
- `npx tsc --noEmit` ve `npm run build` sıfır hatayla geçer.
- Canlı tarayıcı (Chrome DevTools) testi:
  - `Yazılım Geliştirici` seçip tüm sorulara `5/5` verildiğinde hazırlık skoru **%100** çıkar ve dashboard'da saçma bir yol haritası yerine **"Sektör Beklentilerini %100 Karşılıyorsun"** kartı görünür.
  - Bazı sorulara `1–3` verildiğinde ise yalnızca o eksik becerilerin seviyesine uygun **yalın görevler** (`{Beceri Adı} — Temel Yetkinlik / Uygulama & Pratik`) üretilir.
