import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { kapanisVerisi } from "../src/lib/sayim/kapanis-verisi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SAYIM EKSİKLERİNİN TEŞHİSİ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:eksik-teshis -- --sayim=sayim-20260827-2
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Tek `prisma.*.create/update/delete` çağrısı yok.
 *
 *  ⚠ NİYE: sayımın "eksik" dediği 19 ürün için iki apayrı hipotez var ve
 *  ikisi ZITTIR:
 *    · GERÇEK KAYIP        → sayım farkı yazılır, maliyet GERÇEK NET'ten düşer
 *    · GİRİLMEMİŞ SATIŞ    → satış girilir; sayım farkı yazmak SAHTE KAYIP olur
 *
 *  LEGO "Yukarı Bak" vakası ikincisini gösterdi: satış dosyasında **44 satır**
 *  var, sistemde **6 SALE_OUT**. Dosya `5702017424842` kodunu kullanıyor,
 *  sistemdeki kayıt `5702017866932` taşıyor — aynı ürün İKİ KAYDA bölünmüş.
 *
 *  ⛔ VE BU, §3.1'İN MAKİNE TARAFI: kural _"mevcut kayda kod tanıt, yeni ürün
 *  açma"_ insan için yazılmıştı; içe aktarma da aynı tuzağa düşüyor.
 *  **Kural, yazan taraf kim olursa olsun geçerlidir — makine de kullanıcıdır.**
 *
 *  ⚠ HÜKÜM VERİLMEZ, AYRIM YAPILIR. Ayrılamayan satır "BELİRSİZ" yazılır;
 *  "muhtemelen satıştır" demek, ölçmediğimiz bir şeyi iddia etmek olurdu.
 * ============================================================================
 */

const sayimArg = process.argv.find((a) => a.startsWith("--sayim="));
const SAYIM_KODU = sayimArg?.slice("--sayim=".length) ?? "sayim-20260827-2";
const DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

/** Türkçe-güvenli anahtar — büyük/küçük ve aksan farkını siler. */
const anah = (s: unknown) =>
  String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]/g, "");

/** Ürün adının ayırt edici çekirdeği — marka/seri gürültüsü atılır. */
function cekirdek(ad: string): string {
  return anah(ad).replace(/^(lego|philips|karaca|braun|emsan)/, "").slice(0, 22);
}

type DosyaSatiri = { sku: string; barkod: string; urun: string; adet: number; tarih: string };

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const sayim = await p.stokSayimi.findFirst({
    where: { kod: SAYIM_KODU },
    select: { id: true },
  });
  if (!sayim) {
    console.log("\n⛔ SAYIM BULUNAMADI: " + SAYIM_KODU + "\n");
    process.exitCode = 1;
    return;
  }
  const veri = await kapanisVerisi(p as never, sayim.id);
  if (!veri) return;

  // ── Satış dosyasını oku ───────────────────────────────────────────────
  const ham = readFileSync(DOSYA);
  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar.find((s) => anah(s.sheet) === anah("SATIŞ"))!;
  const bas = sayfa.data[5].map((h) => String(h ?? "").trim());
  const iSku = bas.indexOf("SKU");
  const iBar = bas.indexOf("AXCALI BARKOD");
  const iUrun = bas.indexOf("Ürün");
  const iAdet = bas.indexOf("Satış Miktarı");
  const iTar = bas.indexOf("Tarih");

  const dosya: DosyaSatiri[] = sayfa.data.slice(6)
    .filter((r) => String(r[iUrun] ?? "").trim() !== "")
    .map((r) => ({
      sku: String(r[iSku] ?? "").trim(),
      barkod: String(r[iBar] ?? "").trim(),
      urun: String(r[iUrun] ?? "").trim(),
      adet: Number(r[iAdet] ?? 0),
      tarih: r[iTar] instanceof Date ? (r[iTar] as Date).toISOString().slice(0, 10) : "",
    }));

  console.log("\n" + "=".repeat(100));
  console.log("SAYIM EKSİKLERİNİN TEŞHİSİ — " + SAYIM_KODU + " · SALT OKUMA");
  console.log("=".repeat(100));
  console.log("\n   satış dosyası: " + dosya.length + " satır · eksik kova: " + veri.eksik.length + " ürün");

  // ═══ ① EKSİK BAŞINA: dosya ↔ sistem ══════════════════════════════════
  console.log("\n\n① EKSİK BAŞINA — dosyada var mı, sistemde kaç tane işlendi\n");
  console.log("   SKU              sistem  raf  fark │ dosya  sisSAT  DOSYADA-FAZLA │ TEŞHİS");
  console.log("   " + "─".repeat(96));

  type Satir = { sku: string; ad: string; fark: number; dosyaAdet: number; sisSat: number; teshis: string };
  const tablo: Satir[] = [];

  for (const e of veri.eksik) {
    const cek = cekirdek(e.urunAdi);
    /**
     * ⚠ EŞLEŞME ÜÇ YOLDAN: sistemdeki barkod · Firma SKU · ürün adı çekirdeği.
     * Dosya bazen barkodu `SKU` sütununa yazıyor (ölçüldü), bu yüzden iki
     * sütun da taranıyor.
     */
    const varyant = await p.productVariant.findUnique({
      where: { id: e.variantId },
      select: { barcode: true, companySku: true, channelSkus: { select: { channelSku: true } } },
    });
    const kodlar = new Set(
      [varyant?.barcode, varyant?.companySku, e.sku, ...(varyant?.channelSkus ?? []).map((k) => k.channelSku)]
        .filter((k): k is string => !!k && k.trim() !== "")
        .map((k) => k.trim()),
    );

    const eslesen = dosya.filter(
      (d) =>
        kodlar.has(d.sku) ||
        kodlar.has(d.barkod) ||
        (cek.length >= 10 && cekirdek(d.urun).includes(cek.slice(0, 12))),
    );
    const dosyaAdet = eslesen.reduce((t, d) => t + d.adet, 0);

    const sisSat = await p.stockMovement.aggregate({
      where: { variantId: e.variantId, type: "SALE_OUT" },
      _sum: { quantityDelta: true },
    });
    const sisSatAdet = Math.abs(sisSat._sum.quantityDelta ?? 0);
    const dosyadaFazla = dosyaAdet - sisSatAdet;
    const fark = Math.abs(e.hal.fark ?? 0);

    /**
     * ⛔ TEŞHİS ÖLÇÜTÜ — ve GEVŞETİLMEDİ:
     *   `dosyadaFazla >= fark`  → dosyada bu eksiği KARŞILAYACAK kadar
     *                             işlenmemiş satış var → GİRİLMEMİŞ SATIŞ
     *   `dosyadaFazla <= 0`     → dosyada işlenmemiş satış yok → KAYIP
     *   arası                   → BELİRSİZ (kısmen açıklanıyor)
     * "Muhtemelen satıştır" demek ölçmediğimiz şeyi iddia etmek olurdu.
     */
    const teshis =
      dosyadaFazla >= fark ? "GİRİLMEMİŞ SATIŞ" : dosyadaFazla <= 0 ? "KAYIP?" : "BELİRSİZ";

    tablo.push({ sku: e.sku, ad: e.urunAdi, fark, dosyaAdet, sisSat: sisSatAdet, teshis });
    console.log(
      "   " + e.sku.slice(0, 16).padEnd(17) +
        String(e.sistemAdedi).padStart(6) + String(e.sayilanAdet ?? 0).padStart(5) +
        String(-fark).padStart(6) + " │" +
        String(dosyaAdet).padStart(6) + String(sisSatAdet).padStart(8) +
        String(dosyadaFazla).padStart(15) + " │ " + teshis,
    );
  }

  const say = (t: string) => tablo.filter((x) => x.teshis === t);
  console.log("\n   ÖZET: girilmemiş satış " + say("GİRİLMEMİŞ SATIŞ").length +
    " · belirsiz " + say("BELİRSİZ").length + " · kayıp? " + say("KAYIP?").length +
    "   (toplam " + tablo.length + ")");
  console.log("   adet: girilmemiş " + say("GİRİLMEMİŞ SATIŞ").reduce((t, x) => t + x.fark, 0) +
    " · belirsiz " + say("BELİRSİZ").reduce((t, x) => t + x.fark, 0) +
    " · kayıp? " + say("KAYIP?").reduce((t, x) => t + x.fark, 0));

  // ═══ ② İKİZ KAYIT TARAMASI ═══════════════════════════════════════════
  console.log("\n\n② İKİZ KAYIT — aynı ürün iki kayda bölünmüş mü\n");
  console.log("   ⚠ AD BENZERLİĞİ KANIT DEĞİLDİR — barkodlar da basılıyor, karar okuyanın.\n");
  const hepsi = await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, product: { select: { name: true } } },
  });
  let ikizli = 0;
  for (const e of veri.eksik) {
    const cek = cekirdek(e.urunAdi);
    if (cek.length < 10) continue;
    const ikizler = hepsi.filter(
      (v) => v.id !== e.variantId && cekirdek(v.product.name).includes(cek.slice(0, 12)),
    );
    if (!ikizler.length) continue;
    ikizli++;
    const kendi = hepsi.find((v) => v.id === e.variantId);
    console.log("   ● " + e.sku.padEnd(18) + "barkod=" + String(kendi?.barcode ?? "—").padEnd(16) +
      e.urunAdi.slice(0, 40));
    for (const ik of ikizler) {
      const al = await p.purchaseItem.aggregate({ where: { variantId: ik.id }, _sum: { quantity: true } });
      const sa = await p.saleItem.aggregate({
        where: { variantId: ik.id, sale: { iptalTarihi: null } }, _sum: { quantity: true },
      });
      console.log("     ↳ " + ik.sku.padEnd(18) + "barkod=" + String(ik.barcode ?? "—").padEnd(16) +
        "alım " + String(al._sum.quantity ?? 0).padStart(3) +
        " · satış " + String(sa._sum.quantity ?? 0).padStart(3) + "  " + ik.product.name.slice(0, 32));
    }
  }
  if (ikizli === 0) console.log("   (ikiz bulunamadı)");

  // ═══ ③ EŞLEŞMEYEN SATIŞ SATIRLARI — kapsam ═══════════════════════════
  console.log("\n\n③ SATIŞ DOSYASI ↔ SİSTEM — genel eşleşme kapsamı\n");
  const tumKodlar = new Map<string, string>();
  for (const v of await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } } },
  })) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") tumKodlar.set(k.trim(), v.id);
    }
  }
  const eslesmeyen = dosya.filter((d) => !tumKodlar.has(d.sku) && !tumKodlar.has(d.barkod));
  console.log("   dosya satırı                 " + String(dosya.length).padStart(6));
  console.log("   kimlikle EŞLEŞEN             " + String(dosya.length - eslesmeyen.length).padStart(6));
  console.log("   EŞLEŞMEYEN                   " + String(eslesmeyen.length).padStart(6) +
    "   (" + eslesmeyen.reduce((t, d) => t + d.adet, 0) + " adet)");

  /** Eşleşmeyenler hangi kod biçiminde — desen var mı? */
  const bicim = new Map<string, number>();
  for (const d of eslesmeyen) {
    const k = d.sku === "" ? "(SKU boş)" : /^\d{13}$/.test(d.sku) ? "13 haneli (EAN)"
      : /^HBCV/.test(d.sku) ? "HBCV… (HB)" : /^[a-z]+$/i.test(d.sku) ? "harf (kanal adı)" : "diğer";
    bicim.set(k, (bicim.get(k) ?? 0) + 1);
  }
  console.log("\n   EŞLEŞMEYENLERİN KOD BİÇİMİ:");
  for (const [k, n] of [...bicim.entries()].sort((a, b) => b[1] - a[1])) {
    console.log("     " + k.padEnd(20) + String(n).padStart(5));
  }

  const eksikKimlikleri = new Set(veri.eksik.map((e) => e.sku));
  const eksigeAit = eslesmeyen.filter((d) =>
    veri.eksik.some((e) => cekirdek(e.urunAdi).length >= 10 &&
      cekirdek(d.urun).includes(cekirdek(e.urunAdi).slice(0, 12))));
  console.log("\n   bu 19 eksik ürüne ait eşleşmeyen satır: " + eksigeAit.length +
    "  (" + eksigeAit.reduce((t, d) => t + d.adet, 0) + " adet)");
  console.log("   eksik kimlik sayısı: " + eksikKimlikleri.size);

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. Sayım açık.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
