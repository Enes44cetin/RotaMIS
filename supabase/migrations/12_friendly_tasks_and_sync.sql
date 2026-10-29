-- =========================================================
-- 12_friendly_tasks_and_sync.sql  |  RotaMIS - Sadeleştirilmiş YBS Görev Havuzu & Admin XP Kontrolü
-- Çalıştırma sırası: 12 (Supabase SQL Editor'de güvenle çalıştırılabilir, idempotent)
-- =========================================================

-- ---------- 1. learning_resources Tablosuna İsteğe Bağlı Özel XP Kolonu ----------
alter table public.learning_resources
  add column if not exists xp_reward int check (xp_reward is null or (xp_reward between 10 and 500));

-- ---------- 2. append_sprint RPC Güncellemesi (Admin Özel XP Belirlediyse Onu Kullanır) ----------
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
  if not exists (
    select 1 from public.roadmaps r
     where r.id = p_roadmap_id and r.user_id = p_user_id and r.is_active = true
  ) then
    raise exception 'Aktif yol haritası bulunamadı.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Geçersiz kaynak listesi formatı.';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 6 then
    raise exception 'Bir sprint en az 1, en fazla 6 görev içerebilir.';
  end if;

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

  insert into public.sprints (
    roadmap_id, user_id, sprint_number, kind, status, source_assessment_id, matcher_version, focus_skill_ids
  ) values (
    p_roadmap_id, p_user_id, v_next_number, v_next_kind, 'active', v_latest_assess,
    coalesce(nullif(p_matcher_version, ''), 'rule-v1'), coalesce(p_focus_skill_ids, '{}')
  ) returning id into v_new_sprint_id;

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

    if exists (
      select 1 from public.tasks t
       where t.roadmap_id = p_roadmap_id
         and t.resource_id = v_res.id
    ) then
      raise exception 'Bu kaynak yol haritasında zaten kullanılmış: %', v_res.id;
    end if;

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
    v_hours := coalesce(v_res.estimated_hours, 3.5);
    v_xp := coalesce(
      v_res.xp_reward,
      least(100, greatest(15, round(v_hours * 7 + v_res.difficulty * 5)::int))
    );

    insert into public.tasks (
      roadmap_id, sprint_id, user_id, skill_id, resource_id,
      title, description, resource_url, resource_type,
      estimated_hours, difficulty, xp_reward, week_number, sort_order, status
    ) values (
      p_roadmap_id, v_new_sprint_id, p_user_id, v_skill_id, v_res.id,
      v_res.title, v_res.description, v_res.url, v_res.resource_type,
      v_hours, v_res.difficulty, v_xp, v_next_number, v_order, 'pending'
    );
  end loop;

  return v_new_sprint_id;
end;
$$;

revoke execute on function public.append_sprint(uuid, uuid, jsonb, text, uuid[]) from public, anon, authenticated;
grant execute on function public.append_sprint(uuid, uuid, jsonb, text, uuid[]) to service_role;

-- ---------- 3. Mevcut 20 Kaynağı Sade, Genel Kültür ve Temel YBS Yetkinlik Odaklı Metinlerle Güncelle ----------
with friendly_catalog(url, title, description, difficulty, estimated_hours) as (
  values
    -- 09_admin.sql kaynakları (6 adet)
    (
      'https://sqlbolt.com/',
      'Veritabanı Nedir? İlk Tablo Okuma Deneyimi',
      'Şirketlerde bilgilerin tablolarda nasıl düzenli tutulduğunu görmek için tarayıcı üzerindeki kısa ve kolay başlangıç adımlarına göz at.',
      1,
      3.0
    ),
    (
      'https://www.kaggle.com/learn/pandas',
      'Python ile Veri Dünyasına Yumuşak Bir Giriş',
      'Karmaşık kodlar ezberlemeye çalışmadan, büyük listelerin bilgisayar yardımıyla nasıl düzenli hale getirildiğini temel örnekler üzerinden incele.',
      1,
      4.0
    ),
    (
      'https://camunda.com/bpmn/',
      'İş Süreçlerini Görsel Şemalarla Anlatmak',
      'Bir siparişin alınmasından müşteriye teslim edilmesine kadar geçen adımların kutular ve oklarla nasıl resmedildiğini görsel rehberden keşfet.',
      1,
      3.0
    ),
    (
      'https://learn.microsoft.com/training/powerplatform/power-bi',
      'Yöneticiler İçin Görsel Rapor (Dashboard) Kültürü',
      'Uzun sayı tablolarının herkesin bir bakışta anlayabileceği sade grafiklere ve karar ekranlarına nasıl dönüştüğünü incele.',
      1,
      4.0
    ),
    (
      'https://www.lucidchart.com/pages/er-diagrams',
      'Bilgiler Birbiriyle Nasıl İlişkilenir? (Temel Kavramlar)',
      'Müşteri, ürün ve sipariş gibi kavramların dijital bir sistem kurulurken birbirine nasıl bağlandığını günlük hayattan örneklerle oku.',
      1,
      2.5
    ),
    (
      'https://www.btkakademi.gov.tr/',
      'Veri Okuryazarlığı ve Bilgi Sistemlerine Genel Bakış',
      'Kurumlarda verinin neden değerli olduğunu ve iş dünyasında karar alırken nasıl kullanıldığını Türkçe içeriklerle genel hatlarıyla öğren.',
      1,
      4.0
    ),

    -- 11_infinite_loop.sql kaynakları (14 adet)
    (
      'https://learn.microsoft.com/training/modules/get-transform-data-power-bi/',
      'Excel ile Düzenli Tablo ve Özet Hazırlama Alışkanlığı',
      'İş hayatının en yaygın aracı olan çalışma tablolarında verileri temiz tutma ve hızlıca özetleme mantığını keşfet.',
      1,
      3.5
    ),
    (
      'https://www.atlassian.com/agile/project-management/user-stories',
      'Müşteri ve Kullanıcı İhtiyaçlarını Doğru Dinlemek',
      'Bir proje veya dijital ürün geliştirilmeden önce "Kullanıcı gerçekte neye ihtiyaç duyuyor?" sorusunu sade cümlelerle yazma yaklaşımını oku.',
      1,
      2.5
    ),
    (
      'https://www.scrum.org/pathway/scrum-master/',
      'Modern Teknoloji Ekipleri Nasıl Çalışır? (Çevik Kültür)',
      'Günümüz şirketlerinin aylar süren planlar yerine kısa adımlarla nasıl ürün geliştirdiğini ve ekip içi iş birliği kültürünü tanı.',
      1,
      3.5
    ),
    (
      'https://www.kaggle.com/learn/data-visualization',
      'Sayıları Hikayeleştirme: Doğru Grafik Seçimi',
      'Bir sunumda hangi bilginin hangi grafik türüyle daha anlaşılır anlatılacağını basit karşılaştırma örnekleriyle incele.',
      2,
      3.5
    ),
    (
      'https://mode.com/sql-tutorial/sql-window-functions/',
      'İş Sorularından Veri İhtiyacına: Analitik Düşünme',
      '"Bu ay geçen aya göre nasıl ilerledik?" gibi günlük iş sorularının veri ekipleri tarafından nasıl yanıtlandığını genel kültür düzeyinde incele.',
      2,
      3.5
    ),
    (
      'https://learning.sap.com/learning-journeys/discovering-sap-business-technology-platform',
      'Şirketler Tüm Departmanları Tek Sistemde Nasıl Yönetir? (ERP)',
      'Satın alma, depo, satış ve muhasebe birimlerinin kurumsal yazılımlarda birbiriyle nasıl haberleştiğini genel hatlarıyla tanı.',
      1,
      4.0
    ),
    (
      'https://www.PMI.org/kickoff',
      'Bir Fikri Projeye Dönüştürmek: Planlama Temelleri',
      'Yeni bir işe başlarken hedef koyma, görevleri paylaşma ve olası aksilikleri önceden fark etme adımlarını interaktif rehberle deneyimle.',
      1,
      3.5
    ),
    (
      'https://www.freecodecamp.org/learn/data-analysis-with-python/',
      'Veriyle Karar Alma Sürecini Adım Adım Tanımak',
      'Dağınık bilgilerin toplanmasından anlamlı bir iş kararına dönüşmesine kadar geçen yolculuğun temel aşamalarına göz at.',
      2,
      4.0
    ),
    (
      'https://tr.khanacademy.org/economics-finance-domain/core-finance/accounting-and-financial-stateme',
      'YBS Öğrencileri İçin Temel İşletme ve Finans Kavramları',
      'Gelir, maliyet, bütçe ve yatırımın geri dönüşü gibi iş toplantılarında sıkça duyacağın kavramları kısa Türkçe videolarla öğren.',
      1,
      3.0
    ),
    (
      'https://ocw.mit.edu/courses/15-279-management-communication-for-undergraduates-fall-2012/',
      'Teknik Ekipler ile İş Birimleri Arasında Köprü Olmak',
      'YBS mezunlarının en güçlü yönü olan "farklı ekiplerin dilinden anlama ve sade iletişim kurma" becerisi üzerine temel ipuçlarını incele.',
      1,
      3.0
    ),
    (
      'https://www.mindtools.com/ag6p79v/root-cause-analysis',
      'Sorunların Kaynağını Bulmak: "5 Neden" Düşünce Tekniği',
      'İş hayatında bir aksaklıkla karşılaştığında yüzeysel çözümler yerine doğru soruları sorarak asıl sebebi bulma yöntemini öğren.',
      1,
      2.5
    ),
    (
      'https://www.ibm.com/topics/business-process-modeling',
      'İş Akışlarında Zaman Kaybettiren Adımları Fark Etmek',
      'Şirketlerde gereksiz tekrar eden işlerin nasıl tespit edildiğini ve süreçleri sadeleştirme bakış açısını makale üzerinden oku.',
      2,
      3.0
    ),
    (
      'https://www.postgresqltutorial.com/postgresql-getting-started/',
      'Kullandığımız Uygulamalar Bilgileri Nasıl Düzenli Saklar?',
      'Günlük hayatta kullandığımız alışveriş ve bankacılık uygulamalarının arka planda bilgileri karışmadan nasıl tuttuğunu kavramsal olarak incele.',
      1,
      3.0
    ),
    (
      'https://learnenglish.britishcouncil.org/business-english',
      'İş Dünyasında E-Posta ve Toplantı İngilizcesi Pratiği',
      'Kurumsal hayatta sık kullanılan profesyonel yazışma kalıplarını ve temel iş İngilizcesi ifadelerini kısa diyaloglarla pekiştir.',
      1,
      3.5
    )
)
update public.learning_resources lr
   set title           = fc.title,
       description     = fc.description,
       difficulty      = fc.difficulty,
       estimated_hours = fc.estimated_hours
  from friendly_catalog fc
 where lr.url = fc.url;

-- ---------- 4. Öğrencilerin Mevcut Patikasındaki Görevleri de Yeni Sade Metinlerle Senkronize Et ----------
update public.tasks t
   set title           = lr.title,
       description     = lr.description,
       resource_type   = lr.resource_type,
       estimated_hours = lr.estimated_hours,
       difficulty      = lr.difficulty,
       xp_reward       = case
                           when t.status in ('pending', 'in_progress') then
                             coalesce(
                               lr.xp_reward,
                               least(100, greatest(15, round(coalesce(lr.estimated_hours, 3.5) * 7 + lr.difficulty * 5)::int))
                             )
                           else t.xp_reward
                         end
  from public.learning_resources lr
 where t.resource_id = lr.id;

