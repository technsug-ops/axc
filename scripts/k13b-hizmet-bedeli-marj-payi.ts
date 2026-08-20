/**
 * ============================================================================
 *  K13b — HIZMET_BEDELI'NİN MARJ İÇİNDEKİ PAYI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:k13b-marj
 *
 *  ⚠ SALT OKUMA. Yazma bayrağı YOK, `update`/`create` çağrısı YOK.
 *
 *  ── NİYE VAR: K13'ÜN PAYDASI YANLIŞTI ───────────────────────────────────
 *  K13 ₺12,60'ı FİYATA oranladı ve "%0,3 — önemsiz" çıktı. Ama ₺12,60'ın
 *  bozduğu karar **fiyat kararı değil, MARJ kararıdır.** Aynı ₺12,60
 *  fiyatın binde 5'i olurken marjın onda biri olabilir.
 *
 *  ⚠ EŞİK YOK. K13'teki %2 (ve ondan türeyen ₺630 sınırı) veriden
 *  gelmiyordu, soruyu soran koymuştu. Burada eşik KONMUYOR: yalnız dağılım
 *  basılıyor. Kaynağı olmayan eşik, üstüne kurulan bütün sınırlamaları da
 *  dayanaksız yapar.
 *
 *  ── MARJ NEREDEN — KENDİ MOTORUMUZDAN, BAKARAK ──────────────────────────
 *  Elle "fiyat − maliyet" yazmadık. Fiyat kartındaki "Fiyat dene" hangi
 *  hesabı koşuyorsa bu betik de ONU koşuyor: `simulasyonZeminleri` +
 *  `simulasyonKur` → **NET-2**. Böylece ölçtüğümüz marj, kullanıcının
 *  ekranda gördüğü marjla aynı motordan çıkıyor.
 *
 *  Kartın davranışı VARSAYILMADI, koda bakıldı (`fiyat-dene.tsx:245`):
 *  kart `kargoTarifesi: null` geçiyor — yani kartın marjı kargoyu İÇERMEZ.
 *  Burada da null geçiliyor ki iki rakam aynı şeyi ölçsün. Maliyet de
 *  kartın kullandığı kaynaktan: açık partilerin ağırlıklı ortalaması
 *  (`agirlikliOrtalama`, kopyası değil kendisi).
 *
 *  ── İKİ PAY BASILIYOR, İKİSİ FARKLI SORU ────────────────────────────────
 *  1. `12,60 / NET-2` — mimarın istediği oran, doğrudan.
 *  2. `(NET-2 kuralsız − NET-2) / NET-2 kuralsız` — kuralı motordan
 *     ÇIKARIP yeniden koşarak ölçülen GERÇEK etki.
 *  İkisi eşit ÇIKMAZ: ₺12,60 KDV dahil bir bedel ve motor KDV'yi
 *  mahsuplaştırıyor. Farkı görmek, "12,60 aynen NET'ten düşülüyor"
 *  varsayımını sınar.
 *
 *  ── SIFIRA/NEGATİFE BÖLÜNMEZ ────────────────────────────────────────────
 *  Marjı ≤ 0 olan ürün orana KARIŞTIRILMAZ: bölüm saçma büyük bir sayı
 *  üretir ve kuyruk sanılır. Ayrı sayılır ve listelenir.
 *  Fiyatı maliyetinin altında olan ürün de ayrı raporlanır — bu bir VERİ
 *  BULGUSUDUR, düzeltilmez; imkânsız görünen değer önce doğrulanır.
 *
 *  ── KÜMELER TOPLANMAZ ───────────────────────────────────────────────────
 *  K13'teki ayrım korunuyor: A = HB'de satılmış (fiyat HB'den),
 *  B = yalnız başka kanalda satılmış (VEKİL fiyat). Aynı ürün kanaldan
 *  kanala farklı fiyatlanır; birleştirmek kapsam boşluğunu ölçüm sanmaktır.
 * ============================================================================
 */

import { simulasyonKur } from "../src/lib/fiyatlama/simulasyon";
import {
  simulasyonZeminleri,
  varyantKdvOrani,
} from "../src/lib/fiyatlama/kart-verisi";
import { agirlikliOrtalama } from "../src/lib/urun-karti";
import { acikPartilerToplu } from "../src/lib/stok";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KANAL = "Hepsiburada";
const KURAL_KODU = "HIZMET_BEDELI";

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

/** Yüzdelik — SIRALI dizi; en yakın sıra, ara değer uydurulmuyor. */
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
  maliyet: number;
  marj: number;
  pay: number;
  /** Kuralı motordan çıkarıp ölçülen gerçek etki. */
  gercekPay: number | null;
};

function dagilim(ad: string, kayitlar: Kayit[]) {
  console.log("");
  console.log("  " + ad + " — n=" + kayitlar.length);
  if (kayitlar.length === 0) {
    console.log("    (bu kümede oranlanabilir ürün yok — dağılım basılmıyor)");
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

  console.log("");
  console.log("    EN YÜKSEK PAYLI " + Math.min(10, kayitlar.length) + ":");
  console.log(
    "      " +
      "kimlik".padEnd(15) +
      "fiyat".padStart(10) +
      "maliyet".padStart(10) +
      "marj".padStart(10) +
      "pay".padStart(9) +
      "gerçek".padStart(9) +
      "  ürün",
  );
  for (const k of [...kayitlar].sort((a, b) => b.pay - a.pay).slice(0, 10))
    console.log(
      "      " +
        k.kimlik.padEnd(15) +
        p2(k.fiyat).padStart(10) +
        p2(k.maliyet).padStart(10) +
        p2(k.marj).padStart(10) +
        yuzde(k.pay).padStart(9) +
        (k.gercekPay === null ? "—" : yuzde(k.gercekPay)).padStart(9) +
        "  " +
        k.ad.slice(0, 38),
    );
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
  console.log("K13b — HIZMET_BEDELI'NİN MARJ İÇİNDEKİ PAYI");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  ⚠ EŞİK YOK — yalnız dağılım. Hüküm mimarın.");
  console.log("");

  const kural = await prisma.channelFee.findFirst({
    where: { channel: { name: KANAL }, code: KURAL_KODU, isActive: true },
    select: { code: true, scope: true, basis: true, amount: true },
  });
  if (!kural || kural.amount === null) {
    console.log("  ⛔ ÖLÇÜM KOŞMADI — " + KANAL + "/" + KURAL_KODU + " kuralı yok.");
    console.log("     Bu 'pay sıfır' DEĞİL; ölçülecek tutar bulunamadı.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const tutar = Number(kural.amount.toString());
  console.log(
    "  KURAL      " + kural.code + " · " + kural.scope + " · " + kural.basis +
      " · ₺" + p2(tutar),
  );
  console.log("  MARJ       NET-2 — fiyat kartıyla AYNI motor");
  console.log("             (simulasyonZeminleri + simulasyonKur)");
  console.log("             ⚠ kargo HARİÇ: kart da `kargoTarifesi: null` geçiyor");
  console.log("             ⚠ maliyet = açık partilerin ağırlıklı ortalaması");
  console.log("");

  // ── TARAFLAR AYRI SAYILIR ─────────────────────────────────────────────
  const hbKodlar = await prisma.channelSku.findMany({
    where: { channelAccount: { channel: { name: KANAL } } },
    select: { variantId: true, channelAccountId: true },
  });
  const hbId = [...new Set(hbKodlar.map((k) => k.variantId))];
  /**
   * ⚠ ZEMİN KİMLİKLE EŞLEŞTİRİLİR, ADLA DEĞİL.
   * `SimulasyonZemini.kanalAdi` "Hepsiburada — HesapAdı" biçiminde
   * üretiliyor (`kart-verisi.ts:105`). İlk sürüm `kanalAdi === "Hepsiburada"`
   * diye baktı ve HİÇBİR zemin bulamadı — sessiz sıfır. Ad bir etikettir;
   * eşleştirme `channelAccountId` üzerinden yapılır.
   */
  const hbHesapId = new Set(hbKodlar.map((k) => k.channelAccountId));

  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: hbId } },
    select: {
      id: true,
      barcode: true,
      companySku: true,
      sku: true,
      product: { select: { name: true } },
    },
  });

  const kalemler = await prisma.saleItem.findMany({
    where: { variantId: { in: hbId }, sale: { iptalTarihi: null } },
    select: {
      variantId: true,
      unitPriceAmount: true,
      sale: {
        select: {
          soldAt: true,
          createdAt: true,
          channelAccount: { select: { channel: { select: { name: true } } } },
        },
      },
    },
  });

  const fiyatHer = new Map<string, { fiyat: number; tarih: Date }>();
  const fiyatHB = new Map<string, { fiyat: number; tarih: Date }>();
  for (const k of kalemler) {
    const fiyat = Number(k.unitPriceAmount.toString());
    if (!Number.isFinite(fiyat) || fiyat <= 0) continue;
    const tarih = k.sale.soldAt ?? k.sale.createdAt;
    const m = fiyatHer.get(k.variantId);
    if (!m || tarih > m.tarih) fiyatHer.set(k.variantId, { fiyat, tarih });
    if (k.sale.channelAccount?.channel.name === KANAL) {
      const h = fiyatHB.get(k.variantId);
      if (!h || tarih > h.tarih) fiyatHB.set(k.variantId, { fiyat, tarih });
    }
  }

  const partiler = await acikPartilerToplu(prisma, hbId);
  const maliyet = new Map<string, number>();
  for (const id of hbId) {
    /**
     * ⚠ `Parti.birimMaliyet` Decimal STRING taşır (float'a çevrilmesin
     * diye). `agirlikliOrtalama` sayı bekliyor; dönüşüm burada, tek yerde.
     */
    const m = agirlikliOrtalama(
      (partiler.get(id) ?? []).map((x) => ({
        kalanAdet: x.kalanAdet,
        birimMaliyet: x.birimMaliyet === null ? null : Number(x.birimMaliyet),
      })),
    );
    if (m !== null && m > 0) maliyet.set(id, m);
  }

  const fiyatliId = new Set(fiyatHer.keys());
  const kesisim = [...fiyatliId].filter((id) => maliyet.has(id));

  /**
   * ⚠ BOŞ SONUÇ ≠ TEMİZ SONUÇ. Kesişim küçükse hangi tarafın daralttığı
   * yazılır; "veri yok" tek başına hüküm değildir.
   */
  console.log("  KESİŞİM — İLK SATIR");
  console.log("    HB kanal SKU'lu varyant          " + hbId.length);
  console.log("    fiyatı olan                      " + fiyatliId.size);
  console.log("    birim maliyeti olan (açık parti) " + maliyet.size);
  console.log("    ►► İKİSİ DE OLAN                 " + kesisim.length);
  console.log("");
  console.log(
    "    daraltan taraf: fiyatı olup maliyeti olmayan " +
      [...fiyatliId].filter((id) => !maliyet.has(id)).length +
      " · maliyeti olup fiyatı olmayan " +
      [...maliyet.keys()].filter((id) => !fiyatliId.has(id)).length,
  );
  console.log(
    "    ⚠ maliyet AÇIK PARTİDEN gelir: tükenmiş ürünün alım geçmişi olsa",
  );
  console.log("      da açık partisi yoktur ve buraya giremez.");

  if (kesisim.length === 0) {
    console.log("");
    console.log("  ⛔ KESİŞİM BOŞ — bu 'marj payı sıfır' DEĞİL, ölçüm koşamadı.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ── ÖLÇÜM ─────────────────────────────────────────────────────────────
  /**
   * ⚠ KART NE GEÇİYORSA O — koda bakıldı (`kart/[variantId]/page.tsx:117`):
   * `simulasyonZeminleri(variantId, new Date())`. İş takvimi gününe
   * çevirmek "daha doğru" görünürdü ama ekrandakinden BAŞKA bir zemin
   * seçebilirdi; ölçülen marj o zaman kullanıcının gördüğü marj olmazdı.
   */
  const bugun = new Date();
  const bilgi = new Map(varyantlar.map((v) => [v.id, v]));
  const kimlikAl = (v: (typeof varyantlar)[number]) =>
    v.barcode ?? v.companySku ?? v.sku;

  const kumeA: Kayit[] = [];
  const kumeB: Kayit[] = [];
  const marjSifir: string[] = [];
  const fiyatDusuk: string[] = [];
  /**
   * ⚠ İKİ AYRI SEBEP, İKİ AYRI SAYAÇ. İlk sürüm ikisini tek sepete attı ve
   * "29 kalem hesaplanamadı" dedi — hangisinin neden düştüğü kayboldu.
   */
  let zeminYok = 0;
  let net2Yok = 0;
  const net2YokSebep = new Map<string, number>();

  for (const id of kesisim) {
    const v = bilgi.get(id);
    if (!v) continue;
    const hb = fiyatHB.get(id);
    const fiyat = (hb ?? fiyatHer.get(id))!.fiyat;
    const birimMaliyet = maliyet.get(id)!;
    const kimlik = kimlikAl(v);
    const ad = v.product.name;

    /**
     * ⚠ FİYAT < MALİYET — AYRI RAPORLANIR, DÜZELTİLMEZ.
     * Gerçek olabilir (kupon/hediye alımı vakası 19.08). Hüküm vermek
     * yerine baktırıyoruz.
     */
    if (fiyat < birimMaliyet)
      fiyatDusuk.push(
        kimlik.padEnd(15) + "fiyat " + p2(fiyat).padStart(10) +
          "  maliyet " + p2(birimMaliyet).padStart(10) + "  " + ad.slice(0, 38),
      );

    const zeminler = await simulasyonZeminleri(id, bugun);
    const zemin = zeminler.find((z) => hbHesapId.has(z.channelAccountId));
    if (!zemin) {
      zeminYok++;
      continue;
    }
    const kdvOrani = await varyantKdvOrani(id);

    const ortak = {
      hedefFiyat: fiyat,
      adet: 1,
      birimMaliyet,
      kdvOrani,
      paraBirimi: "TRY" as const,
      dilimler: zemin.dilimler,
      pencereBitis: zemin.pencereBitis,
      tekOran: zemin.tekOran,
      komisyonKdvOrani: zemin.komisyonKdvOrani,
      /** ⚠ kart da null geçiyor — koda bakıldı, varsayılmadı. */
      kargoTarifesi: null,
      bugun,
    };
    const ile = simulasyonKur({ ...ortak, siparisKesintileri: zemin.siparisKesintileri });
    const siz = simulasyonKur({
      ...ortak,
      siparisKesintileri: zemin.siparisKesintileri.filter((k) => k.code !== KURAL_KODU),
    });

    if (ile.net2 === null) {
      net2Yok++;
      /** Motor niye hesaplayamadığını zaten beyan ediyor — onu sayıyoruz. */
      for (const b of ile.beyanlar)
        net2YokSebep.set(b.tur, (net2YokSebep.get(b.tur) ?? 0) + 1);
      continue;
    }
    const marj = ile.net2;

    /** ⚠ SIFIRA/NEGATİFE BÖLÜNMEZ — ayrı sayılır, orana girmez. */
    if (marj <= 0) {
      marjSifir.push(
        kimlik.padEnd(15) + "fiyat " + p2(fiyat).padStart(10) +
          "  maliyet " + p2(birimMaliyet).padStart(10) +
          "  NET-2 " + p2(marj).padStart(10) + "  " + ad.slice(0, 34),
      );
      continue;
    }

    const gercekPay =
      siz.net2 !== null && siz.net2 > 0 ? (siz.net2 - marj) / siz.net2 : null;

    const kayit: Kayit = {
      kimlik, ad, fiyat, maliyet: birimMaliyet, marj,
      pay: tutar / marj, gercekPay,
    };
    if (hb) kumeA.push(kayit);
    else kumeB.push(kayit);
  }

  console.log("");
  console.log("  ORANA GİRMEYENLER — ayrı sayıldı");
  console.log("    marj ≤ 0            " + marjSifir.length);
  console.log("    HB zemini bulunamadı " + zeminYok + "  (aktif/satışa açık HB kaydı yok)");
  console.log(
    "    NET-2 hesaplanamadı  " + net2Yok +
      (net2YokSebep.size
        ? "  → motorun beyanı: " +
          [...net2YokSebep].map(([a, n]) => a + "×" + n).join(" · ")
        : ""),
  );
  console.log("    fiyat < maliyet     " + fiyatDusuk.length + "  ⚠ VERİ BULGUSU");

  if (marjSifir.length > 0) {
    console.log("");
    console.log("    MARJ ≤ 0 OLANLAR (orana karıştırılmadı):");
    for (const r of marjSifir.slice(0, 20)) console.log("      " + r);
    if (marjSifir.length > 20)
      console.log("      … +" + (marjSifir.length - 20) + " satır");
  }

  if (fiyatDusuk.length > 0) {
    console.log("");
    console.log("    ⚠ FİYAT < MALİYET — DÜZELTİLMEDİ, DOĞRULANMASI İSTENİR:");
    console.log("      (imkânsız görünen değer gerçek çıkabilir — kupon/hediye");
    console.log("       alımı vakası 19.08. Önce bakılır, sonra karar verilir.)");
    for (const r of fiyatDusuk.slice(0, 20)) console.log("      " + r);
    if (fiyatDusuk.length > 20)
      console.log("      … +" + (fiyatDusuk.length - 20) + " satır");
  }

  dagilim("KÜME A — HB'de satılmış (sorunun tam karşılığı)", kumeA);
  dagilim("KÜME B — VEKİL fiyat: başka kanalın son satışı", kumeB);

  console.log("");
  console.log("  `pay`    = ₺" + p2(tutar) + " / NET-2");
  console.log("  `gerçek` = kural motordan ÇIKARILIP yeniden koşuldu:");
  console.log("             (NET-2 kuralsız − NET-2) / NET-2 kuralsız");
  console.log("             İkisi eşit değilse sebep KDV mahsubudur.");
  console.log("  ⚠ EŞİK KONMADI, HÜKÜM VERİLMEDİ — karar mimarın.");
  console.log("");

  await prisma.$disconnect();
}

main();
