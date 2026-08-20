/**
 * ============================================================================
 *  K13 — HB SABİT GİDERİNİN FİYAT İÇİNDEKİ PAYI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:k13-pay
 *
 *  ⚠ SALT OKUMA. Yazma bayrağı YOK, `update`/`create` çağrısı YOK.
 *
 *  ── SORU ────────────────────────────────────────────────────────────────
 *  HB ekstresi 20.08.2026'da şunu gösterdi: hesabı kesilmiş 99 siparişin
 *  yalnız 14'ünde ₺12,60 hizmet bedeli kesilmiş (%14). Motorumuz ise HB
 *  satışlarının %100'ünden kesiyor. Kesilen tutar önemsiz (13 satış =
 *  ₺163,80) ama aynı sabit gider **fiyatlama simülasyonuna** giriyor.
 *
 *  Bu ölçüm tek bir soruyu kapatır: **eylül ortasına kadar beklemek bedava
 *  mı?** Ucuz HB ürünlerinde ₺12,60 fiyatın anlamlı bir yüzdesiyse bugün
 *  hayalî maliyetle fiyat kararı veriyoruz demektir.
 *
 *  ── ⚠ DAĞILIMIN GÖVDESİ CEVAP DEĞİL ─────────────────────────────────────
 *  Ortancanın "%0,5 — önemsiz" çıkması BEKLENEN sonuçtur ve soruyu
 *  cevaplamaz. Karar üst kuyrukta: pahalı üründe ₺12,60 gürültü, ucuz
 *  üründe fiyatın yüzdesi. Bu yüzden yüzdelikler ve üst kuyruk ayrı basılır.
 *
 *  ── ⚠ ADLANDIRMA — KOD `SABIT_GIDER` DEĞİL ──────────────────────────────
 *  `SABIT_GIDER` **Trendyol'un** ₺13,19'unun kodudur. HB'deki karşılığının
 *  kodu `HIZMET_BEDELI`. Tutar da koda GÖMÜLMÜYOR: kural veritabanından
 *  okunuyor, çünkü gömülen sayı kural değiştiğinde sessizce eskir.
 *
 *  ── ⚠ FİYAT KAYNAĞI — SİSTEMDE "GÜNCEL SATIŞ FİYATI" ALANI YOK ───────────
 *  Ölçmeden önce arandı: `ProductVariant`, `ChannelSku` ve `Product`
 *  modellerinin hiçbirinde listeleme/satış fiyatı alanı yok. Şemadaki tek
 *  fiyat `SaleItem.unitPriceAmount` — yani GEÇMİŞ bir satışın fiyatı.
 *  Fiyat kartındaki "Fiyat dene" kutusu da bugün `baslangicFiyati={null}`
 *  alıyor; fiyatı kullanıcı elle yazıyor.
 *
 *  Sonuç: hiç satılmamış bir ürünün sistemde fiyatı YOKTUR ve uydurulmaz
 *  (maliyet + varsayılan marj ile üretmek, ölçtüğümüz şeyi kendimizin
 *  yazması olurdu). Onlar AYRI SAYILIR ve beyan edilir.
 *
 *  ── ⚠ İKİ KÜME AYRI, TOPLANMAZ ──────────────────────────────────────────
 *  A) HB'de satılmış  → fiyat HB satışından. Sorunun tam karşılığı.
 *  B) HB'de satılmamış ama başka kanalda satılmış → fiyat oradan. Bu bir
 *     VEKİL fiyattır (aynı ürün kanaldan kanala farklı fiyatlanır) ve bu
 *     yüzden A ile birleştirilmez. Karıştırmak, kapsam boşluğunu ölçüm
 *     diye okumak olurdu.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KANAL = "Hepsiburada";

/** Payın "dikkate değer" sayıldığı sınır — mimar sorusu 20.08.2026. */
const DIKKAT_PAYI = 0.02;

function p2(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function yuzde(n: number): string {
  return (
    "%" +
    (n * 100).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Yüzdelik — SIRALI dizi bekler.
 *
 * ⚠ En yakın sıra (nearest-rank); ara değer üretilmiyor. Ölçüm küçük
 * örneklemde koşuyor ve interpolasyon, veride OLMAYAN bir pay uydururdu.
 */
function yzd(sirali: number[], oran: number): number {
  if (sirali.length === 0) return NaN;
  const i = Math.min(
    sirali.length - 1,
    Math.max(0, Math.ceil(oran * sirali.length) - 1),
  );
  return sirali[i];
}

type Kayit = {
  kimlik: string;
  ad: string;
  fiyat: number;
  pay: number;
  tarih: string;
};

function dagilim(ad: string, kayitlar: Kayit[]) {
  console.log("");
  console.log("  " + ad + " — n=" + kayitlar.length);
  if (kayitlar.length === 0) {
    console.log("    (bu kümede ürün yok — dağılım basılmıyor)");
    return;
  }
  const s = kayitlar.map((k) => k.pay).sort((a, b) => a - b);
  const satir: [string, number][] = [
    ["min", yzd(s, 0)],
    ["%25", yzd(s, 0.25)],
    ["ortanca", yzd(s, 0.5)],
    ["%75", yzd(s, 0.75)],
    ["%90", yzd(s, 0.9)],
    ["%95", yzd(s, 0.95)],
    ["max", s[s.length - 1]],
  ];
  console.log("    " + satir.map(([a]) => a.padStart(10)).join(""));
  console.log("    " + satir.map(([, v]) => yuzde(v).padStart(10)).join(""));

  const baslik =
    "      " +
    "kimlik".padEnd(16) +
    "fiyat".padStart(11) +
    "pay".padStart(11) +
    "  son satış".padEnd(14) +
    "ürün";
  const satirYaz = (k: Kayit) =>
    console.log(
      "      " +
        k.kimlik.padEnd(16) +
        p2(k.fiyat).padStart(11) +
        yuzde(k.pay).padStart(11) +
        "  " +
        k.tarih.padEnd(12) +
        k.ad.slice(0, 42),
    );

  const dikkat = kayitlar.filter((k) => k.pay > DIKKAT_PAYI);
  console.log("");
  console.log(
    "    pay > " +
      yuzde(DIKKAT_PAYI) +
      " olan ürün: " +
      dikkat.length +
      " / " +
      kayitlar.length,
  );
  if (dikkat.length > 0) {
    console.log("    EN YÜKSEK " + Math.min(15, dikkat.length) + ":");
    console.log(baslik);
    for (const k of [...dikkat].sort((a, b) => b.pay - a.pay).slice(0, 15))
      satirYaz(k);
  }

  console.log("");
  console.log("    FİYATI EN DÜŞÜK " + Math.min(10, kayitlar.length) + ":");
  console.log(baslik);
  for (const k of [...kayitlar].sort((a, b) => a.fiyat - b.fiyat).slice(0, 10))
    satirYaz(k);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("K13 — HB SABİT GİDERİNİN FİYAT İÇİNDEKİ PAYI");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — hiçbir şey yazılmaz");
  console.log("");

  // ── KURAL: tutar veritabanından, koda gömülmüyor ──────────────────────
  const kural = await prisma.channelFee.findFirst({
    where: {
      channel: { name: KANAL },
      basis: "FIXED",
      isActive: true,
      amount: { not: null },
    },
    select: { code: true, scope: true, amount: true },
  });
  if (!kural || kural.amount === null) {
    /**
     * ⚠ BOŞ SONUÇ İLE TEMİZ SONUÇ AYRI: kural yoksa "pay %0" DEMİYORUZ,
     * ölçümün hiç koşamadığını söylüyoruz.
     */
    console.log(
      "  ⛔ ÖLÇÜM KOŞMADI — " + KANAL + " kanalında aktif FIXED kesinti kuralı yok.",
    );
    console.log("     Bu 'pay sıfır' demek DEĞİLDİR; ölçülecek tutar bulunamadı.");
    console.log("");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const tutar = Number(kural.amount.toString());
  console.log(
    "  KURAL      " + kural.code + " · " + kural.scope + " · FIXED · ₺" + p2(tutar),
  );
  if (kural.code !== "SABIT_GIDER")
    console.log("             ⚠ kod `SABIT_GIDER` değil — o Trendyol'un ₺13,19'u.");
  console.log("");

  // ── KAPSAM: neyi taradık ──────────────────────────────────────────────
  const toplamVaryant = await prisma.productVariant.count();
  const aktifVaryant = await prisma.productVariant.count({
    where: { isActive: true },
  });

  const hbKodlar = await prisma.channelSku.findMany({
    where: { channelAccount: { channel: { name: KANAL } } },
    select: { variantId: true },
  });
  const hbVaryantId = [...new Set(hbKodlar.map((k) => k.variantId))];

  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: hbVaryantId } },
    select: {
      id: true,
      barcode: true,
      companySku: true,
      sku: true,
      product: { select: { name: true } },
    },
  });

  /**
   * ⚠ FİYAT GEÇMİŞ SATIŞTAN — iptal edilmiş satış fiyat kaynağı değildir.
   * En yeni kalem alınıyor; `soldAt` saat taşımadığı için (H20) aynı güne
   * düşen iki satışta sıralama satışın `createdAt`'iyle tamamlanıyor
   * (`SaleItem`in kendi zaman damgası yok — şemadan doğrulandı).
   */
  const kalemler = await prisma.saleItem.findMany({
    where: { variantId: { in: hbVaryantId }, sale: { iptalTarihi: null } },
    select: {
      variantId: true,
      unitPriceAmount: true,
      sale: {
        select: {
          soldAt: true,
          createdAt: true,
          channelAccount: {
            select: { channel: { select: { name: true } } },
          },
        },
      },
    },
  });

  const enYeni = new Map<string, { fiyat: number; tarih: Date }>();
  const enYeniHB = new Map<string, { fiyat: number; tarih: Date }>();
  for (const k of kalemler) {
    const fiyat = Number(k.unitPriceAmount.toString());
    if (!Number.isFinite(fiyat) || fiyat <= 0) continue;
    const tarih = k.sale.soldAt ?? k.sale.createdAt;
    const mevcut = enYeni.get(k.variantId);
    if (!mevcut || tarih > mevcut.tarih) enYeni.set(k.variantId, { fiyat, tarih });
    if (k.sale.channelAccount?.channel.name === KANAL) {
      const m = enYeniHB.get(k.variantId);
      if (!m || tarih > m.tarih) enYeniHB.set(k.variantId, { fiyat, tarih });
    }
  }

  const g = (d: Date) => d.toISOString().slice(0, 10);
  const kimlikAl = (v: (typeof varyantlar)[number]) =>
    v.barcode ?? v.companySku ?? v.sku;

  const kumeA: Kayit[] = [];
  const kumeB: Kayit[] = [];
  let fiyatsiz = 0;
  const fiyatsizOrnek: string[] = [];

  for (const v of varyantlar) {
    const hb = enYeniHB.get(v.id);
    if (hb) {
      kumeA.push({
        kimlik: kimlikAl(v),
        ad: v.product.name,
        fiyat: hb.fiyat,
        pay: tutar / hb.fiyat,
        tarih: g(hb.tarih),
      });
      continue;
    }
    const her = enYeni.get(v.id);
    if (her) {
      kumeB.push({
        kimlik: kimlikAl(v),
        ad: v.product.name,
        fiyat: her.fiyat,
        pay: tutar / her.fiyat,
        tarih: g(her.tarih),
      });
      continue;
    }
    fiyatsiz++;
    if (fiyatsizOrnek.length < 8)
      fiyatsizOrnek.push(kimlikAl(v) + "  " + v.product.name.slice(0, 40));
  }

  console.log("  KAPSAM — NEYİ TARADIK");
  console.log(
    "    ürün varyantı (toplam)             " +
      toplamVaryant +
      "   (aktif " +
      aktifVaryant +
      ")",
  );
  console.log(
    "    " + KANAL + " kanal SKU eşleşmesi        " + hbVaryantId.length + " varyant",
  );
  console.log("      ├─ HB satış fiyatı olan          " + kumeA.length + "   → KÜME A");
  console.log(
    "      ├─ yalnız başka kanalda satılmış " + kumeB.length + "   → KÜME B (vekil)",
  );
  console.log(
    "      └─ HİÇ FİYATI OLMAYAN            " + fiyatsiz + "   → paya DAHİL DEĞİL",
  );
  console.log("");
  if (fiyatsiz > 0) {
    console.log("    ⚠ FİYATSIZ ÜRÜN PAYA GİRMEZ — sistemde listeleme fiyatı alanı yok,");
    console.log("      hiç satılmamış ürünün fiyatı da yok. Maliyet+marj ile üretmek");
    console.log("      ölçtüğümüz şeyi kendimizin yazması olurdu. Örnekler:");
    for (const o of fiyatsizOrnek) console.log("        " + o);
    console.log("");
  }
  const gorulen = kumeA.length + kumeB.length;
  console.log(
    "    ⚠ KAPSAM SINIRI: bu ölçüm HB ürünlerinin " +
      (hbVaryantId.length > 0
        ? Math.round((gorulen / hbVaryantId.length) * 100)
        : 0) +
      "%'ini görüyor (" +
      gorulen +
      "/" +
      hbVaryantId.length +
      ").",
  );

  /**
   * ── FİYATSIZ 96% İÇİN SINIR — UYDURMADAN ────────────────────────────────
   *
   * ⚠ Ölçüm HB ürünlerinin küçük bir kısmını görüyor ve görülmeyen kısım
   * hakkında susmak da bir cevap DEĞİL: "kuyruğu göremedim" demek, kuyruğun
   * olmadığını göstermez.
   *
   * Fiyat uydurmadan SINIR çizilebilir. Pay ancak fiyat şu eşiğin ALTINDAysa
   * dikkat sınırını geçer:
   *
   *     pay > %2  ⟺  fiyat < 12,60 / 0,02 = ₺630
   *
   * Ve bir ürün MALİYETİNİN altına satılmaz. Yani birim maliyeti ₺630'un
   * ÜSTÜNDE olan bir ürün, fiyatı bilinmese bile bu sınırı GEÇEMEZ.
   *
   * ⚠ BU BİR TAHMİN DEĞİL, ÜST SINIR. Maliyeti eşiğin altında olan ürünlerin
   * payı yüksek ÇIKACAK demiyoruz; yalnız "çıkabilecek olanlar en fazla
   * bunlar" diyoruz. Maliyeti hiç olmayan ürün de ayrı sayılıyor — onlar
   * hakkında sınır bile çizilemez.
   */
  const fiyatEsigi = tutar / DIKKAT_PAYI;
  const fiyatsizId = varyantlar
    .filter((v) => !enYeni.has(v.id))
    .map((v) => v.id);
  const alimlar = await prisma.purchaseItem.findMany({
    where: { variantId: { in: fiyatsizId } },
    select: { variantId: true, unitCostAmount: true },
  });
  const enUcuzMaliyet = new Map<string, number>();
  for (const a of alimlar) {
    const m = Number(a.unitCostAmount.toString());
    if (!Number.isFinite(m) || m <= 0) continue;
    const v = enUcuzMaliyet.get(a.variantId);
    if (v === undefined || m < v) enUcuzMaliyet.set(a.variantId, m);
  }
  const maliyetsiz = fiyatsizId.filter((id) => !enUcuzMaliyet.has(id)).length;
  const esikAlti = [...enUcuzMaliyet.entries()].filter(([, m]) => m < fiyatEsigi);

  console.log("");
  console.log("  GÖRÜLMEYEN " + fiyatsizId.length + " ÜRÜN İÇİN ÜST SINIR");
  console.log(
    "    pay > " + yuzde(DIKKAT_PAYI) + " olması için fiyat < ₺" + p2(fiyatEsigi) +
      " olmalı.",
  );
  console.log("    Ürün maliyetinin altına satılmaz; maliyeti bu eşiğin ÜSTÜNDE");
  console.log("    olan ürün, fiyatı bilinmese de sınırı geçemez.");
  console.log("");
  console.log(
    "      birim maliyeti < ₺" + p2(fiyatEsigi) + "  → " + esikAlti.length +
      "   (sınırı geçebilecek EN FAZLA bu kadar ürün)",
  );
  console.log(
    "      birim maliyeti ≥ ₺" + p2(fiyatEsigi) + "  → " +
      (enUcuzMaliyet.size - esikAlti.length) + "   (geçmesi imkânsız)",
  );
  console.log(
    "      alım kaydı hiç olmayan     → " + maliyetsiz +
      "   (⚠ sınır bile çizilemiyor)",
  );
  /**
   * ⚠ SON ÇERÇEVE — "kaç ürünü göremedim" ile "kaç ürün hakkında konuşmak
   * ANLAMLI" ayrı sorular. Ne alımı ne satışı olan bir kanal SKU'su bir
   * katalog satırıdır; bugün onun için fiyat kararı verilmiyor.
   */
  const ticari = kumeA.length + kumeB.length + enUcuzMaliyet.size;
  console.log("");
  console.log(
    "    TİCARİ HAREKETİ OLAN HB ÜRÜNÜ: " + ticari + " / " + hbVaryantId.length +
      "  (alımı ya da satışı var)",
  );
  console.log(
    "    Kalan " + (hbVaryantId.length - ticari) +
      " satır ne alınmış ne satılmış — katalog kaydı.",
  );

  dagilim("KÜME A — HB'de satılmış (sorunun tam karşılığı)", kumeA);
  dagilim("KÜME B — VEKİL fiyat: başka kanalın son satışı", kumeB);

  console.log("");
  console.log("  (sabit gider ₺" + p2(tutar) + " — kural veritabanından okundu)");
  console.log("  ⚠ HÜKÜM VERİLMEDİ — bu ölçüm karar için; karar mimarın.");
  console.log("");

  await prisma.$disconnect();
}

main();
