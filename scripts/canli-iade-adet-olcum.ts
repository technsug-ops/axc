/**
 * ============================================================================
 *  K136c — İADE ADEDİ / SAĞLAM ADET ÖLÇÜM YOLU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-adet-olcum
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 114 siparişlik toplu yazımın son kapısı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR. Tek çağrı noktası
 *  `scripts/ty/istemci.ts` ve o modül YALNIZ `GET` bilir.
 *
 *  ── ⚠ İKİ AYRI SORU VAR, ŞARTNAME BİRİNİ ADLANDIRIYOR ───────────────────
 *  Halil "sağlam adet ölçüm yolu" dedi ve adımları ADET belirsizliği
 *  üzerine kurdu. Ama K136a'da ölçülen pahalı bilinmeyen İKİ SORUYDU:
 *
 *    (A) İADE ADEDİ    — kaç birim geri geldi?      → `quantity`
 *    (B) SAĞLAM ADET   — kaçı rafa girdi?           → `soundQuantity`
 *
 *  Adım ①③ (A)'yı ölçer, adım ④ (B)'yi. İkisi karıştırılırsa "adet
 *  çözüldü" denip (B) açık kalır — ve ₺21.948'lik yayılım (B)'den geliyordu.
 *  Bu rapor ikisini AYRI sayar ve hangisini çözdüğünü açıkça yazar.
 *  _(Anayasa: "bir sayı etiketiyle taşınır".)_
 * ============================================================================
 */

import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./ty/istemci";
import { paketiNormalle } from "../src/lib/tablo/paket";

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
/** Teslim EDİLMEMİŞ anlamına gelen kanal kodları (K136b'de ölçüldü). */
const TESLIM_EDILMEDI = new Set(["UNDELIVERED", "CLAIMEDINSHIP"]);
/**
 * ⚠ HASARI İMA EDEN KODLAR — malın satılabilir dönüp dönmediğine dair
 * kanalın verdiği TEK sinyal. "İma" kelimesi bilerek: kod hasarı
 * SÖYLEMİYOR, ihtimalini gösteriyor. Hüküm değil, BAKTIRMA sebebi.
 */
const HASAR_IMASI = new Set([
  "DAMAGEDITEM",
  "ANALYSISREQUEST",
  "CHANGEREQUEST",
  "MISSINGPART",
  "DISLIKEQUALITY",
]);

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function oku(x: unknown, yol: string[]): unknown {
  let g: unknown = x;
  for (const p of yol) {
    if (g === null || typeof g !== "object") return undefined;
    g = (g as Record<string, unknown>)[p];
  }
  return g;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const k = kimlikOku();
  if (k === null) {
    console.log("⛔ TY kimliği okunamadı — ÖLÇÜM YOK ('yol yok' DEMEK DEĞİL).");
    process.exitCode = 1;
    return;
  }
  const baslik = baslikKur(k);
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(86));
  console.log("  K136c — İADE ADEDİ / SAĞLAM ADET ÖLÇÜM YOLU (salt okuma)");
  console.log("=".repeat(86));

  /** ── claims çek ─────────────────────────────────────────────────── */
  const claims: unknown[] = [];
  for (let sayfa = 0; sayfa < 40; sayfa++) {
    const s = await apiGet(UCLAR.iadeler(k.saticiId, sayfa, 50), baslik, 90_000);
    if (s.tur !== "VERI") break;
    const g = s.govde as Record<string, unknown>;
    const dizi = Array.isArray(g.content) ? (g.content as unknown[]) : [];
    if (dizi.length === 0) break;
    claims.push(...dizi);
    const tp = typeof g.totalPages === "number" ? g.totalPages : null;
    if (tp !== null && sayfa + 1 >= tp) break;
  }

  /** ── açık TY kümesi — `canli-iade-acigi.ts` ile AYNI ölçüt ───────── */
  const sayfaVerisi = (
    await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt)
  )[0] as unknown as { data: unknown[][] };
  const veri = sayfaVerisi.data;
  const baslikSatiri = (veri[0] ?? []).map((c) => String(c ?? "").trim());
  const iNo = baslikSatiri.indexOf("Sipariş Numarası");
  const nolar = [
    ...new Set(
      veri
        .slice(1)
        .map((r) => String(r[iNo] ?? "").trim())
        .filter((x) => x !== ""),
    ),
  ];

  type SatisBilgisi = {
    id: string;
    iptal: Date | null;
    kanal: string;
    kalemler: {
      adet: number;
      birim: number;
      sku: string;
      varyantId: string;
      urun: string;
      raf: string | null;
    }[];
  };
  const satislar = new Map<string, SatisBilgisi>();
  for (let a = 0; a < nolar.length; a += 300) {
    for (const x of await prisma.sale.findMany({
      where: { code: { in: nolar.slice(a, a + 300) } },
      select: {
        id: true,
        code: true,
        iptalTarihi: true,
        channelAccount: { select: { channel: { select: { name: true } } } },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { name: true } },
                location: { select: { name: true } },
              },
            },
          },
        },
      },
    })) {
      satislar.set(x.code!, {
        id: x.id,
        iptal: x.iptalTarihi,
        kanal: x.channelAccount.channel.name,
        kalemler: x.items.map((i) => ({
          adet: i.quantity,
          birim: Number(i.unitPriceAmount.toString()),
          sku: i.variant.sku,
          varyantId: i.variant.id,
          urun: i.variant.product.name,
          raf: i.variant.location?.name ?? null,
        })),
      });
    }
  }
  const bildirimli = new Set(
    (
      await prisma.returnNotice.findMany({
        where: { sale: { code: { in: nolar } } },
        select: { sale: { select: { code: true } } },
      })
    ).map((x) => x.sale.code!),
  );
  const iadeli = new Set(
    (
      await prisma.return.findMany({
        where: { sale: { code: { in: nolar } } },
        select: { sale: { select: { code: true } } },
      })
    ).map((x) => x.sale.code!),
  );
  const claimNolari = new Set(
    claims
      .map((c) => String(oku(c, ["orderNumber"]) ?? "").trim())
      .filter((x) => x !== ""),
  );
  const hedef = nolar.filter((no) => {
    const s = satislar.get(no);
    return (
      s !== undefined &&
      s.iptal === null &&
      !bildirimli.has(no) &&
      !iadeli.has(no) &&
      s.kanal === "Trendyol" &&
      claimNolari.has(no)
    );
  });
  console.log(`\n  hedef küme: ${hedef.length} sipariş (K136b'nin 114'ü)`);

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ① BELİRSİZLİĞİN BOYUTU — ADET ekseninde
   * ---------------------------------------------------------------------
   *  Adet=1 olan kalemde "kaç adet iade" sorusu YOKTUR: kabul edilmiş bir
   *  talep varsa iade 1'dir. Belirsizlik yalnız adet>1 kalemlerde doğar.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n① BELİRSİZLİĞİN BOYUTU (ADET ekseni)");
  let kalemTek = 0;
  let kalemCok = 0;
  let cokCiro = 0;
  const cokOrnek: string[] = [];
  for (const no of hedef) {
    for (const kl of satislar.get(no)!.kalemler) {
      if (kl.adet > 1) {
        kalemCok += 1;
        /**
         * ⚠ YAYILIM = EN KÖTÜ ile EN İYİ arasındaki fark: 1 adet iade
         * varsayarsak ile TAMAMI iade varsayarsak. Ortası yok.
         */
        cokCiro += kl.birim * (kl.adet - 1);
        if (cokOrnek.length < 8) cokOrnek.push(`${no}(${kl.sku}×${kl.adet})`);
      } else kalemTek += 1;
    }
  }
  console.log(`   adet=1 kalem (belirsizlik YOK) : ${kalemTek}`);
  console.log(`   ⛔ adet>1 kalem (BELİRSİZ)      : ${kalemCok}`);
  console.log(`   ⛔ ₺ yayılımı (1 adet ↔ tamamı) : ${para(cokCiro)}`);
  if (cokOrnek.length > 0) console.log(`   örnek: ${cokOrnek.join(" · ")}`);

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ② CLAIMS KALEM YAPISI — ADET NEREDEN OKUNUR
   * ---------------------------------------------------------------------
   *  ⛔ ÖLÇÜLDÜ: `claimItems` içinde adet/quantity alanı **YOK**. Ama her
   *  `claimItem` kendi `orderLineItemId`sini taşıyor — yani TY her iade
   *  edilen BİRİMİ ayrı kalem olarak modelliyor olabilir.
   *
   *  HİPOTEZ: `iade adedi = kabul edilmiş claimItem sayısı`
   *
   *  ⚠ AYIRT EDİCİ KANIT: adet>1 olan bir siparişte kabul edilen kalem
   *  sayısı satış adedinden AZ ise hipotez desteklenir (kısmi iade
   *  görülüyor). HEP EŞİT çıkarsa hipotez sınanamaz — "her satır için bir
   *  kalem" de aynı sonucu verir.
   *  _(Anayasa: "iki okumayla da uyumlu bir gözlem, hiçbirini kanıtlamaz".)_
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n② CLAIMS KALEM YAPISI — adet buradan okunabilir mi");
  console.log("   ⛔ claimItems'ta adet/quantity alanı YOK (ölçüldü).");
  const kabulKalem = new Map<string, number>();
  for (const c of claims) {
    const no = String(oku(c, ["orderNumber"]) ?? "").trim();
    if (!hedef.includes(no)) continue;
    let n = 0;
    for (const it of ((oku(c, ["items"]) as unknown[]) ?? [])) {
      for (const ci of ((oku(it, ["claimItems"]) as unknown[]) ?? [])) {
        if (String(oku(ci, ["claimItemStatus", "name"]) ?? "") === "Accepted") {
          n += 1;
        }
      }
    }
    kabulKalem.set(no, (kabulKalem.get(no) ?? 0) + n);
  }
  let esit = 0;
  let azalan = 0;
  let fazla = 0;
  const azalanOrnek: string[] = [];
  const fazlaOrnek: string[] = [];
  for (const no of hedef) {
    const satisAdedi = satislar
      .get(no)!
      .kalemler.reduce((t, kl) => t + kl.adet, 0);
    const kabul = kabulKalem.get(no) ?? 0;
    if (kabul === satisAdedi) esit += 1;
    else if (kabul < satisAdedi) {
      azalan += 1;
      if (azalanOrnek.length < 6) azalanOrnek.push(`${no}(${kabul}/${satisAdedi})`);
    } else {
      fazla += 1;
      if (fazlaOrnek.length < 6) fazlaOrnek.push(`${no}(${kabul}/${satisAdedi})`);
    }
  }
  console.log(`   kabul kalem = satış adedi  : ${esit}`);
  console.log(
    `   ⭐ kabul kalem < satış adedi : ${azalan}` +
      (azalanOrnek.length > 0 ? `   ${azalanOrnek.join(" · ")}` : ""),
  );
  console.log(
    `   ⛔ kabul kalem > satış adedi : ${fazla}` +
      (fazlaOrnek.length > 0 ? `   ${fazlaOrnek.join(" · ")}` : ""),
  );
  console.log(
    azalan > 0
      ? "   ✓ KISMİ İADE GÖRÜLÜYOR → hipotez DESTEKLENDİ: adet = kabul kalem sayısı"
      : "   ⚠ HEPSİ EŞİT → hipotez SINANAMADI ('her satıra bir kalem' de aynı sonucu verir)",
  );
  if (fazla > 0) {
    console.log(
      "   ⛔ FAZLA ÇIKANLAR HİPOTEZİ ÇÜRÜTÜR: satılandan çok iade olamaz.",
    );
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ③ EKSTRE ÇAPRAZI — iade tutarı ÷ birim fiyat
   * ---------------------------------------------------------------------
   *  ⚠ YUVARLAMA YOK: tam bölünen ile bölünmeyen AYRI sayılır. Yuvarlamak,
   *  bölünmeyen bir sonucu "yaklaşık 2 adet" diye okumak olurdu ve o
   *  tahmin deftere adet olarak yazılırdı.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n③ EKSTRE ÇAPRAZI — iade tutarı ÷ birim fiyat");
  const ekstreKalem = await prisma.settlementItem.findMany({
    where: { orderNo: { in: hedef }, code: "IADE_TUTARI" },
    select: { orderNo: true, amount: true },
  });
  const ekstreTutar = new Map<string, number>();
  for (const e of ekstreKalem) {
    if (!e.orderNo) continue;
    ekstreTutar.set(
      e.orderNo,
      (ekstreTutar.get(e.orderNo) ?? 0) + Math.abs(Number(e.amount.toString())),
    );
  }
  console.log(`   ekstrede IADE_TUTARI olan sipariş: ${ekstreTutar.size}/${hedef.length}`);
  let tamBolunen = 0;
  let bolunmeyen = 0;
  const bolunmeyenOrnek: string[] = [];
  for (const [no, tutar] of ekstreTutar) {
    const kl = satislar.get(no)?.kalemler ?? [];
    if (kl.length !== 1) continue;
    const birim = kl[0].birim;
    if (birim <= 0) continue;
    const bolum = tutar / birim;
    /** Kuruş kuyruğu için 0,01 pencere — YUVARLAMA DEĞİL, birim seçimi. */
    if (Math.abs(bolum - Math.round(bolum)) < 0.01) tamBolunen += 1;
    else {
      bolunmeyen += 1;
      if (bolunmeyenOrnek.length < 6) {
        bolunmeyenOrnek.push(`${no}(${para(tutar)}/${para(birim)}=${bolum.toFixed(3)})`);
      }
    }
  }
  console.log(`   ⭐ TAM bölünen  : ${tamBolunen}`);
  console.log(
    `   ⛔ bölünmeyen   : ${bolunmeyen}` +
      (bolunmeyenOrnek.length > 0 ? `   ${bolunmeyenOrnek.join(" · ")}` : ""),
  );
  console.log(
    "   ⚠ Bölünmeyen, kesinti/kupon içeriyor olabilir — adet vermez.",
  );

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ④ SAĞLAM ADET — ASIL SORU, VE HEDEFLİ SAYIM LİSTESİ
   * ---------------------------------------------------------------------
   *  ⛔ ADET ÇÖZÜLSE BİLE BU AÇIK KALIR. K136a'da ₺21.948'lik yayılım
   *  buradan geliyordu (maliyet rafa döner mi dönmez mi).
   *
   *  ⭐ KANALIN TEK SİNYALİ SEBEP KODU — ve o da İMA, hüküm değil.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n④ SAĞLAM ADET — kanalın sinyali + hedefli sayım listesi");
  let hasarImali = 0;
  let temizSebep = 0;
  let teslimEdilmedi = 0;
  for (const c of claims) {
    const no = String(oku(c, ["orderNumber"]) ?? "").trim();
    if (!hedef.includes(no)) continue;
    for (const it of ((oku(c, ["items"]) as unknown[]) ?? [])) {
      for (const ci of ((oku(it, ["claimItems"]) as unknown[]) ?? [])) {
        if (String(oku(ci, ["claimItemStatus", "name"]) ?? "") !== "Accepted") {
          continue;
        }
        const kod = String(oku(ci, ["customerClaimItemReason", "code"]) ?? "");
        if (TESLIM_EDILMEDI.has(kod)) teslimEdilmedi += 1;
        else if (HASAR_IMASI.has(kod)) hasarImali += 1;
        else temizSebep += 1;
      }
    }
  }
  console.log("   KABUL EDİLEN KALEMLERİN SEBEP SINIFI:");
  console.log(
    `      ${String(teslimEdilmedi).padStart(4)}  TESLİM EDİLMEDİ → mal hiç açılmadı, SAĞLAM dönmesi beklenir`,
  );
  console.log(
    `      ${String(temizSebep).padStart(4)}  müşteri vazgeçmesi → hasar iddiası YOK`,
  );
  console.log(
    `      ${String(hasarImali).padStart(4)}  ⛔ HASAR İMALI (kusurlu/analiz/eksik parça) → BAKILMALI`,
  );
  console.log("   ⚠ Sebep kodu hasarı SÖYLEMİYOR, ihtimalini gösteriyor.");

  /** Hedefli sayım listesi — kaç FARKLI varyant, hangi raflar. */
  const varyantlar = new Map<string, { sku: string; urun: string; raf: string | null; adet: number }>();
  for (const no of hedef) {
    for (const kl of satislar.get(no)!.kalemler) {
      const g = varyantlar.get(kl.varyantId) ?? {
        sku: kl.sku,
        urun: kl.urun,
        raf: kl.raf,
        adet: 0,
      };
      g.adet += 1;
      varyantlar.set(kl.varyantId, g);
    }
  }
  console.log(`\n   ⭐ HEDEFLİ SAYIM LİSTESİ: ${varyantlar.size} FARKLI varyant`);
  const rafSayaci = new Map<string, number>();
  for (const v of varyantlar.values()) {
    const r = v.raf ?? "(raf yok)";
    rafSayaci.set(r, (rafSayaci.get(r) ?? 0) + 1);
  }
  console.log("   RAF DAĞILIMI:");
  for (const [r, n] of [...rafSayaci.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${String(n).padStart(4)}  ${r}`);
  }
  /** En çok geçen 12 varyant — sayım listesinin başı. */
  console.log("   EN ÇOK GEÇEN VARYANTLAR (sayıma buradan başlanır):");
  for (const v of [...varyantlar.values()].sort((a, b) => b.adet - a.adet).slice(0, 12)) {
    console.log(
      `      ${v.sku.padEnd(16)} ${String(v.adet).padStart(3)} sipariş  ` +
        `${(v.raf ?? "—").padEnd(10)} ${v.urun.slice(0, 34)}`,
    );
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ④b BEDAVA KANIT — 27.08 SAYIMI BU VARYANTLARIN KAÇINI ZATEN CEVAPLADI
   * ---------------------------------------------------------------------
   *  ⭐ K136a'da 8 siparişin 4'ünü fiziksel sayım çözdü: fazla = iade
   *  adedi. Aynı çapraz burada da kurulabilir ve KURULMALI — 97 varyantı
   *  elle saymadan önce, sayımın zaten saydıklarını düşmek gerekir.
   *
   *  ⚠ VE ÜÇ KOVA AYRI: sayılmış+fazla açıklıyor · sayılmış+açıklamıyor ·
   *  hiç sayılmamış. "Sayılmamış" ≠ "rafta yok".
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n④b BEDAVA KANIT — 27.08 sayımı kaçını zaten cevapladı");
  const { gunSonu } = await import("../src/lib/stok");
  let cozulen = 0;
  let sayildiAmaAciklamiyor = 0;
  let hicSayilmadi = 0;
  const cozulenOrnek: string[] = [];
  /**
   * ⭐ KİMLİK DE TUTULUYOR, YALNIZ SAYI DEĞİL (03.09.2026).
   * ⑥'daki sayım listesi bu kümeyi DÜŞEREK kuruluyor. Sayı tutulup kimlik
   * tutulmasaydı liste "90" derken hangi 90 olduğunu söyleyemezdi ve
   * ikinci bir hesapla yeniden bulunması gerekirdi — o hesap da bir gün
   * bundan ayrışırdı. _(Anayasa: "aynı soruya iki cevap olmaz".)_
   */
  const cozulenler = new Set<string>();
  for (const [varyantId, v] of varyantlar) {
    const satir = await prisma.stokSayimSatiri.findFirst({
      where: { variantId: varyantId, sayilanAdet: { not: null } },
      select: {
        sayilanAdet: true,
        duzeltmeYazildiAt: true,
        sayim: { select: { sayimGunu: true } },
      },
      orderBy: { sayim: { sayimGunu: "desc" } },
    });
    if (satir === null) {
      hicSayilmadi += 1;
      continue;
    }
    const toplam = await prisma.stockMovement.aggregate({
      where: { variantId: varyantId, occurredAt: { lte: gunSonu(satir.sayim.sayimGunu) } },
      _sum: { quantityDelta: true },
    });
    const fazla = (satir.sayilanAdet ?? 0) - (toplam._sum.quantityDelta ?? 0);
    /**
     * ⚠ ÖLÇÜT: fazla, o varyantın bu kümedeki iade adedine EŞİT Mİ.
     * Eşitse iade fazlayı TAM açıklıyor — K136a'daki 4/4 deseni.
     * Düzeltme yazılmışsa fazla ledger'a girmiştir; o hâlde iade yazmak
     * çift sayar ve bu satır AÇIKLAYICI SAYILMAZ.
     */
    if (satir.duzeltmeYazildiAt === null && fazla === v.adet && fazla > 0) {
      cozulen += 1;
      cozulenler.add(varyantId);
      if (cozulenOrnek.length < 8) cozulenOrnek.push(`${v.sku}(+${fazla})`);
    } else sayildiAmaAciklamiyor += 1;
  }
  console.log(`   ⭐ sayım fazlası iade adedini TAM açıklıyor : ${cozulen}`);
  console.log(`   ⚠ sayılmış ama açıklamıyor                 : ${sayildiAmaAciklamiyor}`);
  console.log(`   ⚠ hiç sayılmamış (ÖLÇÜLEMEZ, 'yok' DEĞİL)   : ${hicSayilmadi}`);
  if (cozulenOrnek.length > 0) console.log(`   örnek: ${cozulenOrnek.join(" · ")}`);
  const kapsam = cozulen + sayildiAmaAciklamiyor + hicSayilmadi;
  if (kapsam !== varyantlar.size) {
    console.log(`   ⛔ KOVA TOPLAMI ${kapsam} ≠ ${varyantlar.size} — sayım hatalı.`);
    process.exitCode = 1;
  }
  console.log(
    `   → Halil'in ELLE sayması gereken varyant: ${varyantlar.size - cozulen}`,
  );

  console.log("\n" + "=".repeat(86));
  console.log("  ⑤ HANGİ YOL NEYİ ÇÖZÜYOR");
  console.log("=".repeat(86));
  console.log(`   ADET (A):  ${kalemTek} kalemde zaten belirsizlik YOK`);
  console.log(`              ${kalemCok} kalemde belirsiz — ₺${para(cokCiro)} yayılım`);
  console.log(
    `              claims yolu: ${azalan > 0 ? "DESTEKLENDİ" : "SINANAMADI"}` +
      `  ·  ekstre yolu: ${tamBolunen} tam bölünen / ${bolunmeyen} bölünmeyen`,
  );
  /**
   * ⭐ KARARIN BEDELİ — SAYIM ZAHMETİNE DEĞER Mİ SORUSUNUN CEVABI.
   *
   * K136a'da bu rakam 8 siparişte ₺21.948'di ve kararı O belirledi.
   * 90 varyant elle saymak ciddi bir iş; ne kazandıracağı YAZILMADAN
   * "sayılsın" demek, bedeli bilinmeyen bir işi emretmektir.
   *
   * ⚠ YAYILIM = iade edilen malın FIFO maliyeti. `sağlam=tamamı` ise bu
   * tutar rafa döner, `sağlam=0` ise satıcıda kalır. Ortası yok.
   * ⚠ Maliyeti BİLİNMEYEN kalem yayılıma GİRMEZ ve ayrı sayılır —
   * `0` saymak, bilinmeyeni "bedava" diye okumak olurdu.
   */
  let saglamYayilimi = 0;
  let maliyetsiz = 0;
  for (const no of hedef) {
    const s = satislar.get(no)!;
    const hareketler = await prisma.stockMovement.findMany({
      where: { saleItem: { saleId: s.id } },
      select: { quantityDelta: true, unitCostAmount: true },
    });
    const m = hareketler.reduce(
      (t, h) =>
        t +
        (h.unitCostAmount === null
          ? 0
          : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
      0,
    );
    if (m === 0) maliyetsiz += 1;
    else saglamYayilimi += m;
  }

  console.log(
    `   SAĞLAM (B): ${cozulen} varyant sayımdan BEDAVA çözüldü` +
      `  ·  elle sayılacak ${varyantlar.size - cozulen}`,
  );
  console.log(
    `              hasar imalı ${hasarImali} kalem AYRICA bakılmalı`,
  );
  console.log(
    `              ⛔ KARARIN BEDELİ: ${para(saglamYayilimi)}` +
      "   (sağlam=0 ↔ sağlam=tamamı)",
  );
  console.log(
    "              " +
      (maliyetsiz > 0
        ? `⚠ ${maliyetsiz} siparişin maliyeti YOK — yayılıma girmedi`
        : "✓ tüm siparişlerin maliyeti biliniyor"),
  );
  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ⑥ HALİL'İN SAYIM LİSTESİ — ₺ ETKİSİ · %80 EŞİĞİ · RAF SIRASI
   * ---------------------------------------------------------------------
   *  _Halil şartnamesi 02.09: "90 varyant ₺ etkisine göre sıralı, %80 eşiği
   *  işaretli, raf sırasına dizili."_
   *
   *  ⛔ ŞARTNAME İKİ SIRALAMA İSTİYOR VE İKİSİ ÇELİŞİYOR. Çözüm ikisinden
   *  birini seçmek DEĞİL, ikisini farklı işe koşmak:
   *    · ₺ etkisi  → **hangi satırların sayılmaya değdiğini** belirler
   *                  (%80 kesimi buradan çıkar, işaretlenir)
   *    · raf sırası→ **listenin DİZİLİŞİ**; depo bir kez dolaşılır
   *  Liste ₺'ye göre dizilseydi Halil aynı rafa beş kez giderdi.
   *
   *  ⚠ TOPLAM İKİ YOLDAN ÖLÇÜLÜP KARŞILAŞTIRILIYOR: varyant bazında
   *  toplanan tutar, sipariş bazında ölçülen `saglamYayilimi` ile aynı
   *  kümeyi görmeli. Ayrışırsa liste YAYIMLANMAZ — iki rakam yan yana
   *  durursa hangisinin geçerli olduğu sorulur.
   *  _(Anayasa: "kontrol tasarımı, veri kapsamı doğrulanmadan fark
   *  üretmez" · "tek tek gösterilen yerde toplam da olur".)_
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n" + "=".repeat(86));
  console.log("  ⑥ HALİL'İN SAYIM LİSTESİ");
  console.log("=".repeat(86));

  type SayimSatiri = {
    sku: string;
    urun: string;
    raf: string | null;
    adet: number;
    tutar: number;
    maliyetsiz: boolean;
  };
  const liste: SayimSatiri[] = [];
  for (const [varyantId, v] of varyantlar) {
    if (cozulenler.has(varyantId)) continue;
    /**
     * ⚠ TUTAR VARYANT BAZINDA: yalnız BU varyantın hareketleri. Sipariş
     * bazlı ölçüm çok kalemli siparişte hepsini tek varyanta yazardı.
     */
    const hareketler = await prisma.stockMovement.findMany({
      where: {
        variantId: varyantId,
        saleItem: { sale: { code: { in: [...hedef] } } },
      },
      select: { quantityDelta: true, unitCostAmount: true },
    });
    const tutar = hareketler.reduce(
      (t, h) =>
        t +
        (h.unitCostAmount === null
          ? 0
          : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
      0,
    );
    liste.push({
      sku: v.sku,
      urun: v.urun,
      raf: v.raf,
      adet: v.adet,
      tutar,
      maliyetsiz: tutar === 0,
    });
  }

  /** ₺'ye göre azalan — %80 kesimi BURADAN çıkar. */
  const tutaraGore = [...liste].sort((a, b) => b.tutar - a.tutar);
  const toplamTutar = tutaraGore.reduce((t, s) => t + s.tutar, 0);
  const esikte = new Set<string>();
  let birikim = 0;
  for (const s of tutaraGore) {
    if (birikim >= toplamTutar * 0.8) break;
    birikim += s.tutar;
    esikte.add(s.sku);
  }

  console.log(`   sayılacak varyant : ${liste.length}`);
  console.log(`   toplam ₺ etkisi   : ${para(toplamTutar)}`);
  console.log(
    `   ⭐ %80'i ilk ${esikte.size} varyantta (${para(birikim)}) — ` +
      `kalan ${liste.length - esikte.size} varyant ${para(toplamTutar - birikim)}`,
  );
  const maliyetsizAdet = liste.filter((s) => s.maliyetsiz).length;
  console.log(
    "   " +
      (maliyetsizAdet > 0
        ? `⚠ ${maliyetsizAdet} varyantın maliyeti YOK — ₺0 sayılmadı, ` +
          "eşiğe girmedi ve listede AYRI işaretli"
        : "✓ her varyantın maliyeti biliniyor"),
  );

  /**
   * ⛔ KAPSAM KARŞILAŞTIRMASI — iki yoldan ölçülen toplam tutuyor mu?
   * Varyant bazlı toplam, sipariş bazlı `saglamYayilimi`den ÇÖZÜLENLER
   * kadar eksik olmalı; fazlası/eksiği kapsam boşluğudur.
   */
  const cozulenTutar = saglamYayilimi - toplamTutar;
  console.log(
    `   kapsam: sipariş bazlı ${para(saglamYayilimi)} − varyant bazlı ` +
      `${para(toplamTutar)} = ${para(cozulenTutar)} (sayımın çözdüğü ${cozulen} varyant)`,
  );
  if (cozulenTutar < -0.005) {
    console.log(
      "   ⛔ VARYANT BAZLI TOPLAM SİPARİŞ BAZLIYI AŞIYOR — kapsam ayrışması.",
    );
    console.log("      LİSTE YAYIMLANMADI.");
    process.exitCode = 1;
  } else {
    /** ⭐ DİZİLİŞ RAFA GÖRE — depo bir kez dolaşılsın. */
    const rafliListe = [...liste].sort((a, b) => {
      const ra = a.raf ?? "￿";
      const rb = b.raf ?? "￿";
      return ra === rb ? b.tutar - a.tutar : ra.localeCompare(rb, "tr");
    });
    const satirlar = [
      "raf;sku;urun;iadeAdedi;tutarTL;%80icinde;maliyetBilinmiyor",
      ...rafliListe.map((s) =>
        [
          s.raf ?? "(raf yok)",
          s.sku,
          s.urun.replace(/;/g, ","),
          String(s.adet),
          s.tutar.toFixed(2),
          esikte.has(s.sku) ? "EVET" : "hayir",
          s.maliyetsiz ? "EVET" : "",
        ].join(";"),
      ),
    ];
    const cikti = "raporlar/k136c-sayim-listesi.csv";
    writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
    console.log(`\n   ⭐ LİSTE: ${cikti} (${rafliListe.length} satır, RAF sırasında)`);
    console.log("\n   İLK RAFLAR — sayıma buradan başlanır:");
    let basilan = 0;
    let oncekiRaf = "";
    for (const s of rafliListe) {
      if (basilan >= 14) break;
      const r = s.raf ?? "(raf yok)";
      if (r !== oncekiRaf) {
        console.log(`      ── ${r}`);
        oncekiRaf = r;
      }
      console.log(
        `         ${esikte.has(s.sku) ? "⭐" : "  "} ${s.sku.padEnd(16)}` +
          ` ${String(s.adet).padStart(2)} ad  ${para(s.tutar).padStart(12)}` +
          `  ${s.urun.slice(0, 30)}`,
      );
      basilan += 1;
    }
    console.log("\n   ⭐ = ₺ etkisinin %80'ini taşıyan varyantlar.");
    console.log("   ⚠ Süre darsa YALNIZ ⭐ satırları sayılabilir; kalan");
    console.log("     varyantlar listede DURUR ve sayılmadıkları YAZILIR.");
  }

  console.log("\n   ⛔ YAZIM YOK. Toplu yazım kararı bu rapordan sonra,");
  console.log("      Halil onayıyla.");
  console.log("=".repeat(86) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
