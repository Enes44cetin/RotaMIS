import { slugifyTr } from "../admin/slugify.ts";
import type { SkillCategory } from "@/types/database";

export interface RawMarketCsvRow {
  piyasa: string;
  rol: string;
  kategori: string;
  kategori_adi: string;
  yetkinlik: string;
  ilan_sayisi: number;
  toplam_ilan: number;
  yuzde: number;
  yuzde_alt: number;
  yuzde_ust: number;
  oncelik: string;
  gosterim: string;
  kapsam_uyarisi: string;
}

export interface MarketSliceOption {
  key: string;
  piyasa: string;
  rol: string;
  totalPostings: number;
  rowCount: number;
  scopeWarning: string | null;
}

export interface NormalizedMarketSkillItem {
  slug: string;
  nameTr: string;
  axisLabelTr: string;
  category: SkillCategory;
  marketCategory: string;
  marketCategoryLabel: string;
  mentionCount: number;
  totalPostings: number;
  demandPct: number;
  priorityLabel: string;
  displayBadge: string;
  requiredLevel: number;
  importance: number;
  isRadarAxis: boolean;
  axisOrder: number | null;
  isCoreCheckup: boolean;
  promptTr: string;
}

/**
 * Tırnak içi ayırıcıları ("Framework, veritabanı ve araçlar" gibi) doğru ayrıştıran CSV satır okuyucu.
 * Hem virgül (,) hem de Türkçe Excel noktalı virgül (;) ayırıcısını destekler.
 */
function parseCsvLine(line: string, delimiter: "," | ";" = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumeric(val: string | undefined): number {
  if (!val) return 0;
  const normalized = val.replace(",", ".").trim();
  return Number(normalized) || 0;
}

export function parseMarketCsvText(csvText: string): {
  rows: RawMarketCsvRow[];
  slices: MarketSliceOption[];
  error?: string;
} {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) {
    return { rows: [], slices: [], error: "CSV içeriği boş." };
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      slices: [],
      error: "CSV dosyasında başlık ve en az 1 veri satırı bulunmalıdır.",
    };
  }

  const delimiter: "," | ";" =
    (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length
      ? ";"
      : ",";

  const header = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());
  const idx = {
    piyasa: header.indexOf("piyasa"),
    rol: header.indexOf("rol"),
    kategori: header.indexOf("kategori"),
    kategori_adi: header.indexOf("kategori_adi"),
    yetkinlik: header.indexOf("yetkinlik"),
    ilan_sayisi: header.indexOf("ilan_sayisi"),
    toplam_ilan: header.indexOf("toplam_ilan"),
    yuzde: header.indexOf("yuzde"),
    yuzde_alt: header.indexOf("yuzde_alt"),
    yuzde_ust: header.indexOf("yuzde_ust"),
    oncelik: header.indexOf("oncelik"),
    gosterim: header.indexOf("gosterim"),
    kapsam_uyarisi: header.indexOf("kapsam_uyarisi"),
  };

  if (idx.yetkinlik === -1 || idx.yuzde === -1) {
    return {
      rows: [],
      slices: [],
      error:
        "CSV başlıklarında 'yetkinlik' ve 'yuzde' kolonları bulunamadı. Lütfen standart sektör analiz CSV formatını kullanın.",
    };
  }

  const rows: RawMarketCsvRow[] = [];
  const sliceMap = new Map<string, MarketSliceOption>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const yetkinlik = cols[idx.yetkinlik] || "";
    if (!yetkinlik) continue;

    const piyasa = idx.piyasa >= 0 ? cols[idx.piyasa] || "Yerel" : "Yerel";
    const rol = idx.rol >= 0 ? cols[idx.rol] || "Genel" : "Genel";
    const kategori =
      idx.kategori >= 0 ? cols[idx.kategori] || "temel_teknik_araclar" : "temel_teknik_araclar";
    const kategori_adi =
      idx.kategori_adi >= 0 ? cols[idx.kategori_adi] || kategori : kategori;
    const ilan_sayisi = parseNumeric(cols[idx.ilan_sayisi]);
    const toplam_ilan = parseNumeric(cols[idx.toplam_ilan]);
    const yuzde = parseNumeric(cols[idx.yuzde]);
    const yuzde_alt = idx.yuzde_alt >= 0 ? parseNumeric(cols[idx.yuzde_alt]) : 0;
    const yuzde_ust = idx.yuzde_ust >= 0 ? parseNumeric(cols[idx.yuzde_ust]) : 0;
    const oncelik = idx.oncelik >= 0 ? cols[idx.oncelik] || "Sık istenen" : "Sık istenen";
    const gosterim =
      idx.gosterim >= 0 && cols[idx.gosterim]
        ? cols[idx.gosterim]
        : `%${Math.round(yuzde)} · ${toplam_ilan} ilanın ${ilan_sayisi}'inde`;
    const kapsam_uyarisi =
      idx.kapsam_uyarisi >= 0 ? cols[idx.kapsam_uyarisi] || "" : "";

    rows.push({
      piyasa,
      rol,
      kategori,
      kategori_adi,
      yetkinlik,
      ilan_sayisi,
      toplam_ilan,
      yuzde,
      yuzde_alt,
      yuzde_ust,
      oncelik,
      gosterim,
      kapsam_uyarisi,
    });

    const sliceKey = `${piyasa}__${rol}`;
    const existingSlice = sliceMap.get(sliceKey);
    if (existingSlice) {
      existingSlice.rowCount += 1;
      if (toplam_ilan > existingSlice.totalPostings) {
        existingSlice.totalPostings = toplam_ilan;
      }
      if (!existingSlice.scopeWarning && kapsam_uyarisi) {
        existingSlice.scopeWarning = kapsam_uyarisi;
      }
    } else {
      sliceMap.set(sliceKey, {
        key: sliceKey,
        piyasa,
        rol,
        totalPostings: toplam_ilan,
        rowCount: 1,
        scopeWarning: kapsam_uyarisi || null,
      });
    }
  }

  return {
    rows,
    slices: Array.from(sliceMap.values()),
  };
}

function mapCategory(rawKat: string): SkillCategory {
  const lower = rawKat.toLowerCase();
  if (lower.includes("yabanci_dil") || lower.includes("soft") || lower.includes("iletisim")) {
    return "soft";
  }
  if (lower.includes("metodoloji") || lower.includes("is_") || lower.includes("surec")) {
    // is_odakli_araclar (Docker, PostgreSQL, React vb.) teknik araçtır
    if (lower === "is_odakli_araclar") return "technical";
    return "business";
  }
  return "technical";
}

interface CanonicalSkillMapping {
  slug: string;
  nameTr?: string;
  axisLabelTr?: string;
}

function mapCanonicalSkill(yetkinlik: string): CanonicalSkillMapping {
  const clean = yetkinlik.trim().toLowerCase();

  // Aynı teknoloji ailesine ait alt araçları (örn. .NET + C#, SQL + MSSQL/PostgreSQL)
  // ortak çekirdek yetkinlik altında birleştirerek 6'lı radarda mükerrer eksen oluşmasını önler.
  const familyMap: Record<string, CanonicalSkillMapping> = {
    sql: { slug: "sql", nameTr: "SQL & Veritabanı Sorgulama", axisLabelTr: "SQL & Veritabanı" },
    mssql: { slug: "sql" },
    postgresql: { slug: "sql" },
    mysql: { slug: "sql" },
    "t-sql": { slug: "sql" },
    "pl/sql": { slug: "sql" },
    oracle: { slug: "sql" },

    git: { slug: "git", nameTr: "Git & Versiyon Kontrolü", axisLabelTr: "Git & Versiyon" },
    github: { slug: "git" },
    gitlab: { slug: "git" },

    ".net": { slug: "dotnet-csharp", nameTr: ".NET & C# Backend Geliştirme", axisLabelTr: ".NET & C#" },
    "c#": { slug: "dotnet-csharp", nameTr: ".NET & C# Backend Geliştirme", axisLabelTr: ".NET & C#" },
    "asp.net": { slug: "dotnet-csharp" },
    "entity framework": { slug: "dotnet-csharp" },

    "rest api": { slug: "rest-api", nameTr: "REST API & Servis Mimarisi", axisLabelTr: "REST API" },
    swagger: { slug: "rest-api" },
    graphql: { slug: "rest-api" },
    soap: { slug: "rest-api" },

    oop: { slug: "oop-solid", nameTr: "OOP & Tasarım Kalıpları (Design Patterns)", axisLabelTr: "OOP & Mimari" },
    "design patterns": { slug: "oop-solid" },
    solid: { slug: "oop-solid" },
    "clean code": { slug: "oop-solid" },
    "clean architecture": { slug: "oop-solid" },
    ddd: { slug: "oop-solid" },

    docker: { slug: "docker-cicd", nameTr: "Docker, CI/CD & DevOps", axisLabelTr: "Docker & CI/CD" },
    "ci/cd": { slug: "docker-cicd" },
    devops: { slug: "docker-cicd" },
    kubernetes: { slug: "docker-cicd" },
    jenkins: { slug: "docker-cicd" },
    "azure devops": { slug: "docker-cicd" },
    linux: { slug: "docker-cicd" },

    java: { slug: "java-spring", nameTr: "Java & Spring Boot", axisLabelTr: "Java & Spring" },
    "spring boot": { slug: "java-spring" },
    hibernate: { slug: "java-spring" },
    maven: { slug: "java-spring" },

    javascript: { slug: "javascript-ts", nameTr: "JavaScript, TypeScript & React", axisLabelTr: "JS / TS & React" },
    typescript: { slug: "javascript-ts" },
    react: { slug: "javascript-ts" },
    angular: { slug: "javascript-ts" },
    vue: { slug: "javascript-ts" },
    "next.js": { slug: "javascript-ts" },
    "node.js": { slug: "javascript-ts" },
    html: { slug: "javascript-ts" },
    css: { slug: "javascript-ts" },

    mikroservis: { slug: "microservices-messaging", nameTr: "Mikroservis, Redis & Mesaj Kuyrukları", axisLabelTr: "Mikroservis & MQ" },
    rabbitmq: { slug: "microservices-messaging" },
    redis: { slug: "microservices-messaging" },
    kafka: { slug: "microservices-messaging" },
    elasticsearch: { slug: "microservices-messaging" },
    "event-driven": { slug: "microservices-messaging" },

    "unit test": { slug: "testing-quality", nameTr: "Unit Test, Code Review & Algoritma", axisLabelTr: "Unit Test & Kalite" },
    tdd: { slug: "testing-quality" },
    "code review": { slug: "testing-quality" },
    algoritma: { slug: "testing-quality" },
    "veri yapıları": { slug: "testing-quality" },

    agile: { slug: "agile-scrum", nameTr: "Agile & Scrum Çevik Geliştirme", axisLabelTr: "Agile & Scrum" },
    scrum: { slug: "agile-scrum" },
    sdlc: { slug: "agile-scrum" },
    jira: { slug: "agile-scrum" },

    python: { slug: "python", nameTr: "Python", axisLabelTr: "Python" },
    "power bi": { slug: "bi-tools", nameTr: "BI Araçları (Power BI / Tableau)", axisLabelTr: "Power BI / Tableau" },
    tableau: { slug: "bi-tools" },
    excel: { slug: "excel", nameTr: "İleri Excel", axisLabelTr: "İleri Excel" },
    "אינגilizce": { slug: "english", nameTr: "İngilizce", axisLabelTr: "İngilizce" },
    ingilizce: { slug: "english", nameTr: "İngilizce", axisLabelTr: "İngilizce" },
    "yabancı dil": { slug: "yabanci-dil", nameTr: "Yabancı Dil", axisLabelTr: "Yabancı Dil" },
  };

  if (familyMap[clean]) return familyMap[clean];
  return { slug: slugifyTr(yetkinlik) || "skill" };
}

function computeLevelAndImportance(
  yuzde: number,
  oncelik: string
): { requiredLevel: number; importance: number } {
  const prio = oncelik.toLowerCase();
  if (prio.includes("çok istenen") || yuzde >= 50) {
    return { requiredLevel: 5, importance: 3 };
  }
  if (prio.includes("sık istenen") || yuzde >= 25) {
    return { requiredLevel: 4, importance: 3 };
  }
  if (prio.includes("fark yaratan") || yuzde >= 10) {
    return { requiredLevel: 3, importance: 2 };
  }
  return { requiredLevel: 2, importance: 1 };
}

/**
 * Seçilen (piyasa, rol) dilimindeki satırları normalize eder,
 * 'egitim_ve_bolum' (diploma istatistikleri) satırlarını ayırır ve
 * en çok istenen 6 mesleki yetkinliği otomatik olarak Radar Ekseni (1..6) olarak işaretler.
 */
export function normalizeSliceForImport(
  allRows: RawMarketCsvRow[],
  sliceKey: string,
  includeLowDemand = false,
  radarAxisCount = 6
): {
  skills: NormalizedMarketSkillItem[];
  educationStats: Array<{ name: string; pct: number; badge: string }>;
  totalPostings: number;
  scopeWarning: string | null;
} {
  const [targetPiyasa, targetRol] = sliceKey.split("__");
  const sliceRows = allRows.filter(
    (r) => r.piyasa === targetPiyasa && r.rol === targetRol
  );

  const educationStats: Array<{ name: string; pct: number; badge: string }> = [];
  const candidateRows: RawMarketCsvRow[] = [];
  let totalPostings = 0;
  let scopeWarning: string | null = null;

  for (const r of sliceRows) {
    if (r.toplam_ilan > totalPostings) totalPostings = r.toplam_ilan;
    if (!scopeWarning && r.kapsam_uyarisi) scopeWarning = r.kapsam_uyarisi;

    if (r.kategori === "egitim_ve_bolum") {
      educationStats.push({
        name: r.yetkinlik,
        pct: r.yuzde,
        badge: r.gosterim,
      });
      continue;
    }

    // "İngilizce" varken mükerrer "Yabancı Dil" genel satırını atla
    if (
      r.yetkinlik.toLowerCase() === "yabancı dil" &&
      sliceRows.some((x) => x.yetkinlik.toLowerCase() === "ingilizce")
    ) {
      continue;
    }

    if (!includeLowDemand && r.oncelik.toLowerCase().includes("az aranan") && r.yuzde < 10) {
      continue;
    }

    candidateRows.push(r);
  }

  // İlan yüzdesine göre büyükten küçüğe sırala
  candidateRows.sort((a, b) => b.yuzde - a.yuzde || b.ilan_sayisi - a.ilan_sayisi);

  // Aynı teknoloji ailesine (slug) düşen alt araçlarda en yüksek yüzdeliyi tut
  const seenSlugs = new Set<string>();
  const deduped: Array<{ row: RawMarketCsvRow; mapping: CanonicalSkillMapping }> = [];
  for (const r of candidateRows) {
    const mapping = mapCanonicalSkill(r.yetkinlik);
    if (!seenSlugs.has(mapping.slug)) {
      seenSlugs.add(mapping.slug);
      deduped.push({ row: r, mapping });
    }
  }

  // 6 Radar Ekseni seçimi: Önce mesleğin çekirdek teknik ve süreç yetkinliklerini (yabancı dil hariç) seç;
  // eğer 6'dan azsa kalanlarla tamamla.
  const radarSlugSet = new Set<string>();
  for (const item of deduped) {
    if (radarSlugSet.size >= radarAxisCount) break;
    if (item.row.kategori !== "yabanci_dil") {
      radarSlugSet.add(item.mapping.slug);
    }
  }
  if (radarSlugSet.size < radarAxisCount) {
    for (const item of deduped) {
      if (radarSlugSet.size >= radarAxisCount) break;
      radarSlugSet.add(item.mapping.slug);
    }
  }

  let axisCounter = 1;
  const skills: NormalizedMarketSkillItem[] = deduped.map(({ row: r, mapping }) => {
    const slug = mapping.slug;
    const displayName = mapping.nameTr || r.yetkinlik;
    const axisLabel = mapping.axisLabelTr || r.yetkinlik;
    const category = mapCategory(r.kategori);
    const { requiredLevel, importance } = computeLevelAndImportance(r.yuzde, r.oncelik);
    const isRadarAxis = radarSlugSet.has(slug);
    const axisOrder = isRadarAxis ? axisCounter++ : null;

    const promptTr =
      category === "technical"
        ? `Sektör ilanlarının %${Math.round(r.yuzde)}'inde aranan ${displayName} teknolojisini projelerde uygulama ve problem çözme düzeyin nedir?`
        : category === "business"
        ? `İş ve yazılım geliştirme süreçlerinde ${displayName} yaklaşımını ve standartlarını uygulama seviyen nedir?`
        : `Teknik dokümantasyon takibi ve ekip içi iletişimde ${displayName} yetkinliğin hangi düzeyde?`;

    return {
      slug,
      nameTr: displayName,
      axisLabelTr: axisLabel,
      category,
      marketCategory: r.kategori,
      marketCategoryLabel: r.kategori_adi,
      mentionCount: r.ilan_sayisi,
      totalPostings: r.toplam_ilan,
      demandPct: r.yuzde,
      priorityLabel: r.oncelik,
      displayBadge: r.gosterim,
      requiredLevel,
      importance,
      isRadarAxis,
      axisOrder,
      isCoreCheckup: true,
      promptTr,
    };
  });

  return {
    skills,
    educationStats,
    totalPostings,
    scopeWarning,
  };
}

/**
 * Kullanıcının paylaştığı gerçek Yazılım Geliştirici / Mühendis sektör analizi CSV verisi
 * (Admin panelinde "Örnek Sektör Verisini Yükle" butonu ile tek tıkla kullanılabilir).
 */
export const SAMPLE_DEVELOPER_MARKET_CSV = `piyasa,rol,kategori,kategori_adi,yetkinlik,ilan_sayisi,toplam_ilan,yuzde,yuzde_alt,yuzde_ust,oncelik,gosterim,kapsam_uyarisi
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,SQL,25,43,58.1,43.3,71.6,Çok istenen,%58 · 43 ilanın 25'inde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,Git,22,43,51.2,36.8,65.4,Çok istenen,%51 · 43 ilanın 22'sinde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,.NET,20,43,46.5,32.5,61.1,Sık istenen,%47 · 43 ilanın 20'sinde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,C#,17,43,39.5,26.4,54.4,Sık istenen,%40 · 43 ilanın 17'sinde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,Java,14,43,32.6,20.5,47.5,Sık istenen,%33 · 43 ilanın 14'ünde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,JavaScript,11,43,25.6,14.9,40.2,Sık istenen,%26 · 43 ilanın 11'inde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,CSS,10,43,23.3,13.2,37.7,Fark yaratan,%23 · 43 ilanın 10'unda,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,HTML,9,43,20.9,11.4,35.2,Fark yaratan,%21 · 43 ilanın 9'unda,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,Python,9,43,20.9,11.4,35.2,Fark yaratan,%21 · 43 ilanın 9'unda,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,ASP.NET,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,TypeScript,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,temel_teknik_araclar,Temel teknik araçlar ve diller,Linux,6,43,14.0,6.6,27.3,Fark yaratan,%14 · 43 ilanın 6'sında,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",MSSQL,15,43,34.9,22.4,49.8,Sık istenen,%35 · 43 ilanın 15'inde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",Docker,13,43,30.2,18.6,45.1,Sık istenen,%30 · 43 ilanın 13'ünde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",PostgreSQL,11,43,25.6,14.9,40.2,Sık istenen,%26 · 43 ilanın 11'inde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",RabbitMQ,9,43,20.9,11.4,35.2,Fark yaratan,%21 · 43 ilanın 9'unda,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",React,8,43,18.6,9.7,32.6,Fark yaratan,%19 · 43 ilanın 8'inde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",Redis,8,43,18.6,9.7,32.6,Fark yaratan,%19 · 43 ilanın 8'inde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",Kafka,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,is_odakli_araclar,"Framework, veritabanı ve araçlar",Spring Boot,6,43,14.0,6.6,27.3,Fark yaratan,%14 · 43 ilanın 6'sında,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,REST API,19,43,44.2,30.4,58.9,Sık istenen,%44 · 43 ilanın 19'unda,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,OOP,14,43,32.6,20.5,47.5,Sık istenen,%33 · 43 ilanın 14'ünde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,CI/CD,13,43,30.2,18.6,45.1,Sık istenen,%30 · 43 ilanın 13'ünde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Agile,12,43,27.9,16.7,42.7,Sık istenen,%28 · 43 ilanın 12'sinde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Mikroservis,12,43,27.9,16.7,42.7,Sık istenen,%28 · 43 ilanın 12'sinde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Scrum,9,43,20.9,11.4,35.2,Fark yaratan,%21 · 43 ilanın 9'unda,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Unit Test,9,43,20.9,11.4,35.2,Fark yaratan,%21 · 43 ilanın 9'unda,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Algoritma,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Design Patterns,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,DevOps,7,43,16.3,8.1,30.0,Fark yaratan,%16 · 43 ilanın 7'sinde,
Yerel,Geliştirici,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Code Review,6,43,14.0,6.6,27.3,Fark yaratan,%14 · 43 ilanın 6'sında,
Yerel,Geliştirici,yabanci_dil,Yabancı dil,İngilizce,24,43,55.8,41.1,69.6,Çok istenen,%56 · 43 ilanın 24'ünde,
Yerel,Geliştirici,egitim_ve_bolum,Eğitim ve bölüm,Bilgisayar Mühendisliği,25,43,58.1,43.3,71.6,Çok istenen,%58 · 43 ilanın 25'inde,
Yerel,Geliştirici,egitim_ve_bolum,Eğitim ve bölüm,Yazılım Mühendisliği,22,43,51.2,36.8,65.4,Çok istenen,%51 · 43 ilanın 22'sinde,
Yerel,Geliştirici,egitim_ve_bolum,Eğitim ve bölüm,Yönetim Bilişim Sistemleri,3,43,7.0,2.4,18.6,Az aranan,%7 · 43 ilanın 3'ünde,
Küresel,Mühendis,temel_teknik_araclar,Temel teknik araçlar ve diller,Python,15,34,44.1,28.9,60.5,Sık istenen,%44 · 34 ilanın 15'inde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,temel_teknik_araclar,Temel teknik araçlar ve diller,TypeScript,15,34,44.1,28.9,60.5,Sık istenen,%44 · 34 ilanın 15'inde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,temel_teknik_araclar,Temel teknik araçlar ve diller,Git,12,34,35.3,21.5,52.1,Sık istenen,%35 · 34 ilanın 12'sinde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,is_odakli_araclar,"Framework, veritabanı ve araçlar",AWS,11,34,32.4,19.1,49.2,Sık istenen,%32 · 34 ilanın 11'inde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,is_odakli_araclar,"Framework, veritabanı ve araçlar",Kubernetes,10,34,29.4,16.8,46.2,Sık istenen,%29 · 34 ilanın 10'unda,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,is_odakli_araclar,"Framework, veritabanı ve araçlar",React,9,34,26.5,14.6,43.1,Sık istenen,%26 · 34 ilanın 9'unda,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,is_odakli_araclar,"Framework, veritabanı ve araçlar",PostgreSQL,8,34,23.5,12.4,40.0,Fark yaratan,%24 · 34 ilanın 8'inde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Küresel,Mühendis,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,Code Review,8,34,23.5,12.4,40.0,Fark yaratan,%24 · 34 ilanın 8'inde,Bu kapsam yalnızca 34 ilana dayanıyor; yüzdeler yaklaşık değerlerdir.
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,Git,45,119,37.8,29.6,46.8,Sık istenen,%38 · 119 ilanın 45'inde,
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,Python,39,119,32.8,25.0,41.6,Sık istenen,%33 · 119 ilanın 39'unda,
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,SQL,37,119,31.1,23.5,39.9,Sık istenen,%31 · 119 ilanın 37'sinde,
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,Java,34,119,28.6,21.2,37.3,Sık istenen,%29 · 119 ilanın 34'ünde,
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,TypeScript,34,119,28.6,21.2,37.3,Sık istenen,%29 · 119 ilanın 34'ünde,
Hepsi,Hepsi,temel_teknik_araclar,Temel teknik araçlar ve diller,C#,30,119,25.2,18.3,33.7,Sık istenen,%25 · 119 ilanın 30'unda,
Hepsi,Hepsi,is_odakli_araclar,"Framework, veritabanı ve araçlar",PostgreSQL,30,119,25.2,18.3,33.7,Sık istenen,%25 · 119 ilanın 30'unda,
Hepsi,Hepsi,is_odakli_araclar,"Framework, veritabanı ve araçlar",Docker,28,119,23.5,16.8,31.9,Fark yaratan,%24 · 119 ilanın 28'inde,
Hepsi,Hepsi,is_odakli_araclar,"Framework, veritabanı ve araçlar",React,28,119,23.5,16.8,31.9,Fark yaratan,%24 · 119 ilanın 28'inde,
Hepsi,Hepsi,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,OOP,31,119,26.1,19.0,34.6,Sık istenen,%26 · 119 ilanın 31'inde,
Hepsi,Hepsi,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,CI/CD,30,119,25.2,18.3,33.7,Sık istenen,%25 · 119 ilanın 30'unda,
Hepsi,Hepsi,metodoloji_ve_kavramlar,Metodoloji ve kavramlar,REST API,30,119,25.2,18.3,33.7,Sık istenen,%25 · 119 ilanın 30'unda,
Hepsi,Hepsi,yabanci_dil,Yabancı dil,İngilizce,51,119,42.9,34.3,51.8,Sık istenen,%43 · 119 ilanın 51'inde,`;

