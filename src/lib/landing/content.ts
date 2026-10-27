export interface RoleData {
  id: string;
  name: string;
  tagline: string;
  readinessPct: number;
  biggestGap: string;
  marketLevels: Record<string, number>;
}

export const SKILL_AXES = [
  "SQL",
  "Python",
  "Veri Görselleştirme",
  "Süreç Modelleme",
  "ERP Sistemleri",
  "İletişim",
] as const;

// Student fixed sample profile (3rd year student)
export const STUDENT_SAMPLE_LEVELS: Record<string, number> = {
  SQL: 3,
  Python: 2,
  "Veri Görselleştirme": 3,
  "Süreç Modelleme": 3,
  "ERP Sistemleri": 2,
  İletişim: 4,
};

export const LANDING_ROLES: RoleData[] = [
  {
    id: "is-analisti",
    name: "İş Analisti",
    tagline: "Süreç modelleme, gereksinim analizi ve paydaş yönetimi",
    readinessPct: 68,
    biggestGap: "Süreç Modelleme (BPMN)",
    marketLevels: {
      SQL: 3,
      Python: 2,
      "Veri Görselleştirme": 3,
      "Süreç Modelleme": 5,
      "ERP Sistemleri": 4,
      İletişim: 5,
    },
  },
  {
    id: "veri-analisti",
    name: "Veri Analisti",
    tagline: "Veri sorgulama, modelleme ve karar destek panoları",
    readinessPct: 74,
    biggestGap: "SQL & Power BI",
    marketLevels: {
      SQL: 5,
      Python: 4,
      "Veri Görselleştirme": 5,
      "Süreç Modelleme": 2,
      "ERP Sistemleri": 2,
      İletişim: 4,
    },
  },
  {
    id: "erp-danismani",
    name: "ERP Danışmanı",
    tagline: "Kurumsal sistem uyarlaması ve iş akış optimizasyonu",
    readinessPct: 58,
    biggestGap: "ERP Süreçleri (SAP)",
    marketLevels: {
      SQL: 3,
      Python: 1,
      "Veri Görselleştirme": 2,
      "Süreç Modelleme": 4,
      "ERP Sistemleri": 5,
      İletişim: 4,
    },
  },
  {
    id: "urun-yoneticisi",
    name: "Ürün Yöneticisi",
    tagline: "Dijital ürün vizyonu, kullanıcı araştırması ve Agile",
    readinessPct: 72,
    biggestGap: "Strateji & İletişim",
    marketLevels: {
      SQL: 3,
      Python: 2,
      "Veri Görselleştirme": 3,
      "Süreç Modelleme": 4,
      "ERP Sistemleri": 3,
      İletişim: 5,
    },
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "5 dakikada kendini değerlendir",
    description: "SQL'den BPMN'e, yabancı dilden ERP'ye 20 temel alanda mevcut seviyeni puanla.",
    tag: "Hızlı Check-Up",
  },
  {
    step: "02",
    title: "Radar analiziyle eksiklerini keşfet",
    description: "Hedeflediğin pozisyonun ilan gereksinimleriyle kendi puanlarını birebir karşılaştır.",
    tag: "Gap Analizi",
  },
  {
    step: "03",
    title: "Yapay zekâ sana özel görevler versin",
    description: "Ayırabileceğin haftalık saate göre uygulamalı mikro görevlerle seviye atla, XP kazan.",
    tag: "Akıllı Yol Haritası",
  },
];

export const STUDENT_VOICES = [
  {
    tag: "3. Sınıf YBS",
    quote: "SQL'de iyi olduğumu sanıyordum. Radar grafiğini görünce sektörün çok gerisinde olduğumu fark ettim.",
    topic: "#SQL #SektörGerçekleri",
    color: "from-blue-500 to-indigo-600",
  },
  {
    tag: "Son Sınıf Mezun Adayı",
    quote: "İş Analisti mi yoksa Veri Analisti mi olmalıyım karar veremiyordum. Yetkinlik haritası kararsızlığımı bitirdi.",
    topic: "#KariyerRotası",
    color: "from-indigo-500 to-violet-600",
  },
  {
    tag: "2. Sınıf YBS",
    quote: "Okulda sadece teori gördüğümüz SAP ve BPMN'in stajda neden bu kadar sorulduğunu buradaki görevlerle anladım.",
    topic: "#BPMN #StajHazırlığı",
    color: "from-cyan-500 to-blue-600",
  },
  {
    tag: "Yeni Mezun",
    quote: "Haftalık 6 saat ayırabildiğimi söyledim, görevleri tam programıma göre dizdi. İlk defa motivasyonum düşmedi.",
    topic: "#KişiselPlan #XP",
    color: "from-blue-600 to-navy",
  },
  {
    tag: "3. Sınıf YBS",
    quote: "İş ilanlarındaki 'en az 2 yıl deneyim' şartı korkutuyordu. Eksik kaldığım araçları tek tek tamamlamaya başladım.",
    topic: "#Portfolyo",
    color: "from-emerald-500 to-teal-600",
  },
  {
    tag: "Hazırlık / 1. Sınıf",
    quote: "YBS'nin tam olarak ne iş yaptığını 4 yıl sonra değil, 1. sınıfta somut olarak görebilmek çok büyük avantaj.",
    topic: "#YBSFarkı",
    color: "from-amber-500 to-orange-600",
  },
];
