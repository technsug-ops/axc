import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, baslikKur, kimlikOku, tumSayfalar } from "./ty/istemci";

/**
 * ============================================================================
 *  OKUTULMAYAN VARYANTLARIN SATIŞ İZİ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-okutulmayan-satis-izi.ts
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ — ne veritabanına ne pazaryerine. TY istemcisi
 *  YALNIZ okuma uçlarını biliyor (güvenlik çerçevesi 25.08.2026).
 *
 *  ⚠ NİYE: sayımda okutulmayan 32 varyant "kayıp" demek DEĞİL. Halil
 *  doğruladı — Partybox, Roborock ve Dreame **satılmış, rafta yok.**
 *
 *  ⛔ ÜÇ KAYNAK, ÜÇ AYRI KAPSAM — ve karıştırılmaz:
 *    ① satış dosyası  → bütün kanallar, ama yalnız dosyanın kapsadığı dönem
 *    ② TY API         → yalnız TRENDYOL, yalnız son 90 gün (uç sınırı)
 *    ③ sistemin kendi defteri → satış SONRADAN girilmiş olabilir
 *
 *  ⚠ ②'nin sessizliği kanıt DEĞİLDİR: HB'de satılmış bir ürün TY API'de
 *  görünmez ve HB'nin okuma API'si YOK. "İz bulunamadı" satırı,
 *  "satılmadı" diye okunamaz.
 *
 *  ⚠ SAYIM DAMGASI BAYATLAYABİLİR: satır açıldığında sistem adedi
 *  damgalandı; Halil o günden sonra eksik satışı girdiyse GÜNCEL adet
 *  düşmüştür. İki sütun AYRI basılır (`sayımGünü` ↔ `şuAn`), yoksa
 *  girilmiş bir satış hâlâ "eksik" gibi okunur.
 * ============================================================================
 */

const SAYIM = process.argv.find((a) => a.startsWith("--sayim="))?.slice(8) ?? "sayim-20260827-2";
const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

/** Halil'in ekran görüntüsünden okunan HB kanıtı (Roborock S8 Pro Plus). */
const ROBOROCK = {
  siparisNo: "4114618000",
  takipNo: "62755096992291",
  hbStokKodu: "HBCV000090LZ1F",
  tutar: 31_511.07,
};

const t2 = (n: number) => n.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const sayim = await p.stokSayimi.findFirst({
    where: { kod: SAYIM },
    select: { id: true, sayimGunu: true },
  });
  if (!sayim) {
    console.log("\n⛔ SAYIM YOK: " + SAYIM + "\n");
    process.exitCode = 1;
    return;
  }

  const satirlar = await p.stokSayimSatiri.findMany({
    where: { sayimId: sayim.id, kapsamdaydi: true, sayilanAdet: null },
    select: {
      variantId: true,
      variant: {
        select: {
          sku: true, barcode: true, companySku: true, name: true,
          channelSkus: { select: { channelSku: true } },
          product: { select: { name: true } },
        },
      },
    },
  });

  // ── Satış dosyası ──────────────────────────────────────────────────────
  const sSayfa = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sBas = sSayfa.data[5].map((h) => String(h ?? "").trim());
  const jSku = sBas.indexOf("SKU");
  const jBar = sBas.indexOf("AXCALI BARKOD");
  const jAdet = sBas.indexOf("Satış Miktarı");
  const jSip = sBas.indexOf("Sipariş Numarası");
  const jUrun = sBas.indexOf("Ürün");
  const dosya = sSayfa.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  console.log("\n" + "=".repeat(112));
  console.log("OKUTULMAYAN VARYANTLARIN SATIŞ İZİ — " + SAYIM + " · SALT OKUMA");
  console.log("sayım günü: " + sayim.sayimGunu.toISOString().slice(0, 10) +
    "   ·   okutulmayan kapsam içi satır: " + satirlar.length);
  console.log("=".repeat(112));

  // ── ② TY API — son 90 gün ──────────────────────────────────────────────
  console.log("\n② TRENDYOL API — son 90 gün taranıyor…");
  const kimlik = kimlikOku();
  const tyBarkodAdet = new Map<string, number>();
  let apiDurum = "ATLANDI (.env.canli'de anahtar yok)";
  if (kimlik) {
    const baslik = baslikKur(kimlik);
    const son = Date.now();
    const bas = son - 90 * 86400_000;
    /**
     * ⚠ 14 GÜNLÜK DİLİMLER — 26.08'de ölçüldü: tek 90 günlük pencere
     * `totalPages: 1` ve 114 kayıt döndürüyor, dilimlenince 234 çıkıyor.
     * Uç "hata yok" diyor ama LİSTE TAM DEĞİL (anayasa: "bir kaynağın
     * listesi kendi tamlığını kanıtlayamaz").
     */
    let dilim = 0;
    let paketSayisi = 0;
    const hatalar: string[] = [];
    for (let t = bas; t < son; t += 14 * 86400_000) {
      const bit = Math.min(t + 14 * 86400_000, son);
      const s = await tumSayfalar(
        (sayfa) => UCLAR.siparisler(kimlik.saticiId, t, bit, sayfa),
        baslik,
      );
      dilim++;
      if (s.tur === "HATA") {
        /** ⛔ Mesaj KIRPILMADAN taşınır — teşhis mesajın sonunda olabilir. */
        hatalar.push("dilim " + dilim + ": " + JSON.stringify(s.sonuc));
        continue;
      }
      for (const paket of s.kayitlar) {
        const pk = paket as {
          lines?: { barcode?: string; quantity?: number }[];
          status?: string;
        };
        if (pk.status === "Cancelled") continue;
        paketSayisi++;
        for (const l of pk.lines ?? []) {
          if (!l.barcode) continue;
          tyBarkodAdet.set(l.barcode, (tyBarkodAdet.get(l.barcode) ?? 0) + (l.quantity ?? 0));
        }
      }
    }
    apiDurum = "KOŞTU · " + dilim + " dilim · " + paketSayisi + " paket · " +
      tyBarkodAdet.size + " farklı barkod";
    if (hatalar.length) apiDurum += "\n   ⛔ HATALI DİLİM " + hatalar.length + ": " + hatalar.join(" | ");
  }
  console.log("   " + apiDurum);
  console.log("   ⚠ TY API YALNIZ TRENDYOL'u kapsar. HB'de satılmış bir ürün burada GÖRÜNMEZ.");

  // ── ① + ② + ③ satır satır ──────────────────────────────────────────────
  console.log("\n\n① VARYANT BAŞINA İZ\n");
  console.log("   SKU                sayımGünü  şuAn   dosyaSAT  sisSAT   TY-90g │ SONUÇ");
  console.log("   " + "─".repeat(106));

  type Sonuc = { sku: string; ad: string; adet: number; tutar: number; sinif: string };
  const tablo: Sonuc[] = [];

  for (const st of satirlar) {
    const v = st.variant;
    const kodlar = new Set(
      [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((k) => k.channelSku)]
        .filter((k): k is string => !!k && k.trim() !== ""),
    );

    const eslesen = dosya.filter((r) =>
      kodlar.has(String(r[jSku] ?? "").trim()) || kodlar.has(String(r[jBar] ?? "").trim()));
    const dosyaAdet = eslesen.reduce(
      (t, r) => t + (Number.isFinite(Number(r[jAdet])) ? Number(r[jAdet]) : 0), 0);

    const sisSat = await p.stockMovement.aggregate({
      where: { variantId: st.variantId, type: "SALE_OUT" },
      _sum: { quantityDelta: true },
    });
    const sisSatAdet = Math.abs(sisSat._sum.quantityDelta ?? 0);
    const dosyadaFazla = dosyaAdet - sisSatAdet;

    const tyAdet = v.barcode ? (tyBarkodAdet.get(v.barcode) ?? 0) : 0;

    const oGun = await p.stockMovement.aggregate({
      where: { variantId: st.variantId, occurredAt: { lte: sayim.sayimGunu } },
      _sum: { quantityDelta: true },
    });
    const suAn = await p.stockMovement.aggregate({
      where: { variantId: st.variantId },
      _sum: { quantityDelta: true },
    });
    const adetOGun = oGun._sum.quantityDelta ?? 0;
    const adetSuAn = suAn._sum.quantityDelta ?? 0;

    const giris = await p.stockMovement.findFirst({
      where: { variantId: st.variantId, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
      select: { unitCostAmount: true },
      orderBy: { occurredAt: "desc" },
    });
    const birim = Number(giris?.unitCostAmount?.toString() ?? 0);

    /**
     * ⛔ SINIFLANDIRMA — VE "İZ YOK" HÜKÜM DEĞİLDİR:
     *   adetSuAn < adetOGun → satış SONRADAN GİRİLDİ; satır çözüldü
     *   dosyadaFazla > 0    → dosyada işlenmemiş satış VAR
     *   tyAdet > sisSatAdet → TY API'de sistemde olmayan satış VAR
     *   hiçbiri             → "iz yok" — satılmadığını KANITLAMAZ
     *                         (HB'nin okuma API'si yok, dosya kapsamı dar)
     */
    const izler: string[] = [];
    if (adetSuAn < adetOGun) izler.push("SONRADAN GİRİLDİ −" + (adetOGun - adetSuAn));
    if (dosyadaFazla > 0) izler.push("dosya +" + dosyadaFazla);
    if (tyAdet > sisSatAdet) izler.push("TY +" + (tyAdet - sisSatAdet));
    const sinif = izler.length ? izler.join(" · ") : "iz yok";

    tablo.push({
      sku: v.sku, ad: v.product.name,
      adet: adetSuAn, tutar: birim * adetSuAn, sinif,
    });
    console.log("   " + v.sku.slice(0, 18).padEnd(19) +
      String(adetOGun).padStart(7) + String(adetSuAn).padStart(7) +
      String(dosyaAdet).padStart(10) + String(sisSatAdet).padStart(8) +
      String(tyAdet).padStart(9) + " │ " + sinif);
  }

  const izli = tablo.filter((x) => x.sinif !== "iz yok");
  const izsiz = tablo.filter((x) => x.sinif === "iz yok");
  console.log("\n   SATIŞ İZİ BULUNAN : " + String(izli.length).padStart(2) + " / " + tablo.length +
    "  ·  " + t2(izli.reduce((t, x) => t + x.tutar, 0)) + " TL");
  console.log("   AÇIKLANAMAYAN     : " + String(izsiz.length).padStart(2) + " / " + tablo.length +
    "  ·  " + t2(izsiz.reduce((t, x) => t + x.tutar, 0)) + " TL");
  console.log("\n   ⚠ 'Açıklanamayan' SATILMADI DEMEK DEĞİLDİR: HB'nin okuma API'si yok ve");
  console.log("     satış dosyasının kapsamı dar. Kaynak yokluğu, olay yokluğu değildir.");

  console.log("\n   AÇIKLANAMAYANLARIN DÖKÜMÜ (tutara göre):");
  for (const x of [...izsiz].sort((a, b) => b.tutar - a.tutar)) {
    console.log("     " + t2(x.tutar) + "  " + String(x.adet).padStart(3) + " ad  " +
      x.sku.slice(0, 18).padEnd(19) + x.ad.slice(0, 46));
  }

  // ── ③ ROBOROCK — Halil'in ekran kanıtı ─────────────────────────────────
  console.log("\n\n③ ROBOROCK S8 PRO PLUS — HB kanıtı (ekran görüntüsü 27.08)\n");
  console.log("   sipariş " + ROBOROCK.siparisNo + " · takip " + ROBOROCK.takipNo +
    " · stok kodu " + ROBOROCK.hbStokKodu + " · " + ROBOROCK.tutar.toFixed(2) + " TL");

  const sipKod = await p.sale.findFirst({
    where: { code: ROBOROCK.siparisNo },
    select: { id: true, soldAt: true, iptalTarihi: true },
  });
  const sipTakip = await p.sale.findFirst({
    where: { shipmentCode: ROBOROCK.takipNo },
    select: { id: true, code: true, soldAt: true },
  });
  console.log("\n   sipariş no ile   : " + (sipKod
    ? "VAR — " + sipKod.soldAt.toISOString().slice(0, 10) + (sipKod.iptalTarihi ? " ⚠ İPTAL" : "")
    : "⛔ YOK"));
  console.log("   takip no ile     : " + (sipTakip
    ? "VAR — kod=" + (sipTakip.code ?? "—") + " " + sipTakip.soldAt.toISOString().slice(0, 10)
    : "⛔ YOK"));

  const kSku = await p.channelSku.findFirst({
    where: { channelSku: ROBOROCK.hbStokKodu },
    select: {
      variantId: true,
      channelAccount: { select: { name: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });
  console.log("   HB stok kodu     : " + (kSku
    ? "bağlı → " + kSku.variant.sku + " (" + kSku.channelAccount.name + ") — " +
      kSku.variant.product.name.slice(0, 40)
    : "⛔ HİÇBİR VARYANTA BAĞLI DEĞİL"));

  if (kSku) {
    const hrk = await p.stockMovement.findMany({
      where: { variantId: kSku.variantId },
      select: { type: true, quantityDelta: true, occurredAt: true, createdAt: true },
      orderBy: { occurredAt: "asc" },
    });
    console.log("\n   varyantın stok defteri (" + hrk.length + " hareket):");
    for (const h of hrk) {
      console.log("     " + h.occurredAt.toISOString().slice(0, 10) +
        "  " + h.type.padEnd(18) + String(h.quantityDelta).padStart(4) +
        "   (girildi " + h.createdAt.toISOString().slice(0, 16).replace("T", " ") + ")");
    }
    const net = hrk.reduce((t, h) => t + h.quantityDelta, 0);
    const netOGun = hrk.filter((h) => h.occurredAt <= sayim.sayimGunu)
      .reduce((t, h) => t + h.quantityDelta, 0);
    console.log("     → sayım günü " + netOGun + " ad   ·   şu an " + net + " ad");
  }

  const dosyada = dosya.filter((r) => String(r[jSip] ?? "").trim() === ROBOROCK.siparisNo);
  console.log("\n   satış dosyasında : " + dosyada.length + " satır");
  for (const r of dosyada.slice(0, 3)) {
    console.log("     sku=" + String(r[jSku] ?? "—").padEnd(18) +
      " adet=" + String(r[jAdet]) + "  " + String(r[jUrun]).slice(0, 40));
  }

  console.log("\n" + "=".repeat(112));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(112) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
