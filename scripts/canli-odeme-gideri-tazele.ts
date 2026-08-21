/**
 * ============================================================================
 *  ÖDEME GİDERİ MATRAH DÜZELTMESİ — ETKİLENEN SATIŞLARIN KÂRINI TAZELE
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:odeme-tazele             → YALNIZ RAPOR, hiçbir şey yazmaz
 *      npm run canli:odeme-tazele -- --uygula → kârı yeniden yazar
 *
 *  ⚠ NİYE AYRI BİR BETİK — `canli:kar-tazele` BU İŞİ YAPMAZ.
 *  O betiğin etki alanı "adedi düşürülmüş satışlar"dır (`saleItemId` dolu
 *  POZİTİF hareket). Bizim kümemiz bambaşka: ödeme gideri taşıyan HB
 *  satışları. Onu çalıştırmak yanlış hedefi vururdu — araç var diye doğru
 *  araç olduğu varsayılmaz.
 *
 *  ── DÜZELTİLEN HATA ─────────────────────────────────────────────────────
 *  Kâr motoru `SALE_AMOUNT` matrahı olarak KDV HARİÇ toplamı kullanıyordu.
 *  Anayasa: _"%0,8 ödeme gideri — sipariş tutarının binde sekizi, 100 TL'de
 *  80 kuruş"_. HB'nin kendi ekstresi de ölçüldü (113 sipariş, %0,8000) ve
 *  matrahın KDV DAHİL olduğu aynı dosyadaki stopaj oranıyla teyit edildi.
 *  Motor 21.08.2026'da düzeltildi; bu betik GEÇMİŞİ tazeler.
 *
 *  ── SNAPSHOT DOKUNULMAZLIĞI BURAYA GİRMEZ ───────────────────────────────
 *  Kural, DOĞRU koşullarla hesaplanmış bir snapshot'ı sonraki
 *  değişikliklerden korumak içindir. Yanlış matrahla hesaplanmış bir
 *  snapshot o kapsama girmez: orada korunan geçmiş değil, HATANIN KENDİSİDİR.
 *
 *  ── STOK DEFTERİNE DOKUNMAZ ─────────────────────────────────────────────
 *  Tek satır bile stok hareketi yazmaz/silmez. Yalnız satışın kâr alanları
 *  ve `SaleFee` dökümü motorun düzeltilmiş hâliyle yeniden üretilir.
 *
 *  ⚠ VE FARK YALNIZ ÖDEME GİDERİNDEN GELMEYEBİLİR: `karYenidenYaz` her şeyi
 *  GÜNCEL kurallarla yeniden hesaplar. Bu yüzden rapor kipi kalem kalem
 *  ESKİ ve YENİ değerleri basar; beklenmeyen bir kalem oynarsa uygulamadan
 *  ÖNCE görülür.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { kdvDahilKargo } from "../src/lib/kargo-kdv";
import { canliYapilandirma } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");
/**
 * ⚠ AYRINTI KİPİ — NİYE VAR (21.08.2026).
 * İlk önizlemede ödeme gideri ARTTI ama NET-2 de ARTTI. Bu olamaz: daha çok
 * kesinti, daha az kâr demektir. Demek ki tazeleme, düzeltilen kalemden
 * BAŞKA bir şeyi de değiştiriyordu. Kalem kalem görmeden yazmak, açıklaması
 * olmayan bir rakamı deftere geçirmek olurdu.
 */
const AYRINTI = process.argv.includes("--ayrinti");

const para = (d: unknown): string =>
  d === null || d === undefined
    ? "?"
    : Number(d.toString()).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/**
 * ============================================================================
 *  KARGO — KAYITTAKİ TUTAR, KDV DAHİL BİRİMDE
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ AYRI BİRİM VAR VE İLK DENEMEDE KARIŞTIRILDI:
 *    · `Sale.cargoAmount`                        → "tarifeden okunan KDV HARİÇ"
 *    · `YenidenHesaplaGirdisi.cargoAmountManual` → "elle girilen KDV DAHİL"
 *  Birincisi ikincisine verildi ve kargo 107,90 yerine 89,92 çıktı — tam
 *  olarak 1,20'ye bölünmüş hâli. Alan adı makul göründüğü için sorgulanmadı;
 *  "kolon başlığı bir iddiadır" dersinin aynısı.
 *
 *  ⚠ VE DAHA BÜYÜK BİR ŞEY GÖRÜNDÜ: `karOnizle`, `cargoAmountManual` boşsa
 *  kargoyu BUGÜNKÜ tarifeden yeniden çözüyor — satışın üstündeki
 *  `cargoAmount` SNAPSHOT'INI hiç okumuyor. Yani kâr tazeleyen her yol,
 *  geçmiş kargo maliyetini bugünün fiyatıyla ezme riski taşıyor. Bu betiğin
 *  kapsamı dışında, ayrıca bildirildi.
 *
 *  ÖNCELİK: fiilen kesilen tutar (`SaleFee` KARGO, KDV dahil). Yoksa snapshot
 *  KDV dahile çevrilir. İkisi de yoksa null döner ve tarife çözülür — o da
 *  raporda `⚠ KARGO` satırı olarak görünür.
 * ============================================================================
 */
function kargoDegeri(
  fees: { code: string; amount: unknown }[],
  snapshotHaric: unknown,
): number | null {
  const kesilen = fees
    .filter((f) => f.code === "KARGO")
    .reduce((a, f) => a + Math.abs(Number(f.amount)), 0);
  if (kesilen > 0) return kesilen;
  if (snapshotHaric === null || snapshotHaric === undefined) return null;
  return kdvDahilKargo(Number(snapshotHaric));
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  // ADRESİ ÖNCE KUR — motor modülü yüklenmeden (yoksa canlıdan okuyup yerele yazar).
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  console.log("");
  console.log("ÖDEME GİDERİ MATRAH DÜZELTMESİ — KÂR TAZELEME");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  kip        ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  const { prisma } = await import("../src/lib/prisma");
  const { karOnizle, karYenidenYaz } = await import("../src/lib/kar-yeniden");

  /**
   * ETKİ ALANI — DEFTERDEN GELİR, HATIRLAMADAN DEĞİL.
   * Ödeme gideri kesintisi taşıyan her satış: matrahı yanlış hesaplanmış
   * olan tam olarak bu kümedir.
   */
  const kesintili = await prisma.saleFee.findMany({
    where: { code: "ODEME_GIDERI" },
    select: { saleId: true },
    distinct: ["saleId"],
  });
  const satisIdleri = kesintili.map((k) => k.saleId);

  if (satisIdleri.length === 0) {
    console.log("  Ödeme gideri taşıyan satış YOK — tazelenecek kayıt yok.");
    return;
  }

  const satislar = await prisma.sale.findMany({
    where: { id: { in: satisIdleri } },
    select: {
      id: true,
      soldAt: true,
      iptalTarihi: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      paketSayisi: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        orderBy: { id: "asc" },
        select: { id: true, commissionRate: true },
      },
      fees: { select: { code: true, amount: true } },
    },
    orderBy: { soldAt: "asc" },
  });

  console.log(`  ETKİLENEN SATIŞ: ${satislar.length}`);
  console.log("");

  let eskiNet2 = 0;
  let yeniNet2 = 0;
  let tazelenen = 0;
  let atlanan = 0;

  for (const s of satislar) {
    const eskiOdeme = s.fees
      .filter((f) => f.code === "ODEME_GIDERI")
      .reduce((t, f) => t + Math.abs(Number(f.amount)), 0);
    const eski2 = s.net2Amount === null ? null : Number(s.net2Amount);

    /**
     * ⚠ RAPOR KİPİ DE GERÇEK RAKAM GÖSTERİR. İlk sürüm yalnız ESKİ değerleri
     * basıyordu; "yazmadan önce ne olacağını gör" sözünü tutmuyordu. `karOnizle`
     * tam bunun için var: hesaplar ama YAZMAZ.
     */
    const girdi = {
      saleId: s.id,
      /** Komisyon DEĞİŞMİYOR — kayıttaki oran aynen geri veriliyor. */
      kalemler: s.items.map((k) => ({
        saleItemId: k.id,
        commissionRate:
          k.commissionRate === null ? null : Number(k.commissionRate),
        commissionAmount: null,
      })),
      cargoCarrierId: s.cargoCarrierId,
      cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi),
      /**
       * ⚠ ALAN ADI `cargoAmountManual` — elle girilen KDV DAHİL tutar.
       * Doluysa tarife kullanılmaz; kayıttaki değer aynen geri veriliyor
       * ki tazeleme kargoyu DEĞİŞTİRMESİN.
       */
      /**
       * ⚠ KARGO KAYITTAKİ TUTARA ÇİVİLENİYOR — VE BU ÖLÇÜMLE ÖĞRENİLDİ.
       *
       * İlk önizlemede ödeme gideri ARTTIĞI HÂLDE NET-2 de ARTMIŞTI; olamazdı.
       * Ayrıntı kipi sebebi gösterdi: KARGO 107,90 → 89,92. `karYenidenYaz`
       * kargoyu TARİFEDEN yeniden çözüyor ve tarife o günden bu yana değişmiş.
       * Yani tazeleme, düzeltmek istediğim kalemin yanında GEÇMİŞ KARGO
       * MALİYETİNİ de bugünün fiyatıyla ezecekti.
       *
       * Anayasa: "aynı veri, farklı soruya farklı pencereden bakar" —
       * "o gün ne geçerliydi" sorusunun penceresi KAYDIN TARİHİDİR. Bu yüzden
       * kayıtlı KARGO kesintisi elle girilmiş tutar gibi veriliyor: tarife hiç
       * sorgulanmıyor, geçmiş olduğu gibi kalıyor.
       */
      cargoAmountManual: kargoDegeri(s.fees, s.cargoAmount),
      /**
       * ⚠ PAKET SAYISI GİRDİDE YOK — `karOnizle` onu satıştan kendisi
       * okuyor (kar-yeniden.ts:173). Buradan geçirmek ikinci bir kaynak
       * açardı ve ikisi bir gün ayrışırdı.
       */
    };

    const onizleme = await karOnizle(girdi);
    if (onizleme === null) {
      atlanan++;
      console.log(`  ATLANDI  ${s.id}  (önizleme üretilemedi)`);
      continue;
    }
    if (UYGULA) await karYenidenYaz(girdi);

    const yeniOdeme = onizleme.yeni.siparisKesintileri
      .filter((k) => k.code === "ODEME_GIDERI")
      .reduce((t, k) => t + Math.abs(k.tutar), 0);
    const yeni2 = onizleme.yeni.net2;

    if (eski2 !== null) eskiNet2 += eski2;
    yeniNet2 += yeni2;
    tazelenen++;

    if (AYRINTI) {
      /** Eski ve yeni kesinti dökümü KOD KOD — hangi kalemin oynadığı görünsün. */
      const eskiHarita = new Map<string, number>();
      for (const f of s.fees)
        eskiHarita.set(
          f.code,
          (eskiHarita.get(f.code) ?? 0) + Math.abs(Number(f.amount)),
        );
      const yeniHarita = new Map<string, number>();
      for (const k of onizleme.yeni.siparisKesintileri)
        yeniHarita.set(
          k.code,
          (yeniHarita.get(k.code) ?? 0) + Math.abs(k.tutar),
        );
      for (const k of onizleme.yeni.kalemler)
        for (const kk of k.kesintiler)
          yeniHarita.set(
            kk.code,
            (yeniHarita.get(kk.code) ?? 0) + Math.abs(kk.tutar),
          );

      console.log(`  ── ${s.id}  ${s.soldAt.toISOString().slice(0, 10)}`);
      for (const kod of new Set([...eskiHarita.keys(), ...yeniHarita.keys()])) {
        const e = eskiHarita.get(kod) ?? 0;
        const yn = yeniHarita.get(kod) ?? 0;
        const isaret = Math.abs(e - yn) < 0.005 ? "  " : "⚠ ";
        console.log(
          `     ${isaret}${kod.padEnd(16)} ${para(e).padStart(10)} → ${para(yn).padStart(10)}`,
        );
      }
    }

    const kanal = s.channelAccount?.channel.name ?? "—";
    console.log(
      `  ${s.soldAt.toISOString().slice(0, 10)}  ${kanal.padEnd(14)} ödeme ${para(eskiOdeme).padStart(8)}${` → ${para(yeniOdeme).padStart(8)}`}   NET-2 ${para(eski2).padStart(10)} → ${para(yeni2).padStart(10)}`,
    );
  }

  console.log("");
  console.log(`  tazelenen        ${tazelenen}`);
  console.log(`  atlanan          ${atlanan}`);
  console.log(
    `  NET-2 toplamı    ${para(eskiNet2)} → ${para(yeniNet2)}   fark ${para(yeniNet2 - eskiNet2)}`,
  );
  if (!UYGULA) {
    console.log("");
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Uygulamak için:  npm run canli:odeme-tazele -- --uygula");
  }
  console.log("");
}

main().finally(async () => {
  const { prisma } = await import("../src/lib/prisma");
  await prisma.$disconnect();
});
