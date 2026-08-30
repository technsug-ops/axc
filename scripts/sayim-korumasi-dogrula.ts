import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  israrGecerliMi,
  SAYIM_ISRAR_SEBEPLERI,
  sayimKorumasi,
} from "../src/lib/sayim-korumasi";

/**
 * ============================================================================
 *  SAYIM KORUMASI — DEĞER TESTİ + DESEN YASAĞI (bekçi)
 * ----------------------------------------------------------------------------
 *      npm run sayim-korumasi:dogrula
 *
 *  ⭐ İKİ KATMAN, İKİSİ AYRI:
 *   ① SAF GÖVDE **ÇAĞRILIR** ve değeri sınanır — desen taranmaz
 *     (anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz").
 *   ② Gövdeyi ÇAĞIRMASI gereken yollar DESENLE sınanır: `stockMovement.create`
 *     çağıran ve `occurredAt`i sabit OLMAYAN her dosya `sayimKorumasi(`
 *     kapısından geçmeli; geçmiyorsa yanında `SAYIM KORUMASI YOK: <gerekçe>`
 *     beyanı olmalı. **Liste değil, desen.**
 * ============================================================================
 */

let hata = 0;
let kontrol = 0;
const bulgu: string[] = [];
function yakin(ad: string, olan: unknown, beklenen: unknown) {
  kontrol++;
  if (JSON.stringify(olan) === JSON.stringify(beklenen)) return;
  hata++;
  bulgu.push("  ⛔ " + ad + "\n     olan " + JSON.stringify(olan) +
    "\n     beklenen " + JSON.stringify(beklenen));
}
function dogru(ad: string, kosul: boolean) {
  kontrol++;
  if (kosul) return;
  hata++;
  bulgu.push("  ⛔ " + ad);
}

const S = (g: string) => new Date(g + "T00:00:00.000Z");

// ═══ ① SAF GÖVDE — DEĞERLE ════════════════════════════════════════════════
dogru("sayım damgası YOKSA serbest",
  sayimKorumasi({ sonSayimIsTarihi: null, hareketIsTarihi: S("2020-01-01"), adet: -5 })
    .sonuc === "SERBEST");
dogru("hareket sayımdan SONRA ise serbest",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-30"), adet: -5 })
    .sonuc === "SERBEST");
/**
 * ⚠ AYNI GÜN SERBEST — VE BU BİLEREK. Sayım günü yapılan bir satış sayımdan
 * önce de sonra da olabilir; bilemeyiz. Kilitlersek sayım gününün TAMAMI
 * kapanırdı. (FIFO `sinir` kararının TERSİ yönde kardeşi.)
 */
dogru("AYNI GÜN serbest (sayım gününün tamamı kilitlenmez)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-29"), adet: -5 })
    .sonuc === "SERBEST");
dogru("adet 0 ise serbest (stok değişmiyor)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-01-01"), adet: 0 })
    .sonuc === "SERBEST");

const dus = sayimKorumasi({
  sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-07-01"), adet: -2 });
const art = sayimKorumasi({
  sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-07-01"), adet: +2 });

dogru("geriye dönük DÜŞÜREN → DURAKSA", dus.sonuc === "DURAKSA");
dogru("geriye dönük ARTIRAN → DURAKSA", art.sonuc === "DURAKSA");
/**
 * ⭐ YÖN AYRIMI SERTLİKTE DEĞİL, SEBEPTE. "Artıran hafif olsun mu?" diye
 * soruldu; cevap HAYIR ve gerekçe fizikseldir: mal sayım sırasında raftaysa
 * SAYAN KİŞİ ONU ZATEN SAYDI, geriye dönük alım aynı malı ikinci kez ekler.
 * ⚠ Bu ölçüt, "artıran serbest" mutasyonunu kırmızıya çevirir.
 */
yakin("DÜŞÜREN'in yönü ve sebebi",
  [dus.sonuc === "DURAKSA" ? dus.yon : null, dus.sonuc === "DURAKSA" ? dus.sebep : null],
  ["DUSUREN", "sayimSonrasiDusuren"]);
yakin("ARTIRAN'ın yönü ve sebebi",
  [art.sonuc === "DURAKSA" ? art.yon : null, art.sonuc === "DURAKSA" ? art.sebep : null],
  ["ARTIRAN", "sayimSonrasiArtiran"]);
dogru("iki yön de AYNI sertlikte (ikisi de DURAKSA)",
  dus.sonuc === art.sonuc);
dogru("ama sebepleri FARKLI (kullanıcıya farklı iş düşüyor)",
  (dus.sonuc === "DURAKSA" ? dus.sebep : "") !==
    (art.sonuc === "DURAKSA" ? art.sebep : ""));
/**
 * ═══ ISRAR — KAPALI SEBEP LİSTESİ (saf gövde, DEĞER testi) ═══════════════
 *
 * ⭐ ANAYASA: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_
 * Dört şart: eşik yerinde · onay HER SEFERİNDE · sebep KAPALI KÜMEDEN ·
 * istisna İZ BIRAKIR. İlk üçü burada DEĞERLE sınanıyor; dördüncüsü
 * (iz) yazma yolunun ölçütü.
 */
yakin("onaysız ısrar geçersiz — eksik: onay",
  israrGecerliMi({ onaylandi: false, sebep: "GEC_GIRILEN_ALIM", aciklama: "" }),
  { gecerli: false, eksik: "onay" });
yakin("onay VAR ama sebep YOK — geçersiz",
  israrGecerliMi({ onaylandi: true, sebep: null, aciklama: "" }),
  { gecerli: false, eksik: "sebep" });
/** ⚠ `DIGER` kapalı listenin kaçak deliği — açıklama ZORUNLU. */
yakin("DIGER seçildi ama açıklama boş — geçersiz",
  israrGecerliMi({ onaylandi: true, sebep: "DIGER", aciklama: "   " }),
  { gecerli: false, eksik: "aciklama" });
yakin("DIGER + açıklama — geçerli",
  israrGecerliMi({ onaylandi: true, sebep: "DIGER", aciklama: "sayim fisi kayip" }),
  { gecerli: true });
yakin("kapalı listeden sebep + onay — geçerli",
  israrGecerliMi({ onaylandi: true, sebep: "SAYIM_HATALI", aciklama: "" }),
  { gecerli: true });
/**
 * ⚠ SEBEP LİSTESİ KAPALI KALMALI — yeni sebep eklenirse sözlük ve ekran da
 * genişlemek zorunda. Sayı sabitlenerek "sessizce büyüme" engelleniyor.
 * _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_
 */
yakin("kapalı listede 4 sebep var", SAYIM_ISRAR_SEBEPLERI.length, 4);

/** ⚠ Bir gün öncesi bile duraksatır — eşik uydurulmadı. */
dogru("sayımdan BİR GÜN öncesi de duraksatır (tolerans yok)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-28"), adet: -1 })
    .sonuc === "DURAKSA");

// ═══ ② DESEN YASAĞI ═══════════════════════════════════════════════════════
function dosyalar(dizin: string): string[] {
  const c: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) c.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(ad)) c.push(yol);
  }
  return c;
}
function yorumsuz(m: string): string {
  return m
    .replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (x) => x.replace(/[^\n]/g, " "));
}

const acik: string[] = [];
for (const yol of dosyalar("src")) {
  const d = yol.replace(/\\/g, "/");
  if (d.includes("/generated/")) continue;
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  if (!/\bstockMovement\.create(Many)?\s*\(/.test(kod)) continue;
  /** ⚠ `occurredAt` SABİT Mİ — yalnız `new Date()` yazan yol geriye dönemez. */
  const tarihler = kod.match(/occurredAt:\s*[^,\n}]+/g) ?? [];
  const hepsiSimdi = tarihler.length > 0 &&
    tarihler.every((t) => /new Date\(\)/.test(t));
  kontrol++;
  if (hepsiSimdi) continue;
  /**
   * ═══ EKRAN YOLU SÖZLEŞMESİ — ÜÇ PARÇA BİRDEN ════════════════════════════
   *
   * Bir ekran yolu kapıyı çağırıyorsa YALNIZ çağırması yetmez; ısrar
   * akışının üç parçası da olmalı:
   *   ① kapı        `sayimKorumasi(`      — duraksatıyor mu
   *   ② ısrar       `israrGecerliMi(`     — kullanıcı ısrar etti mi, SUNUCUDA
   *   ③ damga       `sayimGecersizlestir(` — istisna geçtiyse sayım geçersiz
   *
   * ⛔ ①'İ ÇAĞIRIP ②'Yİ ATLAMAK EN TEHLİKELİSİ: kapı duraksatır, ekran
   * kilitler — ama sunucu ekrana GÜVENİR. Formu elle gönderen (ya da
   * `disabled`ı kaldıran) biri kapıyı tamamen atlar ve hiçbir iz kalmaz.
   *
   * ⛔ ③'Ü ATLAMAK SESSİZ: istisna geçer, `AuditLog`a yazılır ama sayım
   * "hâlâ geçerli" görünür ve kimse yeniden saymaz.
   */
  const kapiVar = /\bsayimKorumasi\s*\(/.test(kod);
  const israrVar = /\bisrarGecerliMi\s*\(/.test(kod);
  const damgaVar = /\bsayimGecersizlestir\s*\(/.test(kod);
  const beyan = /SAYIM KORUMASI YOK:\s*\S/.test(ham);
  if (kapiVar) {
    if (!israrVar) {
      hata++;
      acik.push("  ⛔ " + d +
        "  →  kapı ÇAĞRILIYOR ama `israrGecerliMi(` YOK — sunucu ekrana güveniyor");
      continue;
    }
    if (!damgaVar) {
      hata++;
      acik.push("  ⛔ " + d +
        "  →  ısrar var ama `sayimGecersizlestir(` YOK — geçersizleşen sayım görünmez");
      continue;
    }
    continue;
  }
  /**
   * ⛔ KAPIYI İÇERİ ALIP ÇAĞIRMAMAK — "bağlı görünen" koruma.
   * _(29.08'de betiklerde tam bu yaşandı; ekran yolunda da yasak.)_
   */
  if (/from\s+["'][^"']*sayim-(korumasi|damgasi)["']/.test(kod)) {
    hata++;
    acik.push("  ⛔ " + d + "  →  kapı İÇERİ ALINMIŞ ama HİÇ ÇAĞRILMAMIŞ (vekil koruma)");
    continue;
  }
  if (beyan) continue;
  hata++;
  acik.push("  ⛔ " + d + "  →  `occurredAt` sabit değil, `sayimKorumasi(` yok, beyan yok");
}


/**
 * ═══ ② `scripts/` KAPSAMI — SINIF BEYANLA BELİRLENİR ═════════════════════
 *
 * ⛔ 29.08.2026: arızayı yapan aktarım `src/` içinde DEĞİL, `scripts/`
 * altındaydı ve bekçi orayı hiç taramıyordu — koruma, arızanın geldiği
 * yeri kapsamıyordu.
 *
 * ⚠ VE SINIFI DESENLE TAHMİN ETME DENEMESİ ÇÖKTÜ. `PARTI =` · `KODLAR =`
 * · `--geri` işaretleriyle "tek seferlik onarım" ayrılmaya çalışıldı;
 * `canli-alis-ice-aktar` ve `canli-satis-ice-aktar` **muaf sayıldı** —
 * oysa arızayı yapanlar tam onlardı. İşaretler iki sınıfta da geçiyor.
 *
 * ⭐ O YÜZDEN SINIF BEYAN EDİLİR, TAHMİN EDİLMEZ:
 *     BETIK SINIFI: SUREKLI                     → kapıdan geçmeli
 *     BETIK SINIFI: TEK_SEFERLIK — <gerekçe>    → muaf
 * Beyanı OLMAYAN betik KIRMIZI.
 *
 * ⚠ MUTASYON AYRIMI (kullanıcı kararı 29.08):
 *  · beyanı `SUREKLI` → `TEK_SEFERLIK` çeviren senaryo YEŞİL kalır —
 *    o bir İNSAN KARARIDIR ve gerekçesiyle birlikte koda yazılır;
 *    bekçinin işi kararı denetlemek değil, KARARSIZLIĞI yakalamak.
 *  · beyanı SİLEN senaryo KIRMIZI — sınıf yeniden tahmine düşer.
 */
const SINIF_DESENI = /BETIK SINIFI:\s*(SUREKLI|TEK_SEFERLIK)/;
for (const yol of dosyalar("scripts")) {
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  if (!/\bstockMovement\.create(Many)?\s*\(/.test(kod)) continue;
  const tarihler = kod.match(/occurredAt:\s*[^,\n}]+/g) ?? [];
  if (tarihler.length > 0 && tarihler.every((t) => /new Date\(\)/.test(t))) continue;
  kontrol++;
  const m = SINIF_DESENI.exec(ham);
  if (m === null) {
    hata++;
    acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
      "  →  BETIK SINIFI beyanı YOK (SUREKLI mi TEK_SEFERLIK mi?)");
    continue;
  }
  if (m[1] === "TEK_SEFERLIK") {
    /** ⚠ Muafiyet GEREKÇESİZ verilemez — beyan tek başına yetmez. */
    if (!/BETIK SINIFI:\s*TEK_SEFERLIK\s*—\s*\S/.test(ham)) {
      hata++;
      acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
        "  →  TEK_SEFERLIK beyanı GEREKÇESİZ");
    }
    continue;
  }
  /**
   * SUREKLI ise kapıdan geçmeli ya da beyanlı istisna taşımalı.
   *
   * ⭐ ÖLÇÜT GENİŞLETİLDİ 29.08.2026 — KOD DEĞİL, ÖLÇÜT ESKİDİ.
   * Kapı iki yoldan çağrılabiliyor: saf gövde doğrudan (`sayimKorumasi`)
   * ya da betikler için yön ayrımını yapan sarmalayıcı
   * (`betikSayimKarari`, `lib/sayim-damgasi.ts`). İkincisi birincisini
   * ZATEN çağırıyor; ölçüt ada değil KAPIDAN GEÇMEYE bakar.
   */
  const kapiCagrisi = /\b(sayimKorumasi|betikSayimKarari)\s*\(/.test(kod);
  /**
   * ⛔ EN KRİTİK ÖLÇÜT — "BAĞLI GÖRÜNÜP ÇAĞRILMAYAN" KAPI.
   * _(Kullanıcı kararı 29.08.2026: "bugünkü durumun kendisi bu.")_
   *
   * Bir dosya kapıyı İÇERİ ALIP (import) hiç ÇAĞIRMAZSA, kaynağa bakan
   * biri korumanın bağlı olduğunu sanır. Bu, deponun en sık hatasının
   * (dize davranışın vekilidir) tam kendisi ve bugün canlıda yaşandı:
   * gövde vardı, bekçi yeşildi, 35 ölçüt geçiyordu, **hiçbir yol
   * çağırmıyordu.**
   */
  /** ⚠ Statik VE dinamik ithal — betikler `await import(...)` kullanıyor. */
  const kapiIthali =
    /from\s+["'][^"']*sayim-(korumasi|damgasi)["']/.test(kod) ||
    /import\s*\(\s*["'][^"']*sayim-(korumasi|damgasi)["']\s*\)/.test(kod);
  if (kapiIthali && !kapiCagrisi) {
    hata++;
    acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
      "  →  kapı İÇERİ ALINMIŞ ama HİÇ ÇAĞRILMAMIŞ (vekil koruma)");
    continue;
  }
  /**
   * ⛔ VE ÇAĞRI TEK BAŞINA YETMEZ — SONUCU KULLANILMALI.
   * `betikSayimKarari(...)` çağrılıp dönüşü hiç okunmazsa kapı yine
   * çalışmaz; desen dosyada durur, davranış yoktur.
   */
  /**
   * ⛔ VE ÇAĞRI TEK BAŞINA YETMEZ — KORUYAN DAL BULUNMALI.
   *
   * ⚠ ÖLÇÜT `.islem ===` DEĞİL, `"ATLA"` DALI. Mutasyonla ölçüldü
   * (29.08.2026): `islem === "ATLA"` dalını öldüren senaryo YEŞİL kaldı,
   * çünkü aynı dosyadaki `islem === "YAZ_VE_DAMGALA"` deseni ayakta
   * tutuyordu. Koruyan dal ATLA'dır; öteki dal yazmaya izin verir.
   * _(Anayasa: "aynı desen birden çok yerde geçerse, birini bozan
   * mutasyon ötekini bulur".)_
   */
  if (kapiCagrisi && !/islem\s*===\s*"ATLA"/.test(kod)) {
    hata++;
    acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
      "  →  kapı ÇAĞRILMIŞ ama KORUYAN DAL (`islem === \"ATLA\"`) yok");
    continue;
  }
  /**
   * ⛔ MUAFİYET BEYANI, KAPI İTHAL EDİLMİŞ DOSYADA GEÇERSİZDİR.
   *
   * ⚠ BU BUGÜN CANLIDA YAŞANDI: iki aktarıcı _"kapı bu yola HENÜZ
   * BAĞLANMADI"_ diye BORÇ KAYDI taşıyordu. Kapı bağlandı, beyan
   * kaldırılmadı — ve beyan, artık bağlı olan kapıyı bekçinin gözünden
   * SİLDİ. Bayat bir borç kaydı, kalıcı bir muafiyete dönüşüyor.
   */
  if (/SAYIM KORUMASI YOK:\s*\S/.test(ham) && kapiIthali) {
    hata++;
    acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
      "  →  hem `SAYIM KORUMASI YOK` beyanı hem kapı ithali var — çelişki");
    continue;
  }
  /** ⚠ Çelişki elendikten SONRA: çalışan kapı geçer. */
  if (kapiCagrisi) continue;
  if (/SAYIM KORUMASI YOK:\s*\S/.test(ham)) continue;
  hata++;
  acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
    "  →  SUREKLI ama kapı çağrısı yok, beyan yok");
}

/**
 * ═══ ÖLÇÜT ③ — `sayimGecersizAt` YAZICISIZ KALMASIN ═════════════════════
 *
 * ⛔ ANAYASA: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur."
 * Sütun 29.08.2026'da açıldı ve aynı gün **hiçbir kod onu yazmıyordu**;
 * alanı gören biri _"demek ki sayım geçersizliği izleniyor"_ diye okur ve
 * üstüne akıl yürütür. Boş bir alan sessiz değildir, YANLIŞ CEVAP VERİR.
 *
 * ⚠ ÖLÇÜT DOSYA LİSTESİ DEĞİL: "en az bir yazma yolu `sayimGecersizlestir(`
 * çağırıyor mu" diye sorar. Hangi dosyanın çağırdığı zamanla değişebilir.
 */
{
  kontrol++;
  const yazan: string[] = [];
  for (const yol of [...dosyalar("scripts"), ...dosyalar("src")]) {
    const duz = yol.replace(/\\/g, "/");
    /**
     * ⛔ BEKÇİ KENDİ ARAMA DİZESİNİ YAZICI SANMAZ.
     * ⚠ Mutasyonla yakalandı 29.08.2026: damgalama çağrısı silindiğinde
     * ölçüt YEŞİL kaldı, çünkü ölçütün KENDİ regex'i `sayimGecersizlestir(`
     * metnini taşıyor ve dosya kendini "yazan" olarak buluyordu.
     * _(Anayasa vaka listesi: "`prisma.sale.create` — bekçinin kendi arama
     * dizesi yazma sanıldı".)_
     */
    if (duz.endsWith("scripts/sayim-korumasi-dogrula.ts")) continue;
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    /** ⚠ Gövdenin KENDİ tanımı sayılmaz — `export function` satırı. */
    if (/export\s+async\s+function\s+sayimGecersizlestir/.test(kod)) continue;
    if (/\bsayimGecersizlestir\s*\(/.test(kod)) yazan.push(yol.replace(/\\/g, "/"));
  }
  if (yazan.length === 0) {
    hata++;
    acik.push("  ⛔ `sayimGecersizAt` YAZICISIZ — hiçbir yol " +
      "`sayimGecersizlestir(` çağırmıyor; şema tutmadığı bir söz veriyor");
  }
}

console.log("");
console.log("SAYIM KORUMASI — DEĞER TESTİ + DESEN YASAĞI");
console.log("  ölçüt ①: saf gövde ÇAĞRILIR, değeri sınanır");
console.log("  ölçüt ②: geriye dönük yazabilen her yol `sayimKorumasi(`");
console.log("           kapısından geçer ya da beyan taşır");
if (hata === 0) {
  console.log("  TÜM KONTROLLER GEÇTİ (" + kontrol + ")");
  process.exit(0);
}
console.log("  ⛔ BAŞARISIZ: " + hata + " / " + kontrol);
for (const b of bulgu) console.log(b);
for (const a of acik) console.log(a);
process.exit(1);
