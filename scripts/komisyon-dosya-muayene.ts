/**
 * ============================================================================
 *  KOMİSYON DOSYASI MUAYENESİ — YÜKLEMEDEN ÖNCE
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run komisyon:muayene -- "C:\\yol\\komisyon.xlsx"
 *
 *  VERİTABANINA HİÇ BAĞLANMAZ, HİÇBİR ŞEY YAZMAZ. Yalnız dosyayı okur.
 *
 *  ⚠ NİYE YÜKLEMEDEN ÖNCE — Aşama 1'in ilk sorusu buna bağlı.
 *
 *  Melontik'in en ayırt edici ekranı "Ürün Komisyon Tarifeleri": aynı ürün
 *  için FARKLI FİYAT ARALIKLARINDA farklı komisyon ve farklı kâr gösteriyor
 *  (sunum slayt 18: "769,99 TL ve üzeri → komisyon 18", "769,98 TL ve altı
 *  → 12,8"). Bizde **dilim kavramı hiç yok**: `ChannelSku` tek oran taşır,
 *  okuyucu satır başına tek oran alır.
 *
 *  Cevaplanması gereken soru şu: **dilim bilgisi pazaryerinin verdiği
 *  dosyada VAR MI?**
 *    · VARSA  → şema + okuyucu genişletilir, dilim veriden gelir.
 *    · YOKSA  → dilim ELLE tanımlanacak bir kavramdır ve Aşama 1'in
 *               kapsamı ona göre kurulur.
 *
 *  Dosya yüklendikten SONRA bu soru sorulamaz: yükleme yalnız tek oranı
 *  alır, dilim kolonu varsa bile **sessizce düşer** ve ham dosya
 *  saklanmadığı için geriye dönük bakılamaz. Muayene bu yüzden ÖNCE.
 *
 *  ── ARŞİV ───────────────────────────────────────────────────────────────
 *  Muayene edilen dosya `veri/ozel/arsiv/` altına kopyalanır. O klasör
 *  **gitignore'da**: depo herkese açık ve pazaryeri dosyaları ürün, fiyat
 *  ve oran taşır. Arşiv, "kaynakta ne vardı" sorusunun bir daha
 *  cevapsız kalmaması içindir.
 * ============================================================================
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import type { SayfaGirdisi } from "../src/lib/komisyon/okuyucu";

/** Dilim/fiyat aralığı olabilecek başlıklar — geniş tutuldu, eleme gözle. */
const DILIM_IPUCLARI = [
  "fiyat",
  "aralik",
  "aralık",
  "alt",
  "ust",
  "üst",
  "min",
  "max",
  "band",
  "dilim",
  "kademe",
  "baraj",
  "esik",
  "eşik",
];

const ARSIV = "veri/ozel/arsiv";

function normalle(m: unknown): string {
  return String(m ?? "")
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const yol = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!yol) {
    console.log("");
    console.log("Kullanım: npm run komisyon:muayene -- \"C:\\\\yol\\\\dosya.xlsx\"");
    console.log("");
    process.exitCode = 1;
    return;
  }
  if (!existsSync(yol)) {
    console.log(`Dosya bulunamadı: ${yol}`);
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("KOMİSYON DOSYASI MUAYENESİ");
  console.log(`  dosya      ${basename(yol)}`);
  console.log("  kip        SALT OKUMA — veritabanına bağlanmaz");
  console.log("");

  /**
   * ⚠ NORMALLEŞTİRİCİDEN GEÇİRİLİR — YÜKLEME YOLUYLA AYNI KAPI.
   *
   * Trendyol'un indirdiği dosyalar geçerli xlsx ama ZIP64 + veri
   * tanımlayıcılı paketleniyor ve `read-excel-file` onları AÇAMIYOR
   * (`lib/tablo/paket.ts`, ölçüm 11.08.2026). Muayene tam da o dosyaya
   * bakacak; normalleştiriciyi atlasaydım araç ilk gerçek dosyada
   * "okunamadı" der ve suçu dosyaya atardım.
   *
   * Sayfaların hepsi gezilir: TY iki sayfa gönderiyor ("Ürünler" +
   * "Termin Süresi Bilgileri") ve dilim ayrı sayfada olabilir — ilk
   * sayfaya bakıp "yok" demek aradığımız şeyi kaçırırdı.
   */
  let sayfalar: SayfaGirdisi[];
  try {
    const { bayt } = paketiNormalle(readFileSync(yol));
    sayfalar = (await readXlsxFile(bayt)) as unknown as SayfaGirdisi[];
  } catch (e) {
    console.log(`  DOSYA OKUNAMADI: ${String(e).slice(0, 200)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`  SAYFA SAYISI: ${sayfalar.length}`);
  for (const sf of sayfalar) console.log(`     · ${sf.sheet}`);
  console.log("");

  let dilimBulundu = false;

  for (const sayfa of sayfalar) {
    const satirlar = sayfa.data ?? [];
    console.log(`  ── SAYFA: ${sayfa.sheet} ─────────────────────────────────`);
    console.log(`     satır sayısı (başlık dahil): ${satirlar.length}`);

    if (satirlar.length === 0) {
      console.log("     (boş sayfa)");
      console.log("");
      continue;
    }

    const basliklar = satirlar[0].map((h) => String(h ?? "").trim());
    console.log(`     KOLONLAR (${basliklar.length}):`);
    for (const [i, b] of basliklar.entries()) {
      const n = normalle(b);
      const ipucu = DILIM_IPUCLARI.some((d) => n.includes(d));
      if (ipucu) dilimBulundu = true;
      console.log(`       ${String(i + 1).padStart(2)}. ${b}${ipucu ? "   ← DİLİM İPUCU" : ""}`);
    }

    /**
     * İLK VERİ SATIRI DA BASILIR. Başlık tek başına yanıltabilir:
     * "Komisyon Oranı" tek değer de taşıyabilir, "8-12" gibi bir aralık
     * metni de. Değeri görmeden karar verilmez.
     */
    if (satirlar.length > 1) {
      console.log("");
      console.log("     İLK VERİ SATIRI (başlık = değer):");
      for (const [i, b] of basliklar.entries()) {
        const d = satirlar[1][i];
        if (d === null || d === undefined || String(d).trim() === "") continue;
        console.log(`       ${b} = ${String(d).slice(0, 60)}`);
      }
    }

    /**
     * AYNI ÜRÜN BİRDEN ÇOK SATIRDA MI? Dilim, ayrı KOLON olarak değil
     * ayrı SATIR olarak da gelebilir (her fiyat aralığı bir satır). Bu
     * durumda kolon başlıklarında ipucu çıkmaz ve muayene "dilim yok"
     * derdi — yanlış olurdu.
     */
    const kodDizini = basliklar.findIndex((b) => {
      const n = normalle(b);
      return n.includes("barkod") || n === "sku" || n.includes("stok kodu");
    });
    if (kodDizini >= 0 && satirlar.length > 2) {
      const sayac = new Map<string, number>();
      for (const r of satirlar.slice(1)) {
        const k = String(r[kodDizini] ?? "").trim();
        if (k !== "") sayac.set(k, (sayac.get(k) ?? 0) + 1);
      }
      const tekrarli = [...sayac.entries()].filter(([, n]) => n > 1);
      console.log("");
      console.log(`     AYNI KOD BİRDEN ÇOK SATIRDA: ${tekrarli.length} kod`);
      if (tekrarli.length > 0) {
        dilimBulundu = true;
        console.log("       ← DİLİM SATIR OLARAK GELİYOR OLABİLİR. Örnekler:");
        for (const [k, n] of tekrarli.slice(0, 5)) {
          console.log(`         ${k} → ${n} satır`);
        }
      } else {
        console.log("       (her kod tek satır — dilim satır olarak gelmiyor)");
      }
    }
    console.log("");
  }

  // --- HÜKÜM ---------------------------------------------------------------
  console.log("  ── HÜKÜM ──────────────────────────────────────────────────");
  if (dilimBulundu) {
    console.log("     ⚑ DİLİM İZİ VAR. Yukarıdaki işaretli kolonları / tekrarlı");
    console.log("       kodları gözle doğrula. Gerçekten dilimse:");
    console.log("       → şema genişletme kapsamı çıkarılacak (oran artık tek");
    console.log("         değer değil, aralık listesi) — Aşama 1 zemini.");
  } else {
    console.log("     DİLİM İZİ YOK. Kolon başlıklarında fiyat aralığı geçmiyor");
    console.log("     ve her kod tek satırda.");
    console.log("     → Dilim kaynağı 'ELLE TANIM' olarak kesinleşir; Aşama 1");
    console.log("       kapsamı buna göre kurulur (dilimleri kullanıcı tanımlar,");
    console.log("       pazaryeri vermiyor).");
  }
  console.log("");

  // --- ARŞİV ---------------------------------------------------------------
  if (!existsSync(ARSIV)) mkdirSync(ARSIV, { recursive: true });
  const hedef = join(ARSIV, basename(yol));
  copyFileSync(yol, hedef);
  console.log(`  ARŞİVLENDİ → ${hedef}`);
  console.log("  (gitignore'da — depo herkese açık, dosya ürün/fiyat/oran taşır)");
  console.log("");
}

main();
