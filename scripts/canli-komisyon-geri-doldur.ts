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

/**
 * ⛔ AMAZON HARİÇ — kullanıcı kararı 28.08.2026.
 * 11 kalemin hepsi tam `%1,00`; Amazon TR komisyonu tipik olarak %8–15.
 * Bu bir yer tutucu olabilir ve doğrulanmadan yazılmaz. Ayrı kovada durur;
 * Halil Amazon panelinden gerçek oranı söyleyince girer.
 * _(Anayasa: "imkânsız görünen değer önce doğrulanır — düzeltilmez.")_
 */
const HARIC_KANALLAR = new Set(["AMAZON"]);

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
      sale: {
        select: {
          id: true, code: true,
          channelAccount: { select: { channel: { select: { code: true } } } },
        },
      },
    },
  });

  /** Etkilenecek SATIŞLAR — kâr tazelemesi satış bazında koşar. */
  const etkilenenSatis = new Set<string>();
  /** ⚠ HB'de motor komisyona %20 KDV EKLER; etkiyi iki ayrı sayıda tutuyoruz. */
  let komisyonKdvli = 0;

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

  const haricKova = new Map<string, { kalem: number; ciro: number }>();
  for (const k of bosKalemler) {
    const kanalKodu = k.sale.channelAccount.channel.code;
    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;

    /** ⛔ HARİÇ KANAL — sayılır, listelenir, YAZILMAZ. Sessizce elenmez. */
    if (HARIC_KANALLAR.has(kanalKodu)) {
      const h = haricKova.get(kanalKodu) ?? { kalem: 0, ciro: 0 };
      h.kalem++; h.ciro += ciro;
      haricKova.set(kanalKodu, h);
      continue;
    }

    const v = al(kanalKodu);
    v.ciro += ciro;
    if (!k.sale.code) { v.kodsuz++; continue; }
    const bulunan = dosyaOran.get(k.sale.code + "|" + k.variantId);
    if (!bulunan) { v.dosyadaYok++; continue; }
    /** ⚠ Aynı anahtarda farklı oranlar varsa BELİRSİZ — yazılmaz. */
    if (new Set(bulunan).size > 1) { v.belirsiz++; continue; }
    v.doldurulabilir++;
    v.oranlar.push(bulunan[0]);
    const kom = (ciro * bulunan[0]) / 100;
    v.komisyon += kom;
    /** Hepsiburada'da komisyonun üstüne %20 KDV binecek (KOMISYON_KDV kuralı). */
    komisyonKdvli += kanalKodu === "HEPSIBURADA" ? kom * 1.2 : kom;
    etkilenenSatis.add(k.sale.id);
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

  console.log("\n   ⛔ HARİÇ TUTULANLAR — sayıldı, yazılmayacak");
  if (haricKova.size === 0) console.log("     (yok)");
  for (const [k, v] of haricKova) {
    console.log("     " + k.padEnd(14) + v.kalem + " kalem · " + v.ciro.toFixed(2) + " TL");
    console.log("       gerekçe: oran %1,00 (yer tutucu şüphesi) — Amazon panelinden doğrulanacak");
  }

  console.log("\n   ⭐ ETKİ — bugün HİÇ DÜŞÜLMEYEN komisyon");
  console.log("     etkilenecek SATIŞ sayısı       : " + etkilenenSatis.size);
  console.log("     doldurulacak kalemlerin cirosu : " + t2(tCiro));
  console.log("     komisyon (KDV HARİÇ)           : " + t2(tKom));
  console.log("     komisyon (HB'ye %20 KDV eklenmiş) : " + t2(komisyonKdvli));

  // ── ÖNCE tablosu ───────────────────────────────────────────────────────
  console.log("\n   ÖNCE — bugünkü hâl (üç profitStatus kırılımı)");
  const satislar = await p.sale.findMany({
    where: { iptalTarihi: null },
    select: { id: true, profitStatus: true, net2Amount: true,
      items: { select: { quantity: true, unitPriceAmount: true } } },
  });
  const durum = new Map<string, { n: number; ciro: number; net2: number }>();
  for (const x of satislar) {
    const d = x.profitStatus ?? "(boş)";
    const v = durum.get(d) ?? { n: 0, ciro: 0, net2: 0 };
    v.n++;
    v.ciro += x.items.reduce((t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity, 0);
    if (x.net2Amount !== null) v.net2 += Number(x.net2Amount.toString());
    durum.set(d, v);
  }
  console.log("     durum".padEnd(20) + "satış".padStart(7) + "ciro".padStart(17) +
    "Σ net2".padStart(17) + "marj".padStart(9));
  console.log("     " + "─".repeat(66));
  for (const [d, v] of [...durum].sort((a, b) => b[1].n - a[1].n)) {
    console.log("     " + d.padEnd(20) + String(v.n).padStart(7) +
      v.ciro.toFixed(2).padStart(17) + v.net2.toFixed(2).padStart(17) +
      (v.ciro > 0 ? ((v.net2 / v.ciro) * 100).toFixed(2) + "%" : "—").padStart(9));
  }

  console.log("\n   SONRA — TAHMİN EDİLMİYOR, ÖLÇÜLECEK");
  console.log("     ⛔ NET-2'nin yeni değeri BURADA HESAPLANMAZ: komisyon KDV'si");
  console.log("       indirilecek KDV'ye giriyor ve NET-2 ödenecek KDV'yi de düşüyor.");
  console.log("       Zincirin tamamını yalnız kâr motoru bilir. Tahmini bir rakam");
  console.log("       yazmak, sistemin kendi hesabı sanılacak bir sayı üretirdi.");
  console.log("     → Yazımdan SONRA aynı tablo yeniden basılır ve fark ölçülür.");

  console.log("\n   ⚠ MARJ DÜŞECEK — VE BU BEKLENEN. " + t2(tKom).trim() + " TL komisyon");
  console.log("     ilk kez düşülüyor. Düşüş 'bozuldu' değil, 'İLK KEZ DOĞRU' demektir.");

  console.log("\n   ⛔ YAZMA TEK BAŞINA YETMEZ: her etkilenen satış `karYenidenYaz` ile");
  console.log("     tazelenmeli, yoksa `net2Amount` komisyonsuz hâliyle kalır ve ekran");
  console.log("     hiç değişmez. Yazım ile tazeleme AYNI turda, ayrılmaz.");

  console.log("\n" + "=".repeat(104));
  console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI. Bu betikte `--yaz` YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
