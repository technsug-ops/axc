import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  commissionRate GERİYE DOLDURMA — **KURU KOŞUM, YAZMA YOK**
 * ----------------------------------------------------------------------------
 *      npm run canli:komisyon-doldur          → yalnız rapor
 *
 *  ⛔ BU BETİKTE `--yaz` YOK VE BİLEREK YOK. Öneri aşamasındayız; yazma
 *  kapısı ancak kuru koşum onaylandıktan sonra açılır.
 *
 *  ═══ KAYNAK SEÇİMİ — VE NİYE TARİFE DEFTERİ DEĞİL ═══════════════════════
 *
 *  ① **Tarife defteri ELENDİ, iki ayrı sebeple:**
 *     · Ölçüldü: yüklü 3 tarife penceresi var ve oranı boş **5333 kalemin
 *       0 tanesi** bir pencereye düşüyor. Kapsam sıfır.
 *     · Ve zaten YASAKTI: `dilimBul` kendi belgesinde diyor ki
 *       _"Bu FİYATLAMA ARACININ hesabıdır — kayda YAZILMAZ. Kayıt, kanalın
 *       kendi beyanı olan GÜNCEL KOMİSYON'dan gelir (mimar kararı
 *       18.08.2026)."_ Tarife "ne olurdu" sorusunu yanıtlar, "ne oldu"yu değil.
 *
 *  ② **Hakediş ELENDİ (bugünlük):** 1284 hakediş kalemi var ama yalnız 13'ü
 *     bir satışa bağlı. Kaynak önceliğinde 1. basamak ama kapsamı ~%1.
 *
 *  ③ **SATIŞ DOSYASININ KENDİ KOLONU** — kaynak önceliğinde 2. basamak
 *     ("kendi defterimiz"), ve kapsamı geniş: 9673/10197 satırda dolu.
 *
 *  ═══ KOLONUN NE ANLATTIĞI ÖLÇÜLDÜ ═══════════════════════════════════════
 *  `(TUTAR / FİYAT) ÷ ORAN` dağılımı:
 *      5734 satır  ×1,00  → oran KDV HARİÇ, tutar da KDV hariç
 *      3705 satır  ×1,20  → tutar KDV DAHİL (komisyona +%20)
 *        40 satır  başka  → kuyruk, ayrı sayılır
 *
 *  ⚠ İLK OKUMAMDA BU 3705 SATIRI "TUTMAYAN" DİYE SAYDIM — YANLIŞTI.
 *  Sapma değil, Hepsiburada'nın komisyona eklediği %20 KDV. Anayasada
 *  yazılıydı; ölçütüm onu hesaba katmıyordu.
 *
 *  ⛔ BU YÜZDEN YAZILACAK DEĞER `KOMİSYON ORANI` (KDV HARİÇ) OLMALI —
 *  `TUTAR/FİYAT` DEĞİL. Motor KDV'yi kendisi ekliyor: HB'de
 *  `KOMISYON_KDV · PER_ITEM · COMMISSION_AMOUNT · %20` kuralı yüklü.
 *  KDV dahil oran yazılsaydı KDV **iki kez** uygulanırdı.
 * ============================================================================
 */

const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";
const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (n: number) => n.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jSku = J("SKU");
  const jBar = J("AXCALI BARKOD");
  const jUrun = J("Ürün");
  const jKomO = J("KOMİSYON ORANI");
  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  /** Kimlik indeksi — varyant çözümü için. */
  const varyantlar = await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } } },
  });
  const kodVaryant = new Map<string, string>();
  for (const v of varyantlar) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") kodVaryant.set(k.trim(), v.id);
    }
  }

  /**
   * ⛔ ANAHTAR: (sipariş no + varyant). Yalnız sipariş no ile eşleştirmek,
   * çok kalemli siparişte hangi kaleme hangi oranın gideceğini belirsiz
   * bırakırdı. Aynı anahtar birden çok satıra düşüyorsa BELİRSİZ sayılır.
   */
  const dosyaOran = new Map<string, number[]>();
  for (const r of veri) {
    const no = String(r[jSip] ?? "").trim();
    const oran = sayi(r[jKomO]);
    if (no === "" || oran <= 0) continue;
    const vid = kodVaryant.get(String(r[jSku] ?? "").trim()) ??
      kodVaryant.get(String(r[jBar] ?? "").trim());
    if (!vid) continue;
    const anahtar = no + "|" + vid;
    dosyaOran.set(anahtar, [...(dosyaOran.get(anahtar) ?? []), oran]);
  }

  const bosKalemler = await p.saleItem.findMany({
    where: { commissionRate: null, sale: { iptalTarihi: null } },
    select: {
      id: true, variantId: true, quantity: true, unitPriceAmount: true,
      sale: { select: { code: true, channelAccount: { select: { channel: { select: { code: true } } } } } },
    },
  });

  console.log("\n" + "=".repeat(104));
  console.log("commissionRate GERİYE DOLDURMA — KURU KOŞUM (hiçbir şey yazılmaz)");
  console.log("=".repeat(104));
  console.log("\n   oranı boş iptalsiz kalem: " + bosKalemler.length);

  type K = { doldurulabilir: number; belirsiz: number; kodsuz: number; dosyadaYok: number;
    komisyon: number; ciro: number; oranlar: number[] };
  const kanal = new Map<string, K>();
  const al = (k: string) => {
    const v = kanal.get(k) ?? { doldurulabilir: 0, belirsiz: 0, kodsuz: 0, dosyadaYok: 0,
      komisyon: 0, ciro: 0, oranlar: [] };
    kanal.set(k, v);
    return v;
  };

  for (const k of bosKalemler) {
    const v = al(k.sale.channelAccount.channel.code);
    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;
    v.ciro += ciro;
    if (!k.sale.code) { v.kodsuz++; continue; }
    const bulunan = dosyaOran.get(k.sale.code + "|" + k.variantId);
    if (!bulunan) { v.dosyadaYok++; continue; }
    /** ⚠ Aynı anahtarda farklı oranlar varsa BELİRSİZ — yazılmaz. */
    if (new Set(bulunan).size > 1) { v.belirsiz++; continue; }
    v.doldurulabilir++;
    v.oranlar.push(bulunan[0]);
    v.komisyon += (ciro * bulunan[0]) / 100;
  }

  console.log("\n   kanal          boşKalem  DOLDURULABİLİR  belirsiz  kodsuz  dosyadaYok");
  console.log("   " + "─".repeat(74));
  let tD = 0, tKom = 0, tCiro = 0;
  for (const [k, v] of [...kanal].sort((a, b) => b[1].doldurulabilir - a[1].doldurulabilir)) {
    const bos = v.doldurulabilir + v.belirsiz + v.kodsuz + v.dosyadaYok;
    console.log("   " + k.padEnd(14) + String(bos).padStart(9) +
      String(v.doldurulabilir).padStart(16) + String(v.belirsiz).padStart(10) +
      String(v.kodsuz).padStart(8) + String(v.dosyadaYok).padStart(12));
    tD += v.doldurulabilir; tKom += v.komisyon; tCiro += v.ciro;
  }
  console.log("   " + "─".repeat(74));
  console.log("   TOPLAM DOLDURULABİLİR: " + tD + " / " + bosKalemler.length +
    "  (" + ((tD / bosKalemler.length) * 100).toFixed(1) + "%)");

  console.log("\n   ORAN DAĞILIMI — doldurulacak kalemlerde");
  for (const [k, v] of [...kanal].sort((a, b) => b[1].doldurulabilir - a[1].doldurulabilir)) {
    if (v.oranlar.length === 0) continue;
    const srt = [...v.oranlar].sort((a, b) => a - b);
    const y = (q: number) => srt[Math.floor(srt.length * q)];
    console.log("     " + k.padEnd(14) + "n=" + String(srt.length).padStart(5) +
      "  min %" + srt[0].toFixed(2) + " · ortanca %" + y(0.5).toFixed(2) +
      " · p75 %" + y(0.75).toFixed(2) + " · max %" + srt[srt.length - 1].toFixed(2));
  }

  console.log("\n   ⭐ ETKİ — bugün HİÇ DÜŞÜLMEYEN komisyon");
  console.log("     doldurulacak kalemlerin cirosu : " + t2(tCiro));
  console.log("     düşülecek komisyon (KDV hariç) : " + t2(tKom));
  console.log("     ⚠ HB'de motor üstüne %20 KDV EKLER (KOMISYON_KDV kuralı yüklü),");
  console.log("       o yüzden gerçek düşüş bundan BÜYÜK olacak. Burada hesaplanmadı —");
  console.log("       hesaplanan tek şey dosyanın yazdığı KDV HARİÇ orandır.");

  console.log("\n   ⛔ SONRAKİ ADIM YAZMA DEĞİL: doldurulan her satışın kârı");
  console.log("     YENİDEN HESAPLANMALI (`karYenidenYaz`), yoksa `net2Amount` eski");
  console.log("     komisyonsuz hâliyle kalır ve ekran değişmez.");

  console.log("\n" + "=".repeat(104));
  console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI. Bu betikte `--yaz` YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
