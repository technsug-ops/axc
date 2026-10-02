import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kaynakOku } from "./kaynak-oku";
import { aktarilanSiparisMi, satisStokZamaniHesapla } from "../src/lib/stok";

/**
 * ============================================================================
 *  FIFO SINIRI — DESEN YASAĞI (bekçi)
 * ----------------------------------------------------------------------------
 *      npm run fifo-sinir:dogrula
 *
 *  ⛔ 29.08.2026 CANLI ARIZASI: 27.07.2025 tarihli bir satış 13.08.2026
 *  tarihli partiyi tüketti; gerçek stok kilitlendi, yeni sipariş
 *  kaydedilemedi. Kapsam 809 bağ · 181 varyant.
 *
 *  ⭐ ÖLÇÜT DOSYA LİSTESİ DEĞİL, DESEN — anayasa: _"bekçi ölçütü elle
 *  tutulan liste değil, tersten kurulur"_. Liste tutulsaydı yarın açılan
 *  yedinci ekran sessizce yeşil kalırdı.
 *
 *      Sonucu `fifoDagit`e giden bir `acikPartiler`/`acikPartilerToplu`
 *      çağrısı `sinir` GEÇİRMEK ZORUNDA. Geçirmeyen çağrı, yanında
 *      `SINIR YOK: <gerekçe>` beyanı taşımıyorsa KIRMIZI.
 *
 *  ⚠ VE YORUMSUZ KODDA ARANIR: bir yasağı ANLATAN yorum, o yasağı çiğnemiş
 *  sayılmaz.
 * ============================================================================
 */

/**
 * ⭐ KAPSAM `scripts/` DE — kusur ÖLÇÜLDÜ 29.08.2026.
 * Bekçi `src/` ile sınırlıyken `scripts/canli-satis-ice-aktar.ts`
 * `acikPartilerToplu(prisma, ids)` çağırıyordu: SINIRSIZ. O betik `SALE_OUT`
 * YAZAN bir yol ve bu kökün en tehlikeli tüketicisi — geçmiş tarihli bir
 * satış, aylar SONRA alınmış bir partiyi tüketebiliyordu. Bekçi onu hiç
 * görmedi çünkü kapsam dışındaydı.
 * _(Anayasa: "kararın kapsamı, uygulandığı yerle sınırlı sayılmaz" — karar
 * `src/` içinde uygulandı, `scripts/` uygulanmadan kaldı.)_
 */
const KOK = ["src", "scripts"];
/** ⚠ Bekçinin KENDİSİ ölçüt metnini taşır; kendini ölçerse yalancı kırmızı yanar. */
const KENDI = "scripts/fifo-sinir-dogrula.ts";

function dosyalar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

/** ⚠ Yorumlar SİLİNİR — ölçüt koda bakar, anlatıya değil. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

let hata = 0;
let kontrol = 0;
const bulgular: string[] = [];

for (const kok of KOK) {
  for (const yol of dosyalar(kok)) {
    const ham = kaynakOku(yol);
    /** Motorun kendi gövdesi ölçütün dışında — tanımın kendisi burada. */
    if (yol.replace(/\\/g, "/").endsWith("src/lib/stok.ts")) continue;
    /** ⚠ Ölçütün kendi metni ölçülmez — yoksa bekçi kendini kırmızı yakar. */
    if (yol.replace(/\\/g, "/").endsWith(KENDI)) continue;

    const kod = yorumsuz(ham);
    /** ⚠ Bu dosya FIFO DAĞITIMI yapıyor mu — davranışa bağlan, ada değil. */
    const dagitiyor = /\bfifoDagit\s*\(/.test(kod);
    const cagriDeseni = /\b(acikPartiler|acikPartilerToplu)\s*\(/g;

    let m: RegExpExecArray | null;
    while ((m = cagriDeseni.exec(kod)) !== null) {
      /** Çağrının tamamı — parantez dengesiyle, satır sonuyla değil. */
      let derinlik = 0;
      let son = m.index + m[0].length - 1;
      for (let i = son; i < kod.length; i++) {
        if (kod[i] === "(") derinlik++;
        else if (kod[i] === ")") { derinlik--; if (derinlik === 0) { son = i; break; } }
      }
      const cagri = kod.slice(m.index, son + 1);

      /**
       * ⚠ ARGÜMAN SAYISI VİRGÜLLE SAYILMAZ — iç içe çağrı ve dizi
       * literalleri virgül taşır. En dış seviyedeki virgüller sayılır.
       */
      const govde = cagri.slice(cagri.indexOf("(") + 1, -1);
      let d = 0, virgul = 0;
      for (const ch of govde) {
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d--;
        else if (ch === "," && d === 0) virgul++;
      }
      const sinirVar = virgul >= 2;

      if (!dagitiyor) continue;
      kontrol++;

      /**
       * ⭐ SINIR VAR AMA DEĞERİ NE — EN KRİTİK ÖLÇÜT.
       * `sinir = soldAt` (gün BAŞI) makul görünür ve defterin %48,72'sini
       * kilitler: aynı gün alınıp aynı gün satılan mal dışarıda kalır.
       * Bu yüzden sınır `gunSonu(...)` OLMAK ZORUNDA.
       */
      if (sinirVar) {
        /** ⚠ Argüman ayırma DERİNLİKLE — regex ile değil; iç içe çağrı
         *  ve dizi literalleri virgül taşır, regex onları yanlış böler. */
        const parcalar: string[] = [];
        let derin = 0, bas = 0;
        for (let i = 0; i < govde.length; i++) {
          const ch = govde[i];
          if (ch === "(" || ch === "[" || ch === "{") derin++;
          else if (ch === ")" || ch === "]" || ch === "}") derin--;
          else if (ch === "," && derin === 0) {
            parcalar.push(govde.slice(bas, i));
            bas = i + 1;
          }
        }
        parcalar.push(govde.slice(bas));
        const ucuncu = parcalar.slice(2).join(",");
        /**
         * ⭐ K314 — MEVCUT SATIŞIN SINIRI `satisStokZamani`'DAN GELİR.
         * Aktarılan siparişte sınır sisteme düştüğü günün sonudur; gövde
         * `stok.ts`te `gunSonu` ile kurulur ve aşağıda DEĞERLE sınanır.
         * ⚠ KABUL ADA DEĞİL KULLANIMA BAĞLI: `sinir` adlı her değişken
         * geçmez — aynı dosyada o adın `await satisStokZamani(` sonucundan
         * alındığı görülmeli. Yoksa `const sinir = soldAt` (gün BAŞI) kaçardı.
         */
        const arg = ucuncu.trim();
        const nokta = /^(\w+)\.sinir$/.exec(arg);
        const zamandan =
          (nokta !== null &&
            new RegExp(
              "\\bconst\\s+" + nokta[1] + "\\s*=\\s*await\\s+satisStokZamani\\s*\\(",
            ).test(kod)) ||
          (arg === "sinir" &&
            /\bconst\s*\{\s*sinir\s*\}\s*=\s*await\s+satisStokZamani\s*\(/.test(kod));
        if (!zamandan && !/\bgunSonu\s*\(/.test(ucuncu)) {
          hata++;
          const sn = kod.slice(0, m.index).split("\n").length;
          bulgular.push(
            "  ⛔ " + yol.replace(/\\/g, "/") + ":" + sn +
            "  →  SINIR GÜN BAŞI OLABİLİR: " + ucuncu.trim().slice(0, 52) +
            "   (gunSonu bekleniyor)",
          );
        }
        continue;
      }

      /**
       * Beyan aranıyor — çağrıya BİTİŞİK yorum bloğunda, HAM metinde.
       *
       * ⭐ PENCERE SATIR SAYISIYLA ÖLÇÜLMÜYOR (eski hâli 6 satırdı ve
       * ÖLÇÜLDÜ: gerçek gerekçe blokları 13 ve 30 satır uzunluğunda, ikisi
       * de kaçtı). Satır sayısı büyüttükçe uzak bir beyan alakasız bir
       * çağrıyı örtmeye başlar. Ölçüt bunun yerine BAĞ: beyan, çağrının
       * KENDİ yorum bloğunda olmalı — araya kod girerse beyan düşer.
       * _(Anayasa: "pencere ölçülür; gövde büyüyünce dar pencere sessizce
       * kör kalır" — çare pencereyi büyütmek değil, kaldırmak.)_
       */
      const oncekiKod = kod.slice(0, m.index);
      const satirNo = oncekiKod.split("\n").length;
      const hamSatirlar = ham.split("\n");
      /** Çağrı satırından yukarı: yalnız yorum/boş satır geçilir. */
      let ust = satirNo - 2;
      let blok = "";
      let yorumda = false;
      while (ust >= 0) {
        const s = hamSatirlar[ust].trim();
        const yorumSatiri =
          s === "" || s.startsWith("*") || s.startsWith("//") ||
          s.startsWith("/*") || s.endsWith("*/");
        if (!yorumSatiri && !yorumda) break;
        if (s.endsWith("*/")) yorumda = true;
        if (s.startsWith("/*")) yorumda = false;
        blok = hamSatirlar[ust] + "\n" + blok;
        ust--;
      }
      if (/SINIR YOK:\s*\S/.test(blok)) {
        /**
         * ⛔ BEYAN, SAHİP OLMADIĞI MEKANİZMAYI ADIYLA ANAMAZ.
         * Bir beyan _"sınır bellekte uygulanıyor"_ diyorsa o gövde KODDA
         * bulunmalı. Yoksa beyan bir VEKİLDİR: bugün doğru, refaktörden
         * sonra sessizce yalan — ve bekçi hâlâ yeşil yanar.
         *
         * ⚠ MUTASYONLA ÖLÇÜLDÜ 29.08.2026: `fifoDagit(uygun, …)` →
         * `fifoDagit(mevcut, …)` yapıldığında sınır tamamen düşüyordu,
         * `tsc` sessizdi ve bu kontrol olmadan bekçi de sessizdi.
         */
        if (/partileriSinirla/.test(blok) && !/\bpartileriSinirla\s*\(/.test(kod)) {
          hata++;
          const sn = kod.slice(0, m.index).split("\n").length;
          bulgular.push(
            "  ⛔ " + yol.replace(/\\/g, "/") + ":" + sn +
            "  →  BEYAN `partileriSinirla` DİYOR ama kodda çağrısı YOK",
          );
        }
        continue;
      }

      hata++;
      bulgular.push(
        "  ⛔ " + yol.replace(/\\/g, "/") + ":" + satirNo +
        "  →  " + cagri.replace(/\s+/g, " ").slice(0, 72),
      );
    }
  }
}

/**
 * ⭐ SAF GÖVDE DEĞERLE SINANIR — desen taranmaz (anayasa: "saf hesap
 * katmanı, desen tarayan bekçiye muhtaç olmaz").
 */
{
  const kaynak = kaynakOku("src/lib/stok.ts");
  const govde = kaynak.slice(kaynak.indexOf("export async function acikPartilerToplu"));
  const pencere = govde.slice(0, 1200);
  const kodP = yorumsuz(pencere);
  if (!/occurredAt:\s*\{\s*lt:\s*sinir\s*\}/.test(kodP)) {
    hata++;
    bulgular.push("  ⛔ src/lib/stok.ts — süzgeç `occurredAt: { lt: sinir }` DEĞİL");
  }
  if (/occurredAt:\s*\{\s*lte:/.test(kodP)) {
    hata++;
    bulgular.push(
      "  ⛔ src/lib/stok.ts — süzgeç `lte` kullanıyor. Sınır GÜN SONU olduğu " +
      "için `lte` ertesi günün ilk anını İÇERİ ALIR.",
    );
  }
  kontrol += 2;
}

/**
 * ⭐ K314 — MEVCUT SATIŞTA ÇIPLAK `gunSonu(x.soldAt)` YASAK.
 * Mevcut bir satışın sınırı `satisStokZamani`'dan gelir; aksi hâlde bir ekran
 * aktarılan siparişi eski kuralla görür ve «stok yok» der (onay ile önizleme
 * ayrışır). Dosya listesi tutulmaz — desen yasağı (anayasa).
 * İstisna: YENİ satış girişi (aktarım olamaz) — çağrının yorum bloğunda
 * `YENİ SATIŞ: <gerekçe>` beyanı. Kapsam `src/` (betikler tek seferlik ölçüm).
 */
for (const yol of dosyalar("src")) {
  const y = yol.replace(/\\/g, "/");
  if (y.endsWith("src/lib/stok.ts")) continue;
  const ham = kaynakOku(yol);
  const kod = yorumsuz(ham);
  const desen = /\bgunSonu\s*\(\s*[\w!.]+\.soldAt\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = desen.exec(kod)) !== null) {
    kontrol++;
    const satirNo = kod.slice(0, m.index).split("\n").length;
    const hamSatirlar = ham.split("\n");
    /** Beyan çağrının kendi satırından yukarıya, BİTİŞİK yorum bloğunda. */
    let ust = satirNo - 2;
    let blok = "";
    while (ust >= 0) {
      const s = hamSatirlar[ust].trim();
      const yorumSatiri =
        s === "" || s.startsWith("*") || s.startsWith("//") ||
        s.startsWith("/*") || s.endsWith("*/");
      if (!yorumSatiri) break;
      blok = hamSatirlar[ust] + "\n" + blok;
      ust--;
    }
    if (/YENİ SATIŞ:\s*\S/.test(blok)) continue;
    hata++;
    bulgular.push(
      "  ⛔ " + y + ":" + satirNo + "  →  " + m[0] +
      "   (mevcut satış: `satisStokZamani` kullanın; yeni satışsa `YENİ SATIŞ:` beyanı)",
    );
  }
}

/**
 * ⭐ K314 — SINIRI KAYAN SATIŞTA HAREKET TARİHİ DE KAYAR.
 * `satisStokZamani` kullanan dosyada stok hareketi (`occurredAt`) ya da sayım
 * kapısı (`hareketIsTarihi`) `soldAt`'tan beslenirse sınır kayar ama hareket
 * 23.09'a yazılır: «28.09'da giren mal 23.09'da çıktı», geçmiş günün stoğu −1.
 * Kapsam KULLANIMA bağlı (dosya listesi yok): `await satisStokZamani(` çağıran
 * her dosya.
 */
/** Taban doluluğu: onay · önizleme · otomatik onay · adet düzenleme. */
const ZAMAN_KULLANAN_EN_AZ = 4;
let zamanKullanan = 0;
for (const yol of dosyalar("src")) {
  const y = yol.replace(/\\/g, "/");
  if (y.endsWith("src/lib/stok.ts")) continue;
  const kod = yorumsuz(kaynakOku(yol));
  if (!/\bawait\s+satisStokZamani\s*\(/.test(kod)) continue;
  zamanKullanan++;
  for (const desen of [
    /\boccurredAt:\s*[\w!.]+\.soldAt\b/g,
    /\bhareketIsTarihi:\s*[\w!.]+\.soldAt\b/g,
  ]) {
    let m: RegExpExecArray | null;
    kontrol++;
    while ((m = desen.exec(kod)) !== null) {
      hata++;
      bulgular.push(
        "  ⛔ " + y + ":" + kod.slice(0, m.index).split("\n").length + "  →  " + m[0] +
        "   (aktarılan siparişte `stokZamani.hareketTarihi` olmalı)",
      );
    }
  }
}

kontrol++;
if (zamanKullanan < ZAMAN_KULLANAN_EN_AZ) {
  hata++;
  bulgular.push(
    "  ⛔ K314 `satisStokZamani` kullanan dosya " + zamanKullanan +
    " (en az " + ZAMAN_KULLANAN_EN_AZ + ") — tarama boş kümeyle yeşil kalırdı",
  );
}

/** ⭐ K314 SAF GÖVDE — DEĞERLE (desen taranmaz). Ayrımın iki yakası da. */
{
  const gun = (s: string) => new Date(s);
  const esit = (ad: string, a: unknown, b: unknown) => {
    kontrol++;
    if (a !== b) {
      hata++;
      bulgular.push("  ⛔ K314 " + ad + ": beklenen " + String(b) + " · gelen " + String(a));
    }
  };
  /** Ölçülen vaka: HB 4622097086 — satış 23.09 11:24 (TR), sisteme 02.10 18:34 (TR). */
  const vaka = {
    soldAt: gun("2026-09-23T08:24:22Z"),
    createdAt: gun("2026-10-02T15:34:26Z"),
    importKaynak: "hb-enumerasyon",
  };
  const ilk = gun("2026-09-07T10:00:00Z");
  const z = satisStokZamaniHesapla(vaka, ilk);
  esit("vaka aktarılan", z.aktarilan, true);
  esit("vaka sınırı 03.10 00:00", z.sinir.toISOString(), "2026-10-03T00:00:00.000Z");
  esit("vaka hareket tarihi = sisteme düştüğü an", z.hareketTarihi.toISOString(), vaka.createdAt.toISOString());
  /** 28.09 partisi sınırın İÇİNDE (ölçütle aynı: `occurredAt < sinir`). */
  esit("28.09 partisi içeride", gun("2026-09-28T00:00:00Z") < z.sinir, true);

  /** Normal sipariş: 2 saat sonra düştü → eski kural. */
  const normal = satisStokZamaniHesapla(
    { ...vaka, createdAt: gun("2026-09-23T10:24:22Z") }, ilk);
  esit("normal aktarılan değil", normal.aktarilan, false);
  esit("normal sınır gunSonu(soldAt)", normal.sinir.toISOString(), "2026-09-24T00:00:00.000Z");
  esit("normal hareket = soldAt", normal.hareketTarihi.toISOString(), vaka.soldAt.toISOString());

  /** Gece yarısı geçişi: 23:50'de verilip 00:10'da düşen sipariş aktarılan DEĞİL (eşik 1 gün). */
  esit("gece yarısı geçişi aktarılan değil",
    aktarilanSiparisMi({ ...vaka, soldAt: gun("2026-09-23T20:50:00Z"), createdAt: gun("2026-09-23T21:10:00Z") }, ilk), false);

  /** Excel / elle girilen: createdAt geç ama kaynak kanal çekimi değil → eski kural. */
  esit("excel aktarılan değil", aktarilanSiparisMi({ ...vaka, importKaynak: "satis-excel" }, ilk), false);
  esit("elle aktarılan değil", aktarilanSiparisMi({ ...vaka, importKaynak: null }, ilk), false);

  /** İlk çekim günü (toplu geçmiş çekimi) → eski kural; ertesi gün → aktarılan. */
  /** ⚠ Örnek veri ayrımın İKİ yakasını göstermeli: satış ilk çekimden ÇOK
   *  önce (eşik geçilir) — tek fark kaydın ilk çekim gününde mi ertesi gün mü
   *  düştüğü. (İlk sürümde satış 23.09 bırakılmıştı; fark negatifti ve kapıyı
   *  silen mutasyon YEŞİL geçti.) */
  const gecmis = { ...vaka, soldAt: gun("2026-06-15T09:00:00Z") };
  esit("ilk çekim günü aktarılan değil",
    aktarilanSiparisMi({ ...gecmis, createdAt: gun("2026-09-07T18:00:00Z") }, ilk), false);
  esit("ilk çekimin ertesi günü aktarılan",
    aktarilanSiparisMi({ ...gecmis, createdAt: gun("2026-09-08T09:00:00Z") }, ilk), true);
  esit("ilk çekim anı bilinmiyorsa aktarılan değil", aktarilanSiparisMi(vaka, null), false);

  /** İstanbul günü: 21:30Z = TR 00:30 ertesi gün → sınır o TR gününün sonu. */
  const gece = satisStokZamaniHesapla({ ...vaka, createdAt: gun("2026-10-02T21:30:00Z") }, ilk);
  esit("sınır İstanbul gününe göre", gece.sinir.toISOString(), "2026-10-04T00:00:00.000Z");
}

console.log("");
console.log("FIFO SINIRI — DESEN YASAĞI");
console.log("  ölçüt: sonucu `fifoDagit`e giden çağrı `sinir` geçirmeli;");
console.log("         geçirmiyorsa yanında `SINIR YOK: <gerekçe>` beyanı olmalı.");
console.log("  incelenen çağrı: " + kontrol);
if (hata === 0) {
  console.log("  TÜM KONTROLLER GEÇTİ (" + kontrol + ")");
  process.exit(0);
}
console.log("  ⛔ BEYANSIZ SINIRSIZ ÇAĞRI: " + hata);
for (const b of bulgular) console.log(b);
console.log("");
console.log("  Çare: çağrıya olayın GÜN SONU sınırını geçir (`gunSonu(...)`),");
console.log("  ya da bilinçliyse yanına `SINIR YOK: <gerekçe>` yaz.");
process.exit(1);
