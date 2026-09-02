/**
 * ============================================================================
 *  SAYIM FAZLASI — MALİYET ATAMASI KONTROL LİSTESİ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:sayim-fazlasi
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 29.08 fiziksel sayımında ARTI yönde açılan
 *  partilerin maliyet atamasını kullanıcıya DOĞRULATMAK için sayar. Rutin
 *  koşmaz, HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur.
 *
 *  ── SORDUĞU SORU (02.09.2026, maliyet turunun açık kalan ② maddesi) ──────
 *  Sayımda fazla çıkan mala `canli-sayim-esas.ts:349` şu maliyeti yazdı:
 *  **o varyantın EN SON partisinin birim maliyeti.** Bu bir TÜRETMEDİR,
 *  uydurma değildir — ama bir VARSAYIMA dayanır:
 *
 *      "rafta fazla çıkan mal, en son aldığımız maldır."
 *
 *  Kampanya döngüsüyle alan bir firmada bu varsayım çürüyebilir: fazla mal
 *  ESKİ stok olabilir ve eski kampanyanın fiyatını taşır. Ve fiyat farkının
 *  YÖNÜ yoktur (anayasa: "zaman içindeki fiyat farkı şüphe üretmez") —
 *  bu yüzden betik hüküm VERMEZ, yalnız kullanıcıya baktırır.
 *
 *  ⛔ ARADIĞI CEVAP FİYAT DEĞİL, MALIN YAŞI — ve bu ölçülmüş bir karardır.
 *  02.09.2026'da bir doğrulama sayfası sistemin yazdığı rakamı hem alanda
 *  hem yer tutucuda gösterdi; dönen 7 cevabın 7'si de kuruşuna tuttu ve
 *  ölçtüğü şey doğruluk değil YANKI'ydı. Burada atanan maliyet GÖRÜNÜR,
 *  çünkü bu bir teyit formu değil İNCELEME listesidir: sorulan şey
 *  "şu rakam doğru mu" değil, "bu mal hangi alımdan artmış".
 *
 *  ⚠ `NOT` SÜZGECİ KULLANILMADI. Öteki partiler ayıklanırken
 *  `NOT: { note: { contains: ... } }` yazılsaydı notu BOŞ olan eski düz
 *  alımlar sessizce düşerdi (MySQL'de `NOT(NULL LIKE ...)` = NULL = eleme).
 *  01.09'da tam bu oldu: yayılma %23,6 yerine %1,1 göründü — yirmi kat, ve
 *  yanlış olan taraf "sorun yok" diyordu. Ayıklama **kimlikle** yapılıyor.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/** Önek — ileride ikinci bir sayım yazılırsa o da kapsama girer. */
const SAYIM_ONEKI = "sayim-fiziksel";
/** Ticari veri — `veri/ozel/` .gitignore'da, depoya çıkmaz. */
const CIKTI = "veri/ozel";

/** ⚠ CSV kaçışı: alan içinde `;` ya da tırnak varsa sarılır. */
function csvAlan(x: string): string {
  return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}
/** Excel TR ondalığı virgüldür; sütun sayı olarak açılsın. */
function csvSayi(x: number | null): string {
  return x === null ? "" : x.toFixed(2).replace(".", ",");
}

function para(d: unknown): string {
  if (d === null || d === undefined) return "—";
  return Number(String(d)).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}
function sagaYasla(m: string, n: number): string {
  return m.length >= n ? m : " ".repeat(n - m.length) + m;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  SAYIM FAZLASI — maliyet ataması kontrol listesi (salt okuma)");
  console.log("=".repeat(78));

  /** ARTI yönde açılan sayım partileri = rafta fazla çıkan mal. */
  const fazlalar = await prisma.stockMovement.findMany({
    where: {
      quantityDelta: { gt: 0 },
      note: { contains: SAYIM_ONEKI },
    },
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      note: true,
      variant: {
        select: {
          sku: true,
          companySku: true,
          barcode: true,
          name: true,
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { occurredAt: "asc" },
  });

  console.log(`\n  incelenen sayım fazlası partisi: ${fazlalar.length}`);
  if (fazlalar.length === 0) {
    console.log("  ⚠ HİÇ PARTİ BULUNAMADI — desen değişmiş olabilir.");
    console.log("    Bu 'temiz' DEMEK DEĞİLDİR: bakılamadı.");
    await prisma.$disconnect();
    return;
  }

  const kimlikler = fazlalar.map((f) => f.id);
  const varyantlar = [...new Set(fazlalar.map((f) => f.variantId))];

  /**
   * ÖTEKİ PARTİLER — aynı varyantın maliyet taşıyan bütün girişleri.
   * Sayım partileri KİMLİKLE ayıklanır (yukarıdaki `NOT` gerekçesine bak).
   */
  const otekiler = await prisma.stockMovement.findMany({
    where: {
      variantId: { in: varyantlar },
      quantityDelta: { gt: 0 },
      unitCostAmount: { not: null },
      id: { notIn: kimlikler },
    },
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      type: true,
      note: true,
    },
    orderBy: { occurredAt: "asc" },
  });
  const otekiHarita = new Map<string, typeof otekiler>();
  for (const o of otekiler) {
    const liste = otekiHarita.get(o.variantId) ?? [];
    liste.push(o);
    otekiHarita.set(o.variantId, liste);
  }

  /**
   * ⭐ AYIRT EDİCİ ÖLÇÜM — "en son parti" varsayımını ELEYEBİLEN tek şey.
   *
   * Sistem fazla mala EN SON partinin fiyatını yazdı. Eğer o parti sayım
   * anında ZATEN TAM TÜKENMİŞSE, defterin kendi ifadesine göre o partinin
   * malı raftan çıkmıştır — yani rafta duran fazla mal ondan OLAMAZ.
   * Bu, iki okumayı ayıran bir gözlemdir; ötekiler (fiyatın yüksek/düşük
   * olması, farkın büyüklüğü) her iki okumayla da uyumludur.
   *
   * ⚠ HÜKÜM DEĞİL, İŞARET. Defter tükenmiş diyorsa ve mal raftaysa zaten
   * bir ayrışma var — sayımın bulduğu şey tam olarak budur. İşaret yalnız
   * şunu söyler: bu satırda "en son parti" varsayımı kendi defterimizle
   * çelişiyor, önce buna bak.
   */
  const kaynakTuketimi = await prisma.stockMovement.findMany({
    where: {
      variantId: { in: varyantlar },
      quantityDelta: { lt: 0 },
      sourceMovementId: { not: null },
    },
    select: { sourceMovementId: true, quantityDelta: true, occurredAt: true },
  });
  /** parti id → sayım anına kadar tüketilen adet. */
  const tuketilen = new Map<string, number>();
  for (const t of kaynakTuketimi) {
    const k = t.sourceMovementId;
    if (k === null) continue;
    tuketilen.set(k, (tuketilen.get(k) ?? 0) + Math.abs(t.quantityDelta));
  }

  /** Bu partiden fiilen çıkan mal — SATIŞ ile başka çıkış AYRI sayılır. */
  const cikislar = await prisma.stockMovement.findMany({
    where: { sourceMovementId: { in: kimlikler }, quantityDelta: { lt: 0 } },
    select: {
      sourceMovementId: true,
      quantityDelta: true,
      saleItemId: true,
      type: true,
      saleItem: { select: { sale: { select: { iptalTarihi: true } } } },
    },
  });
  const satilan = new Map<string, number>();
  const digerCikis = new Map<string, number>();
  for (const c of cikislar) {
    const k = c.sourceMovementId;
    if (k === null) continue;
    const adet = Math.abs(c.quantityDelta);
    if (c.saleItemId !== null) {
      /** İptal edilmiş satış kayıp sayılmaz — kârı zaten hesaplanmıyor. */
      if (c.saleItem?.sale?.iptalTarihi !== null) continue;
      satilan.set(k, (satilan.get(k) ?? 0) + adet);
    } else {
      digerCikis.set(k, (digerCikis.get(k) ?? 0) + adet);
    }
  }

  type Satir = {
    sku: string;
    firmaSku: string;
    barkod: string;
    ad: string;
    adet: number;
    satilanAdet: number;
    digerAdet: number;
    atanan: number | null;
    enDusuk: number | null;
    enYuksek: number | null;
    otekiSayisi: number;
    yayilmaYuzde: number | null;
    /**
     * ⛔ ÜÇ AYRI SAYI, ÜÇ AYRI ETİKET — İLK YAZIMDA İKİSİNİ KARIŞTIRDIM.
     * Satır `en eskisi seçilseydi fark` yazıp `atanan − enDüşük` basıyordu;
     * en ucuz parti ile en eski parti aynı şey DEĞİL ve sorunun kendisi
     * malın YAŞIYLA ilgili. _(Anayasa: "bir sayı etiketiyle taşınır".)_
     */
    /** En eski partinin fiyatı — sorunun asıl rakibi. */
    enEski: number | null;
    /** adet × (atanan − en eski) — "fazla mal eski stok" ise değişecek tutar. */
    eskiFark: number | null;
    /** adet × (en yüksek − en düşük) — sonucun düşebileceği TAM aralık. */
    aralik: number | null;
    /**
     * Maliyeti alınan parti sayım anında TÜKENMİŞ miydi?
     * `true` → defterimiz o partinin malını bitmiş sayıyor; rafta duran
     * fazla mal ondan olamaz → "en son parti" varsayımı bu satırda çelişik.
     */
    kaynakTukenmis: boolean | null;
    partiler: { tarih: string; fiyat: number; adet: number; tur: string }[];
  };

  const anlamli: Satir[] = [];
  const soruYok: Satir[] = [];
  const bakilamadi: Satir[] = [];

  for (const f of fazlalar) {
    const oteki = otekiHarita.get(f.variantId) ?? [];
    const fiyatlar = oteki.map((o) => Number(String(o.unitCostAmount)));
    const atanan =
      f.unitCostAmount === null ? null : Number(String(f.unitCostAmount));
    const enDusuk = fiyatlar.length === 0 ? null : Math.min(...fiyatlar);
    const enYuksek = fiyatlar.length === 0 ? null : Math.max(...fiyatlar);
    const yayilma =
      enDusuk === null || enYuksek === null || enDusuk === 0
        ? null
        : ((enYuksek - enDusuk) / enDusuk) * 100;

    /**
     * MALİYETİ ALINAN PARTİ — `canli-sayim-esas.ts:349` en son (occurredAt
     * desc) maliyetli girişi seçiyordu; `oteki` artan sıralı olduğu için
     * karşılığı SON elemandır.
     * ⚠ Ve seçim VARSAYILMIYOR, DOĞRULANIYOR: atanan tutar o partinin
     * tutarıyla kuruşuna tutmuyorsa kaynak belirsizdir ve işaret basılmaz.
     * _(Anayasa: "alanın dolu olması, olayın gerçekleştiğini göstermez".)_
     */
    const sonuncu = oteki.length === 0 ? null : oteki[oteki.length - 1];
    const kaynak =
      sonuncu === null ||
      atanan === null ||
      Math.abs(Number(String(sonuncu.unitCostAmount)) - atanan) >= 0.005
        ? null
        : sonuncu;

    const satir: Satir = {
      sku: f.variant.sku,
      firmaSku: f.variant.companySku,
      barkod: f.variant.barcode ?? "—",
      ad:
        f.variant.product.name +
        (f.variant.name === null || f.variant.name === ""
          ? ""
          : ` / ${f.variant.name}`),
      adet: f.quantityDelta,
      satilanAdet: satilan.get(f.id) ?? 0,
      digerAdet: digerCikis.get(f.id) ?? 0,
      atanan,
      enDusuk,
      enYuksek,
      otekiSayisi: oteki.length,
      yayilmaYuzde: yayilma,
      enEski: fiyatlar.length === 0 ? null : fiyatlar[0],
      eskiFark:
        atanan === null || fiyatlar.length === 0
          ? null
          : f.quantityDelta * (atanan - fiyatlar[0]),
      aralik:
        enDusuk === null || enYuksek === null
          ? null
          : f.quantityDelta * (enYuksek - enDusuk),
      kaynakTukenmis: kaynak === null
        ? null
        : (tuketilen.get(kaynak.id) ?? 0) >= kaynak.quantityDelta,
      partiler: oteki.map((o) => ({
        tarih: gun(o.occurredAt),
        fiyat: Number(String(o.unitCostAmount)),
        adet: o.quantityDelta,
        tur: String(o.type),
      })),
    };

    /**
     * ⚠ EŞİK UYDURULMADI — ÖLÇÜT KURUŞTUR.
     * "%1'den küçük yayılmayı yok say" gibi bir eşik veriden gelmezdi;
     * ben yazmış olurdum. Ölçüt şu: en yüksek ile en düşük parti fiyatı
     * arasında **bir kuruştan fazla** fark var mı — varsa sistem bir SEÇİM
     * yapmıştır ve o seçim sorulabilir. Farkın BÜYÜKLÜĞÜ ayrı sütunda
     * duruyor; küçük olanları eleme işini rakamı gören yapar.
     * _(Anayasa: "eşiği soruyu soran koyamaz".)_
     */
    if (atanan === null) bakilamadi.push(satir);
    else if (
      enDusuk === null ||
      enYuksek === null ||
      enYuksek - enDusuk < 0.01
    )
      soruYok.push(satir);
    else anlamli.push(satir);
  }

  /** Sıralama PARAYA göre — en çok oynayan üstte. */
  anlamli.sort((a, b) => Math.abs(b.aralik ?? 0) - Math.abs(a.aralik ?? 0));

  console.log("\n" + "-".repeat(78));
  console.log("  KÜME AYRIMI — dördü AYRI sayılır");
  console.log("-".repeat(78));
  console.log(`  incelenen                      : ${fazlalar.length}`);
  console.log(`  ⭐ SORU ANLAMLI (yayılma var)   : ${anlamli.length}`);
  console.log(`  ✓ soru doğmuyor (tek fiyat)    : ${soruYok.length}`);
  console.log(`  ⚠ incelenemedi (maliyet YOK)   : ${bakilamadi.length}`);
  const tukenmisSayisi = anlamli.filter((s) => s.kaynakTukenmis === true).length;
  const cozulemeyen = anlamli.filter((s) => s.kaynakTukenmis === null).length;
  console.log(
    `\n  ⭐ bunlardan KAYNAK PARTİSİ TÜKENMİŞ olan : ${tukenmisSayisi}` +
      "   ← önce bunlara bak",
  );
  console.log(`  ⚠ kaynağı çözülemeyen                    : ${cozulemeyen}`);

  /**
   * ⛔ İŞARETİN TABAN ORANI — ÖLÇÜLMEDEN İŞARET KULLANILAMAZ.
   * "Kaynak partisi tükenmiş" ancak AYIRT EDİYORSA bilgidir. Her satırda
   * tükenmişse hiçbir şeyi ayırmaz ve dikkati boşa yönlendirir.
   * _(Anayasa: "eşik, ölçüldüğü popülasyonun dışına uygulanamaz" — burada
   * işaretin kendisi kendi tabanına karşı ölçülüyor.)_
   */
  const hepsi = [...anlamli, ...soruYok, ...bakilamadi];
  const tabanTukenmis = hepsi.filter((s) => s.kaynakTukenmis === true).length;
  const tabanOlculebilir = hepsi.filter((s) => s.kaynakTukenmis !== null).length;
  const tabanYuzde =
    tabanOlculebilir === 0 ? null : (tabanTukenmis / tabanOlculebilir) * 100;
  const anlamliOlculebilir = anlamli.filter((s) => s.kaynakTukenmis !== null).length;
  const anlamliYuzde =
    anlamliOlculebilir === 0 ? null : (tukenmisSayisi / anlamliOlculebilir) * 100;
  console.log(
    `\n  📏 İŞARETİN TABAN ORANI — ayırt ediyor mu:` +
      `\n     bütün sayım fazlalarında tükenmiş : ${tabanTukenmis}/${tabanOlculebilir}` +
      ` (%${(tabanYuzde ?? 0).toFixed(1)})` +
      `\n     yayılması olanlarda               : ${tukenmisSayisi}/${anlamliOlculebilir}` +
      ` (%${(anlamliYuzde ?? 0).toFixed(1)})`,
  );
  console.log(
    "     ⚠ İki oran BİRBİRİNE YAKINSA işaret ayırt etmiyor demektir;" +
      "\n       o hâlde dikkat sırasını PARA belirler, işaret değil.",
  );

  if (anlamli.length > 0) {
    console.log("\n" + "=".repeat(78));
    console.log("  ⭐ KONTROL EDİLECEKLER — varyantın birden çok fiyatı var");
    console.log("=".repeat(78));
    console.log(
      "\n  SORU: rafta fazla çıkan bu mal HANGİ alımdan artmış?" +
        "\n        Sistem EN SON partinin fiyatını yazdı. Fatura/kutu tarihine" +
        "\n        bakıp malın YAŞINI söyleyin — fiyatı ezberlemenize gerek yok.\n",
    );
    let toplamAralik = 0;
    let toplamEskiFark = 0;
    let toplamSatilan = 0;
    for (const s of anlamli) {
      toplamAralik += Math.abs(s.aralik ?? 0);
      toplamEskiFark += Math.abs(s.eskiFark ?? 0);
      toplamSatilan += s.satilanAdet;
      console.log("-".repeat(78));
      console.log(`  ${s.ad}`);
      console.log(`  SKU ${s.sku} · Firma SKU ${s.firmaSku} · Barkod ${s.barkod}`);
      console.log(
        `  fazla çıkan: ${s.adet} adet` +
          `   ·   bugüne kadar SATILAN: ${s.satilanAdet}` +
          (s.digerAdet > 0 ? `   ·   başka çıkış: ${s.digerAdet}` : ""),
      );
      console.log(
        `  sistemin yazdığı maliyet: ${para(s.atanan)}  (en son partiden türetildi)`,
      );
      console.log(`  bu varyantın ÖTEKİ alım fiyatları (${s.otekiSayisi} parti):`);
      for (const p of s.partiler) {
        const isaret =
          s.atanan !== null && Math.abs(p.fiyat - s.atanan) < 0.005 ? " ←" : "";
        console.log(
          `      ${p.tarih}   ${sagaYasla(para(p.fiyat), 12)}   ` +
            `${sagaYasla(String(p.adet), 4)} adet   ${doldur(p.tur, 18)}${isaret}`,
        );
      }
      console.log(
        `  yayılma: ${para(s.enDusuk)} – ${para(s.enYuksek)}` +
          `  (%${(s.yayilmaYuzde ?? 0).toFixed(1)})`,
      );
      console.log(
        `  EN ESKİ parti (${s.partiler[0]?.tarih ?? "—"}) ${para(s.enEski)} olsaydı` +
          ` fark: ${para(s.eskiFark)}` +
          `   ·   tam aralık: ${para(s.aralik)}`,
      );
      if (s.kaynakTukenmis === true) {
        console.log(
          "  ⭐ İŞARET: maliyeti alınan parti sayım anında ZATEN TAM TÜKENMİŞ" +
            "\n     — defterimize göre o partinin malı raftan çıkmıştı, yani" +
            "\n     rafta bulunan fazla mal ondan OLAMAZ. ÖNCE BUNA BAK.",
        );
      } else if (s.kaynakTukenmis === null) {
        console.log(
          "  ⚠ maliyetin hangi partiden alındığı ÇÖZÜLEMEDİ — işaret basılmadı" +
            " (tutar hiçbir partiyle kuruşuna tutmuyor).",
        );
      }
    }
    console.log("-".repeat(78));
    console.log(
      `\n  bu partilerden bugüne kadar SATILAN: ${toplamSatilan} adet`,
    );
    console.log(
      `  ⚠ TAM ARALIK toplamı  : ${para(toplamAralik)}` +
        "   ← en ucuz ile en pahalı parti arasındaki mesafe",
    );
    console.log(
      `  ⚠ EN ESKİ seçilseydi  : ${para(toplamEskiFark)}` +
        "   ← 'fazla mal eski stok' çıkarsa oynayan tutar",
    );
    console.log(
      "\n    İKİSİ DE KAYIP RAKAMI DEĞİL. Hiçbiri 'şu kadar zarar ettik'" +
        "\n    demiyor — hangi partinin doğru olduğu bilinmediği için sonucun" +
        "\n    düşebileceği MESAFEYİ ölçüyorlar. Doğru partiyi fatura söyler.",
    );
  }

  if (soruYok.length > 0) {
    console.log("\n" + "-".repeat(78));
    console.log("  ✓ SORU DOĞMUYOR — varyantın tek fiyatı var, seçim yapılmadı");
    console.log("-".repeat(78));
    for (const s of soruYok) {
      console.log(
        `  ${doldur(s.sku, 16)} ${doldur(s.ad, 34)} ` +
          `${sagaYasla(String(s.adet), 3)} adet · ${para(s.atanan)}` +
          (s.otekiSayisi === 0 ? "   (başka parti YOK)" : ""),
      );
    }
  }

  if (bakilamadi.length > 0) {
    console.log("\n" + "-".repeat(78));
    console.log("  ⚠ İNCELENEMEDİ — maliyet HİÇ YOK (NO_COST, uydurulmadı)");
    console.log("-".repeat(78));
    for (const s of bakilamadi) {
      console.log(
        `  ${doldur(s.sku, 16)} ${doldur(s.ad, 34)} ` +
          `${sagaYasla(String(s.adet), 3)} adet · satılan ${s.satilanAdet}`,
      );
    }
    console.log(
      "\n    Bunlar yanlış maliyet TAŞIMIYOR — hiç taşımıyor. Satılırlarsa" +
        "\n    kâr NO_COST döner, sahte NET üretmezler.",
    );
  }

  /**
   * CSV — kontrol Excel'de, faturaların yanında yapılıyor.
   * ⚠ Her satır KÜMESİNİ de yazar; "hangi listeye baktım" sorusu dosyanın
   * içinde cevaplanır, dosya adına bakılarak değil.
   */
  const damga = new Date().toISOString().slice(0, 10);
  const csvYol = `${CIKTI}/sayim-fazlasi-${damga}.csv`;
  const basliklar = [
    "Küme",
    "SKU",
    "Firma SKU",
    "Barkod",
    "Ürün",
    "Fazla çıkan adet",
    "Satılan adet",
    "Sistemin yazdığı maliyet (TRY)",
    "En eski parti tarihi",
    "En eski parti fiyatı (TRY)",
    "En düşük (TRY)",
    "En yüksek (TRY)",
    "Yayılma %",
    "En eski seçilseydi fark (TRY)",
    "Tam aralık (TRY)",
    "Kaynak partisi tükenmiş miydi",
    "Öteki parti sayısı",
    "Bütün alım fiyatları (tarih=fiyat)",
  ];
  const csvSatirlar = [basliklar.map(csvAlan).join(";")];
  const kumeAdi = (s: Satir): string =>
    anlamli.includes(s)
      ? "SORU ANLAMLI"
      : soruYok.includes(s)
        ? "soru dogmuyor"
        : "maliyet YOK";
  for (const s of [...anlamli, ...soruYok, ...bakilamadi]) {
    csvSatirlar.push(
      [
        kumeAdi(s),
        s.sku,
        s.firmaSku,
        s.barkod,
        s.ad,
        String(s.adet),
        String(s.satilanAdet),
        csvSayi(s.atanan),
        s.partiler[0]?.tarih ?? "",
        csvSayi(s.enEski),
        csvSayi(s.enDusuk),
        csvSayi(s.enYuksek),
        s.yayilmaYuzde === null ? "" : s.yayilmaYuzde.toFixed(1).replace(".", ","),
        csvSayi(s.eskiFark),
        csvSayi(s.aralik),
        s.kaynakTukenmis === null ? "cozulemedi" : s.kaynakTukenmis ? "EVET" : "hayir",
        String(s.otekiSayisi),
        s.partiler.map((p) => `${p.tarih}=${csvSayi(p.fiyat)}`).join(" | "),
      ]
        .map(csvAlan)
        .join(";"),
    );
  }
  /** ⚠ BOM: Excel Türkçe karakteri UTF-8 olarak tanısın diye. */
  writeFileSync(csvYol, "﻿" + csvSatirlar.join("\r\n"), "utf8");

  console.log("\n" + "=".repeat(78));
  console.log(`  CSV: ${csvYol}   (${csvSatirlar.length - 1} satır)`);
  console.log("  Salt okuma — veritabanına hiçbir şey yazılmadı.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  /** Mesaj TAM taşınır — kısaltma teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
