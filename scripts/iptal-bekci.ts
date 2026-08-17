import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

/**
 * ============================================================================
 *  İPTAL SÜZGECİ BEKÇİSİ — "47 SORGU" BEKÇİSİ
 * ----------------------------------------------------------------------------
 *  ⚠ MİMAR ŞARTI 17.08.2026: "paket bunsuz teslim edilemez."
 *
 *  İptal edilen satış ciroya, NET'e ve hakediş beklentisine GİRMEZ. Bu kural
 *  `lib/liste-suzgeci.ts` içinde TEK YERDE tanımlı. Ama kuralın tek yerde
 *  olması yetmez — onu ÇAĞIRMAYAN bir sorgu yazıldığı gün o ekran iptalli
 *  satışları sessizce ciroya sayar ve fark aylarca görülmez.
 *
 *  Bu betik `prisma.sale` / `prisma.saleItem` sorgularını tarar ve her birinin
 *  süzgeçten geçtiğini doğrular. Geçmeyen ve BEYAN EDİLMEMİŞ her sorgu
 *  kırmızıdır.
 *
 *  ── NEDEN BEYAN LİSTESİ VAR ─────────────────────────────────────────────
 *  Bazı sorgular süzgeç İSTEMEZ: iptal eyleminin kendisi iptalli satışı
 *  bulmak zorundadır, detay ekranı iptal edilmiş satışı göstermelidir.
 *  Bunlar `ISTISNALAR`da GEREKÇESİYLE yazılır. Beyan edilmemiş bir istisna
 *  hata sayılır — aynı ilke `yetki-dogrula.ts`teki `ACTION_ISTISNALARI`.
 * ============================================================================
 */

/**
 * Süzgeçsiz olmasına İZİN VERİLEN sorgular — dosya:sorgu → GEREKÇE.
 * Gerekçe zorunlu: "istisna" demek yetmez, NİÇİN olduğu yazılır.
 */
const ISTISNALAR = new Map<string, string>([
  [
    "src/lib/satis-iptali-veri.ts:sale.findUnique",
    "iptal eyleminin kendisi: iptal edilecek satışı bulur ve zaten iptalli mi diye bakar — süzgeç koysaydı 'zaten iptal' kontrolü hiç çalışmazdı",
  ],
  [
    "src/app/satislar/[id]/page.tsx:sale.findUnique",
    "TEK satışın detayı: kullanıcı iptal edilmiş satışın kaydını görebilmeli, kayıt silinmiyor yalnız listeden gizleniyor",
  ],
  [
    "src/lib/yedek.ts:sale.findMany",
    "YEDEK: veritabanının tamamını dışa aktarır, süzgeç uygulasaydı yedek eksik olurdu — geri yüklendiğinde iptalli satışlar kaybolurdu",
  ],
  [
    "src/lib/yedek.ts:saleItem.findMany",
    "YEDEK: yukarıdaki gerekçenin aynısı",
  ],
]);

type Bulgu = { dosya: string; satir: number; cagri: string };

/** Dengeli parantez sayarak sorgunun gövdesini çıkarır. */
function govdeyiAl(metin: string, baslangic: number): string {
  const acilis = metin.indexOf("(", baslangic);
  if (acilis === -1) return "";
  let derinlik = 0;
  for (let i = acilis; i < metin.length; i++) {
    const c = metin[i];
    if (c === "(") derinlik++;
    else if (c === ")") {
      derinlik--;
      if (derinlik === 0) return metin.slice(acilis, i + 1);
    }
  }
  return metin.slice(acilis);
}

/**
 * YORUMLARI SOYAR — ama satır sayısını BOZMADAN (aynı sayıda satır kalır),
 * yoksa raporlanan satır numarası kayar.
 *
 * ⚠ Gerekliydi: bekçi ilk koşuşunda `uyari/topla.ts` içindeki bir YORUM
 * satırını ("çan kendi prisma.sale.count sorgusunu yazsaydı...") gerçek
 * sorgu sandı. Yorumdaki örnek kodu ihlal saymak, bekçiye olan güveni
 * ilk günden bitirirdi.
 */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "))
    .split("\n")
    .map((s) => (s.trimStart().startsWith("//") ? " ".repeat(s.length) : s))
    .join("\n");
}

function satirNo(metin: string, indeks: number): number {
  return metin.slice(0, indeks).split("\n").length;
}

/**
 * ÜRETİLMİŞ PRISMA KODU TARANMAZ: `src/generated` altındaki dosyalar
 * `prisma generate` çıktısıdır, elle yazılmaz ve içindeki `sale.findMany`
 * geçişleri tip tanımlarıdır — gerçek sorgu değil.
 */
const DOSYALAR = globSync("src/**/*.{ts,tsx}", { cwd: process.cwd() }).filter(
  (d) => !d.replace(/\\/g, "/").startsWith("src/generated/"),
);

const suzgecli: Bulgu[] = [];
const suzgecsiz: Bulgu[] = [];
const beyanli: Bulgu[] = [];
const kullanilmayanIstisna = new Set(ISTISNALAR.keys());

for (const dosya of DOSYALAR) {
  const yol = dosya.replace(/\\/g, "/");
  let metin: string;
  try {
    metin = yorumsuz(readFileSync(dosya, "utf8"));
  } catch {
    continue;
  }

  /**
   * `prisma.sale.` VE `tx.sale.` — işlem içindeki sorgular da sayılır.
   * `saleItem` ayrı yakalanır: kalem seviyesindeki ciro/kâr toplamları da
   * iptalli satışı dışarıda bırakmalı.
   */
  /**
   * KAPSAM: LİSTE ve TOPLAM sorguları.
   *
   * `findUnique` BİLEREK DIŞARIDA: kimlikle TEK kayıt getirir — kullanıcı o
   * satışı zaten açmış ya da eylem doğrudan ona yapılıyor. İptal edilmiş bir
   * satışın detayı GÖRÜNEBİLMELİ (kayıt silinmiyor, listeden gizleniyor).
   * Ciroyu, NET'i ve hakediş beklentisini şişiren şey liste/toplam
   * sorgularıdır; risk oradadır ve bekçi oraya bakar.
   */
  const desen = /\b(?:prisma|tx|db)\.(sale|saleItem)\.(findMany|findFirst|count|aggregate|groupBy)\b/g;

  for (const m of metin.matchAll(desen)) {
    const cagri = `${m[1]}.${m[2]}`;
    const anahtar = `${yol}:${cagri}`;
    const bulgu: Bulgu = { dosya: yol, satir: satirNo(metin, m.index), cagri };

    if (ISTISNALAR.has(anahtar)) {
      kullanilmayanIstisna.delete(anahtar);
      beyanli.push(bulgu);
      continue;
    }

    const govde = govdeyiAl(metin, m.index);

    /**
     * SÜZGEÇTEN GEÇTİ SAYILMA ÖLÇÜTÜ — üç yoldan biri:
     *  1. `satisKosulu`nun ürettiği koşulu kullanıyor (`where: kosul`)
     *  2. Açıkça `iptalTarihi` yazıyor
     *  3. `iptalliSayilirMi` ile kod tarafında süzüyor
     */
    const gecti =
      /\bkosul\b/.test(govde) ||
      /iptalTarihi/.test(govde) ||
      /iptalliSayilirMi/.test(govde) ||
      // saleItem sorguları satış üzerinden süzülebilir: `sale: { iptalTarihi: null }`
      /sale:\s*\{[^}]*iptal/.test(govde);

    (gecti ? suzgecli : suzgecsiz).push(bulgu);
  }
}

console.log("\nİPTAL SÜZGECİ BEKÇİSİ\n");
console.log(
  `Taranan: ${DOSYALAR.length} dosya · bulunan sorgu: ${
    suzgecli.length + suzgecsiz.length + beyanli.length
  }`,
);
console.log(`  ✓  süzgeçli   ${suzgecli.length}`);
console.log(`  ✓  beyanlı    ${beyanli.length} (gerekçesi yazılı istisna)`);
console.log(`  ${suzgecsiz.length === 0 ? "✓" : "✗"}  süzgeçsiz  ${suzgecsiz.length}`);

if (suzgecsiz.length > 0) {
  console.log("\nSÜZGEÇSİZ SORGULAR — iptalli satış ciroya sızabilir:");
  for (const b of suzgecsiz) {
    console.log(`  ✗  ${b.dosya}:${b.satir} → ${b.cagri}`);
  }
  console.log("\n  ÜÇ YOLDAN BİRİ:");
  console.log("    1) satisKosulu(p) kullanın           → where: kosul");
  console.log("    2) açıkça süzün                      → iptalTarihi: null");
  console.log("    3) süzgeç GEREKMİYORSA beyan edin    → scripts/iptal-bekci.ts");
  console.log("       (gerekçesiz istisna kabul EDİLMEZ)");
}

/**
 * ÖLÜ İSTİSNA DA HATADIR: kaldırılmış bir sorgunun beyanı listede kalırsa
 * liste zamanla "eskiden şöyleydi" arşivine döner ve kimse temizlemez.
 */
if (kullanilmayanIstisna.size > 0) {
  console.log("\nÖLÜ İSTİSNA — beyan var ama sorgu YOK:");
  for (const a of kullanilmayanIstisna) console.log(`  ✗  ${a}`);
  console.log("     Sorgu kaldırıldıysa beyanı da kaldırın.");
}

const hataVar = suzgecsiz.length > 0 || kullanilmayanIstisna.size > 0;
console.log("");
console.log("=".repeat(70));
console.log(hataVar ? "BEKÇİ KIRMIZI" : "BEKÇİ TEMİZ — iptal süzgeci her sorguda");
console.log("");
if (hataVar) process.exitCode = 1;
