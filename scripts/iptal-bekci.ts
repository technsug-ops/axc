import { readFileSync, readdirSync } from "node:fs";

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
    "src/lib/yedek.ts:sale.findMany",
    "YEDEK: veritabanının TAMAMINI dışa aktarır. Süzgeç uygulasaydı yedek eksik olurdu ve geri yüklendiğinde iptal edilmiş satışlar KAYBOLURDU — iptal kaydı silinmiyor, korunuyor.",
  ],
  /**
   * ═════════════════════════════════════════════════════════════════════
   *  SATIŞ/ALIM TOPLAM GÖVDELERİ (27.08.2026) — SÜZGEÇ VAR AMA BEKÇİ
   *  ONU BURADAN GÖREMİYOR, VE BU SEFER BEYAN DOĞRU CEVAP.
   * ---------------------------------------------------------------------
   *  Bu iki modülün BÜTÜN KONUSU iptal ayrımı: `iptalsiz()` ve
   *  `yalnizIptalli()` kümeyi ikiye böler, sonra her sorgu o kümeyi alır.
   *  Süzgeç sorgunun YANINDA değil, bir satır YUKARIDA — bekçinin
   *  ölçtüğü pencerenin dışında.
   *
   *  ⛔ VE SÜZGEÇ ÖLÇÜLÜYOR, BEYANLA GEÇİLMİYOR:
   *  `sayfalama-toplami:dogrula` bu gövdelerin iptal koşulunu `AND` ile
   *  eklediğini VE spread kullanmadığını ölçüyor — spread kullanıcının
   *  kendi `?iptal=1` süzgecini sessizce ezerdi (17.08.2026 vakası).
   *
   *  ⚠ Alternatif "süzgeci her sorgunun içine kopyala" olurdu: aynı koşul
   *  altı yerde tekrarlanır ve biri unutulduğunda SESSİZ ayrışır — bugün
   *  tam bu sınıftan bir hata düzeltildi (K60, `shippedAt` altı okuyucu).
   * ═════════════════════════════════════════════════════════════════════
   */
  [
    "src/lib/satis-toplami.ts:sale.count",
    "TOPLAM GÖVDESİ: iptal ayrımı `iptalsiz()`/`yalnizIptalli()` ile bir satır yukarıda kuruluyor; `sayfalama-toplami:dogrula` bunu AND koşulu olarak ölçüyor.",
  ],
  [
    "src/lib/satis-toplami.ts:saleItem.aggregate",
    "TOPLAM GÖVDESİ: aynı gerekçe — küme `sale: giren` / `sale: haric` olarak geçiyor.",
  ],
  [
    "src/lib/satis-toplami.ts:sale.groupBy",
    "TOPLAM GÖVDESİ: NET-2 para birimi kırılımı; küme `giren` (iptalsiz) üzerinden.",
  ],
  [
    "src/lib/satis-toplami.ts:saleItem.findMany",
    "TOPLAM GÖVDESİ: ciro çarpımı `_sum` ile yapılamadığı için kalem okunuyor; küme `sale: kosul` olarak geliyor ve çağıran `giren`/`haric` veriyor.",
  ],
  [
    "src/lib/yedek.ts:saleItem.findMany",
    "YEDEK: yukarıdaki gerekçenin aynısı — kalemler de eksiksiz yedeklenir",
  ],
  [
    "src/lib/satis.ts:saleItem.findMany",
    "SATIŞ YAZILIRKEN kendi kalemlerini okur (transaction içinde, `where: { saleId }`). O anda satış henüz oluşturuluyor; iptalli olması imkânsız. Süzgeç eklemek anlamsız bir koşul olurdu.",
  ],
  [
    "src/lib/urun-hareket.ts:saleItem.count",
    "SÜZÜLMESİ TEHLİKELİ OLURDU. Bu sorgu 'bu ürün hiç hareket görmüş mü' sorusunu cevaplar ve ürün SİLİNEBİLİR Mİ kararını verir. İptal edilmiş bir satış da geçmiş bir harekettir: kalemi durur, ledger'ı durur. Süzseydik iptalli satışı olan ürün 'hiç satılmamış' sayılır ve SİLİNEBİLİR hâle gelirdi — geçmişi olan kayıt silinirdi.",
  ],
  [
    "src/lib/satis-duzenleme-veri.ts:saleItem.findMany",
    "TEK SATIŞIN kalemlerini okur (`where: { saleId }`), komisyon oranlarını `karYenidenYaz`a taşımak için. Liste/toplam değil. İptalli satış zaten düzenlenemez — kural `lib/satis-duzenleme.ts` içindeki IPTALLI engeli, plan hem önizlemede hem yazma anında kuruluyor.",
  ],
  [
    "src/app/satislar/[id]/iade/actions.ts:saleItem.findMany",
    "Doğrulama için KİMLİKLE gelen kalemlerin ürün adlarını okur (`where: { id: { in: [...] } }`). Liste/toplam değil, kullanıcının zaten seçtiği kalemler. Ayrıca iptalli satışa iade zaten engelli (bkz. `lib/iade.ts` içindeki iptal kontrolü).",
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
const DOSYALAR = readdirSync("src", { recursive: true, encoding: "utf8" })
  .map((d) => `src/${d.replace(/\\/g, "/")}`)
  .filter((d) => /\.(ts|tsx)$/.test(d))
  .filter((d) => !d.startsWith("src/generated/"));

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
  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  ÖNEK SORULMAZ — BEYAZ LİSTE YOK
   * -----------------------------------------------------------------------
   *  ⚠ Bekçinin kendi kör noktası (17.08.2026): desen önce `prisma|tx|db`
   *  ile sınırlıydı. `lib/yedek.ts` istemciyi `istemci` adıyla taşıdığı için
   *  o dosyadaki sorgular HİÇ TARANMADI — bekçi "temiz" derken bakmadığı bir
   *  yer vardı.
   *
   *  ÇÖZÜM AD LİSTESİNİ GENİŞLETMEK DEĞİL, LİSTEYİ KALDIRMAKTI. Liste
   *  tutulsaydı hastalık aynen sürerdi: listeye girmeyen her yeni takma ad
   *  sessizce muaf olurdu. Desen artık ÖNEKİ HİÇ SORMUYOR —
   *  `prisma.sale.findMany`, `istemci.sale.findMany`, `veritabani.sale.count`
   *  ve destructuring ile öneki tamamen kaybolmuş `sale.findMany` çağrısı da
   *  aynı şekilde yakalanır.
   *
   *  Ödediği bedel: `sale` adlı ilgisiz bir nesne yanlış yakalanabilir. Bu
   *  kabul edilen bedeldir — yanlış alarm GÖRÜLÜR ve beyanla kapanır, kaçan
   *  sorgu ise GÖRÜNMEZ ve aylarca yanlış ciro üretir.
   * ═══════════════════════════════════════════════════════════════════════
   */
  const desen =
    /(?:\.|\b)(sale|saleItem)\.(findMany|findFirst|count|aggregate|groupBy)\b/g;

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
