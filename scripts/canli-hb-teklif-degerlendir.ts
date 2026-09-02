/**
 * ============================================================================
 *  HB "AVANTAJLI TEKLİFLER" DEĞERLENDİRMESİ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:hb-teklif -- "<dosya.xlsx>"
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 02.09.2026 tarihli teklif dosyası için.
 *  HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur. Dosya periyodik gelirse kalıcı
 *  ekran açılır (BEKLEYENLER, açılış şartı: Halil dosyanın düzenli geldiğini
 *  söylerse).
 *
 *  ── SORDUĞU SORU ────────────────────────────────────────────────────────
 *  HB diyor ki: _"fiyatı 8.886'ya indirirsen komisyonu %13'ten %4,7'ye
 *  düşürürüm."_ Bu teklifi kabul etmek KÂRLI MI?
 *
 *  ⛔ RAPOR HÜKÜM VERMEZ. Talep tahmini YOK — "fiyat düşünce kaç adet daha
 *  satarım" sorusunun cevabı bu sistemde yok ve uydurulmuyor. Rapor yalnız
 *  BAŞABAŞ ÇARPANINI söyler: _bugünkü kârı korumak için kaç kat satmalıyım._
 *  Kararı operatör verir.
 *
 *  ── ⚠ KÂR HESABI YENİDEN YAZILMADI ──────────────────────────────────────
 *  `simulasyonKur` çağrılıyor — fiyat denemesi ekranının kullandığı gövdenin
 *  aynısı. İkinci bir hesap yazsaydım, biri değişince öteki sessizce
 *  ayrışırdı ve iki ekran aynı fiyata iki NET-2 verirdi.
 *
 *  ── ⚠ KARGO HARİÇ — VE BU BEYAN EDİLİYOR ────────────────────────────────
 *  Teklif dosyası desi taşımıyor, kargo firması da seçili değil. Kargo İKİ
 *  senaryoda da AYNI olduğu için KARŞILAŞTIRMAYI etkilemez; ama mutlak
 *  rakamlar bu yüzden panelin NET-2'siyle BİREBİR AYNI DEĞİLDİR. Rakamı
 *  "ürünün gerçek NET-2'si" diye okumak yanlış olur.
 *
 *  ── ⚠ EŞLEŞME HB SKU ÜSTÜNDEN — BARKOD YOK ──────────────────────────────
 *  Dosyada barkod kolonu YOK (ölçüldü 02.09.2026); kimlik `SKU` /
 *  `Satıcı Stok Kodu`. Eşleşmeyen satır "EŞLEŞMEDİ" diye AYRI sayılır ve
 *  listelenir — ada göre tahmin YAPILMAZ. _(Anayasa: "kimlik varken dizeyle
 *  aranmaz"; "sıfır üç farklı şey olabilir".)_
 * ============================================================================
 */

import { writeFileSync, mkdirSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { simulasyonKur } from "../src/lib/fiyatlama/simulasyon";
import { kdvOraniniCoz } from "../src/lib/kdv";
import { siparisKesintiKurallari } from "../src/lib/siparis-kesintileri";
import { acikPartilerToplu } from "../src/lib/stok";
import { canliYapilandirma } from "./canli-ortak";

const CIKTI_DIZIN = "raporlar";
/** Ölçüldü 02.09.2026 — `prisma/seed.ts` ve canlı `Channel.code`. */
const HEDEF_KANAL_KODU = "HEPSIBURADA";

/** Her NET-2 sütununun başlığına eklenen taban beyanı. */
const KARGO_NOTU = (baslik: string) =>
  `${baslik} — KARGO HARİÇ: paneldeki NET-2 ile birebir ` +
  "karşılaştırılamaz · " +
  "iki senaryoda aynı olduğu için kıyası etkilemez.";

function sayi(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const m = String(x).trim();
  if (m === "") return null;
  /** "13,00 %" · "8.886" · 15269 → sayı. Yüzde işareti ve boşluk atılır. */
  const n = Number(m.replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function para(x: number | null): string {
  return x === null
    ? "—"
    : x.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}
function saga(m: string, n: number): string {
  return m.length >= n ? m : " ".repeat(n - m.length) + m;
}
function csvAlan(x: string): string {
  return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}
/**
 * ⛔ BİTİŞ İSTANBUL İŞ SAATİNDE — ham damga UTC ve İKİSİ AYNI GÜN DEĞİL.
 * Ölçüldü 02.09.2026: dosyadaki değer `2026-09-08T23:58:59.999Z`, yani
 * İstanbul'da **09.09 02:58**. Makinenin yerel saati (Almanya) de üçüncü
 * bir cevap veriyor. Anayasa iş saat dilimini SABİTLİYOR: `Europe/Istanbul`.
 * ⚠ Ve dosyadaki bütün teklifler AYNI GÜN BİTMİYOR — beş farklı tarih var,
 * bu yüzden tarih satır başına taşınıyor, rapor başlığına değil.
 */
function bitisTR(x: unknown): string | null {
  if (!(x instanceof Date)) return null;
  return x.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function csvSayi(x: number | null): string {
  return x === null ? "" : x.toFixed(2).replace(".", ",");
}

type Kademe = { sira: number; ustFiyat: number; komisyon: number };

async function main() {
  const yolArg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (yolArg === undefined) {
    console.log('Kullanım: npm run canli:hb-teklif -- "<dosya.xlsx>"');
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  HB AVANTAJLI TEKLİFLER — DEĞERLENDİRME (salt okuma)");
  console.log("=".repeat(78));

  // ── DOSYA ────────────────────────────────────────────────────────────────
  const sayfalar = (await readXlsxFile(yolArg)) as unknown as {
    sheet: string;
    data: unknown[][];
  }[];
  const sf = sayfalar.find((s) => s.sheet === "Teklifler");
  if (sf === undefined) {
    console.log("⛔ 'Teklifler' sayfası YOK — bu dosya beklenen yapıda değil.");
    console.log("   Bu 'teklif yok' DEMEK DEĞİL: okunamadı.");
    await prisma.$disconnect();
    return;
  }

  /** İki satırlı başlık: [0] grup adları, [1] alt başlıklar. */
  const ust = (sf.data[0] ?? []).map((c) => String(c ?? "").trim());
  const alt = (sf.data[1] ?? []).map((c) => String(c ?? "").trim());
  const kolon = (ad: string) => ust.findIndex((b) => b === ad);

  const iAd = kolon("Ürün Adı");
  const iStokKodu = kolon("Satıcı Stok Kodu");
  const iSku = kolon("SKU");
  const iStok = kolon("Stok");
  const iFiyat = kolon("Mevcut Fiyat");
  const iKom = kolon("Mevcut Komisyon");
  const iBitis = kolon("Bitiş");

  /** Teklif kademeleri: üst başlıkta `Teklif N`, ALT başlıkta Üst Fiyat/Komisyon. */
  const kademeKolonlari: { fiyat: number; komisyon: number }[] = [];
  for (let i = 0; i < ust.length; i++) {
    if (!/^Teklif\s*\d+$/.test(ust[i])) continue;
    /** Grup başlığı birleştirilmiş: fiyat bu kolonda, komisyon YANINDA. */
    if (alt[i] === "Üst Fiyat" && alt[i + 1] === "Komisyon") {
      kademeKolonlari.push({ fiyat: i, komisyon: i + 1 });
    }
  }
  if (kademeKolonlari.length === 0) {
    console.log("⛔ Kademe kolonu bulunamadı — okunamadı, 'teklif yok' değil.");
    await prisma.$disconnect();
    return;
  }

  const satirlar = sf.data.slice(2).filter((r) => String(r[iAd] ?? "").trim());
  console.log(`\n  dosya satırı      : ${satirlar.length}`);
  console.log(`  kademe kolonu     : ${kademeKolonlari.length}`);

  // ── KANAL VE KURALLAR ────────────────────────────────────────────────────
  /**
   * ⚠ KOD ÖLÇÜLDÜ, VARSAYILMADI. İlk yazımda `"HB"` yazdım ve hesap
   * bulunamadı — gerçek kod `HEPSIBURADA` (`prisma/seed.ts:40`). Anayasadaki
   * "kanal adına gömülü sözlük" tuzağının aynısı: eşleşmeyince betik sessizce
   * boş dönerdi ve boş dönüş MAKUL görünürdü.
   */
  const hesap = await prisma.channelAccount.findFirst({
    where: {
      channel: { code: HEDEF_KANAL_KODU },
      satisIcin: true,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      channel: { select: { code: true, name: true, fees: true } },
    },
  });
  if (hesap === null) {
    /** ⛔ ÇIKMAZA SOKMA: hangi kodların VAR olduğu yazılır (İlke #5). */
    const kanallar = await prisma.channel.findMany({
      select: { code: true, name: true },
    });
    console.log(`⛔ '${HEDEF_KANAL_KODU}' kodlu AKTİF SATIŞ hesabı bulunamadı.`);
    console.log("   Bu 'teklif değerlendirilemez' demek DEĞİL: kanal seçilemedi.");
    console.log("   Sistemdeki kanal kodları:");
    for (const k of kanallar) console.log(`     ${k.code}  —  ${k.name}`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const kesintiler = siparisKesintiKurallari(hesap.channel.fees);
  const komisyonKdv =
    hesap.channel.fees.find((f) => f.code === "KOMISYON_KDV") ?? null;
  const komisyonKdvOrani =
    komisyonKdv === null || komisyonKdv.rate === null
      ? null
      : Number(komisyonKdv.rate.toString());
  console.log(
    `  kanal hesabı      : ${hesap.channel.name} — ${hesap.name}` +
      `  ·  sipariş kesintisi ${kesintiler.length}` +
      `  ·  komisyon KDV ${komisyonKdvOrani === null ? "yok" : "%" + komisyonKdvOrani}`,
  );

  // ── EŞLEŞTİRME: HB SKU → ChannelSku ──────────────────────────────────────
  const kodlar = [
    ...new Set(
      satirlar.flatMap((r) =>
        [r[iSku], r[iStokKodu]]
          .map((x) => String(x ?? "").trim())
          .filter((x) => x !== ""),
      ),
    ),
  ];
  const eslemeler = await prisma.channelSku.findMany({
    where: {
      /** ⚠ KİMLİKLE: kanal ADIYLA değil hesap kimliğiyle süzülüyor. */
      channelAccountId: hesap.id,
      channelSku: { in: kodlar },
    },
    select: {
      channelSku: true,
      commissionRate: true,
      variant: {
        select: {
          id: true,
          sku: true,
          product: {
            select: {
              name: true,
              vatRateOverride: true,
              category: { select: { name: true, vatRate: true } },
            },
          },
        },
      },
    },
  });
  const kodaGore = new Map(eslemeler.map((e) => [e.channelSku, e]));
  console.log(
    `  dosyadaki kod     : ${kodlar.length}  ·  eşleşen ChannelSku: ${eslemeler.length}`,
  );

  const partiHaritasi = await acikPartilerToplu(
    prisma,
    eslemeler.map((e) => e.variant.id),
  );

  const bugun = new Date();
  bugun.setUTCHours(0, 0, 0, 0);

  type Cikti = {
    urun: string;
    hbKod: string;
    sku: string | null;
    eslesti: boolean;
    stok: number | null;
    rafAdedi: number | null;
    mevcutFiyat: number | null;
    mevcutKomisyon: number | null;
    /** Teklifin son günü — İSTANBUL iş saatinde. */
    bitis: string | null;
    bugunNet2: number | null;
    kademeler: {
      sira: number;
      fiyat: number;
      komisyon: number;
      net2: number | null;
      carpan: number | null;
    }[];
  };

  const ciktilar: Cikti[] = [];
  let eslesen = 0;
  let eslesmeyen = 0;
  let maliyetsiz = 0;

  for (const r of satirlar) {
    const urunAdi = String(r[iAd] ?? "").trim();
    const skuKod = String(r[iSku] ?? "").trim();
    const stokKod = String(r[iStokKodu] ?? "").trim();
    const esleme = kodaGore.get(skuKod) ?? kodaGore.get(stokKod) ?? null;

    const kademeler: Kademe[] = [];
    for (const [n, k] of kademeKolonlari.entries()) {
      const f = sayi(r[k.fiyat]);
      const kom = sayi(r[k.komisyon]);
      if (f !== null && kom !== null) {
        kademeler.push({ sira: n + 1, ustFiyat: f, komisyon: kom });
      }
    }

    if (esleme === null) {
      eslesmeyen++;
      ciktilar.push({
        urun: urunAdi,
        hbKod: skuKod || stokKod,
        sku: null,
        eslesti: false,
        stok: sayi(r[iStok]),
        rafAdedi: null,
        mevcutFiyat: sayi(r[iFiyat]),
        mevcutKomisyon: sayi(r[iKom]),
        bitis: bitisTR(r[iBitis]),
        bugunNet2: null,
        kademeler: kademeler.map((k) => ({
          sira: k.sira,
          fiyat: k.ustFiyat,
          komisyon: k.komisyon,
          net2: null,
          carpan: null,
        })),
      });
      continue;
    }
    eslesen++;

    const partiler = partiHaritasi.get(esleme.variant.id) ?? [];
    const rafAdedi = partiler.reduce((x, p) => x + p.kalanAdet, 0);
    /**
     * ⚠ SIRADAKİ PARTİNİN BİRİM MALİYETİ — ortalama DEĞİL.
     * FIFO'da bir sonraki satış en eski açık partiden düşer; "bu teklifi
     * kabul edersem ne kazanırım" sorusunun maliyeti odur.
     * Parti yoksa `null` — SIFIR DEĞİL, bilinmiyor.
     */
    const siradaki = partiler[0] ?? null;
    const birimMaliyet =
      siradaki === null || siradaki.birimMaliyet === null
        ? null
        : Number(siradaki.birimMaliyet);
    if (birimMaliyet === null) maliyetsiz++;

    const kdvOrani = kdvOraniniCoz(esleme.variant.product).oran ?? 20;
    const mevcutFiyat = sayi(r[iFiyat]);
    const mevcutKomisyon = sayi(r[iKom]);

    /** ⚠ Aynı gövde her senaryoda — ikinci bir hesap yazılmıyor. */
    const net2Hesapla = (fiyat: number, oran: number): number | null =>
      simulasyonKur({
        hedefFiyat: fiyat,
        adet: 1,
        birimMaliyet,
        kdvOrani,
        paraBirimi: "TRY",
        dilimler: null,
        pencereBitis: null,
        tekOran: oran,
        komisyonKdvOrani,
        siparisKesintileri: kesintiler,
        /** Kargo HARİÇ — dosya desi taşımıyor; iki senaryoda da aynı. */
        kargoTarifesi: null,
        bugun,
      }).net2;

    const bugunNet2 =
      mevcutFiyat === null || mevcutKomisyon === null
        ? null
        : net2Hesapla(mevcutFiyat, mevcutKomisyon);

    ciktilar.push({
      urun: urunAdi,
      hbKod: skuKod || stokKod,
      sku: esleme.variant.sku,
      eslesti: true,
      stok: sayi(r[iStok]),
      rafAdedi,
      mevcutFiyat,
      mevcutKomisyon,
      bitis: bitisTR(r[iBitis]),
      bugunNet2,
      kademeler: kademeler.map((k) => {
        const net2 = net2Hesapla(k.ustFiyat, k.komisyon);
        /**
         * BAŞABAŞ ÇARPANI — bugünkü ADET BAŞINA kârı korumak için gereken
         * satış katı. `2,4` = "aynı parayı kazanmak için 2,4 kat satmalısın".
         *
         * ⛔ TALEP TAHMİNİ YOK: bu çarpanın gerçekleşip gerçekleşmeyeceğini
         * sistem bilmez ve tahmin etmez. Rapor soruyu ölçer, cevabı vermez.
         * ⚠ Teklif NET'i ≤ 0 ise çarpan `null` — "sonsuz kat" demek anlamsız,
         * o teklif adet ne olursa olsun para kazandırmaz.
         */
        const carpan =
          bugunNet2 === null || net2 === null || net2 <= 0 || bugunNet2 <= 0
            ? null
            : bugunNet2 / net2;
        return {
          sira: k.sira,
          fiyat: k.ustFiyat,
          komisyon: k.komisyon,
          net2,
          carpan,
        };
      }),
    });
  }

  // ── KÜME AYRIMI ──────────────────────────────────────────────────────────
  console.log("\n" + "-".repeat(78));
  console.log("  KÜME AYRIMI — dördü AYRI sayılır");
  console.log("-".repeat(78));
  console.log(`  incelenen satır            : ${satirlar.length}`);
  console.log(`  ✓ eşleşen (ChannelSku HB)  : ${eslesen}`);
  console.log(`  ⚠ EŞLEŞMEDİ                : ${eslesmeyen}`);
  console.log(`  ⚠ eşleşti ama MALİYETSİZ   : ${maliyetsiz}`);
  console.log(
    "\n  ⛔ Eşleşmeyen satır için hüküm YOK — ada göre tahmin yapılmadı.",
  );

  // ── ÖZET TABLO ───────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET — bugünkü NET-2/adet ↔ EN İYİ kademe NET-2/adet");
  console.log("=".repeat(78));
  console.log(
    "\n  " +
      doldur("ÜRÜN", 30) +
      saga("STOK", 5) +
      saga("RAF", 5) +
      saga("BUGÜN N2", 11) +
      saga("EN İYİ N2", 11) +
      saga("ÇARPAN", 9),
  );
  console.log("  " + "-".repeat(71));

  const eslesenler = ciktilar.filter((c) => c.eslesti);
  /** En iyi kademe = NET-2'si en yüksek olan; en ucuz fiyat DEĞİL. */
  const enIyi = (c: Cikti) =>
    c.kademeler
      .filter((k) => k.net2 !== null)
      .sort((a, b) => (b.net2 ?? 0) - (a.net2 ?? 0))[0] ?? null;

  eslesenler.sort((a, b) => (b.bugunNet2 ?? 0) - (a.bugunNet2 ?? 0));
  let kabulEdilebilir = 0;
  for (const c of eslesenler) {
    const k = enIyi(c);
    const carpan = k?.carpan ?? null;
    if (carpan !== null && carpan <= 1) kabulEdilebilir++;
    console.log(
      "  " +
        doldur(c.urun, 30) +
        saga(c.stok === null ? "—" : String(c.stok), 5) +
        saga(c.rafAdedi === null ? "—" : String(c.rafAdedi), 5) +
        saga(para(c.bugunNet2), 11) +
        saga(k === null ? "—" : para(k.net2), 11) +
        saga(carpan === null ? "—" : carpan.toFixed(1) + "×", 9) +
        (k !== null && k.net2 !== null && k.net2 <= 0 ? "  ⛔ ZARAR" : ""),
    );
  }

  console.log("\n  " + "-".repeat(71));
  console.log(
    `  ⭐ çarpanı 1,0 veya altında olan (bugünkünden İYİ): ${kabulEdilebilir}` +
      ` / ${eslesenler.length}`,
  );
  console.log(
    "\n  ÇARPAN NASIL OKUNUR: '2,4×' = bu teklifi kabul edersen, bugünkü\n" +
      "  parayı kazanmak için 2,4 KAT satman gerekir. Satıp satamayacağını\n" +
      "  sistem BİLMEZ — bu bir talep tahmini değil, başabaş ölçüsüdür.",
  );
  console.log(
    "\n  ⚠ STOK SÜTUNU ÖNEMLİ: stoğu 1 olan üründe teklif zaten anlamsız —\n" +
      "  kaç kat satacağın sorusunun cevabı elindeki maldan büyük olamaz.",
  );
  console.log(
    "\n  ⚠ KARGO HARİÇ: teklif dosyası desi taşımıyor. Kargo iki senaryoda da\n" +
      "  AYNI olduğu için karşılaştırmayı etkilemez, ama bu rakamlar panelin\n" +
      "  NET-2'siyle BİREBİR AYNI DEĞİLDİR.",
  );

  if (eslesmeyen > 0) {
    console.log("\n" + "-".repeat(78));
    console.log("  ⚠ EŞLEŞMEYENLER — sistemde HB kodu bulunamadı");
    console.log("-".repeat(78));
    for (const c of ciktilar.filter((x) => !x.eslesti)) {
      console.log(`  ${doldur(c.urun, 44)} ${c.hbKod}`);
    }
  }

  // ── CSV ──────────────────────────────────────────────────────────────────
  mkdirSync(CIKTI_DIZIN, { recursive: true });
  const csvYol = `${CIKTI_DIZIN}/hb-teklif-degerlendirme-0209.csv`;
  const basliklar = [
    "Durum",
    "Ürün",
    "HB kodu",
    "SKU",
    "Dosyadaki stok",
    "Raftaki adet",
    "Mevcut fiyat",
    "Mevcut komisyon %",
    /**
     * ⛔ UYARI DOSYAYA DEĞİL RAKAMA AİT — bu yüzden SÜTUN BAŞLIĞINDA.
     * Dosyanın başına ayrı bir not satırı koysaydım CSV makine okunur
     * olmaktan çıkardı; ayrı bir "Not" sütunu ise rakamdan kopardı ve
     * sütun gizlenince uyarı da kaybolurdu.
     * _(Anayasa: "para rakamı tabanıyla birlikte yazılır" — taban
     * yazılmazsa geri kazanılamaz.)_
     */
    KARGO_NOTU("Bugün NET-2/adet"),
    "Kademe",
    "Teklif üst fiyatı",
    "Teklif komisyonu %",
    KARGO_NOTU("Teklif NET-2/adet"),
    "Başabaş çarpanı",
    /** Bitiş İSTANBUL iş saatinde — ham damga UTC, ikisi AYNI GÜN DEĞİL. */
    "Teklif bitişi (İstanbul)",
  ];
  const csv = [basliklar.map(csvAlan).join(";")];
  for (const c of ciktilar) {
    for (const k of c.kademeler) {
      csv.push(
        [
          c.eslesti ? "eslesti" : "ESLESMEDI",
          c.urun,
          c.hbKod,
          c.sku ?? "",
          c.stok === null ? "" : String(c.stok),
          c.rafAdedi === null ? "" : String(c.rafAdedi),
          csvSayi(c.mevcutFiyat),
          csvSayi(c.mevcutKomisyon),
          csvSayi(c.bugunNet2),
          String(k.sira),
          csvSayi(k.fiyat),
          csvSayi(k.komisyon),
          csvSayi(k.net2),
          k.carpan === null ? "" : k.carpan.toFixed(2).replace(".", ","),
          c.bitis ?? "",
        ]
          .map(csvAlan)
          .join(";"),
      );
    }
  }
  /** ⚠ BOM: Excel Türkçe karakteri UTF-8 tanısın. */
  writeFileSync(csvYol, "﻿" + csv.join("\r\n"), "utf8");

  console.log("\n" + "=".repeat(78));
  console.log(`  CSV: ${csvYol}   (${csv.length - 1} satır)`);
  console.log("  Salt okuma — veritabanına hiçbir şey yazılmadı.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  /** Mesaj TAM taşınır — kısaltma teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
