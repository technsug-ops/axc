/**
 * ============================================================================
 *  HAKEDİŞ CANLI TEYİDİ — ÖN UÇUŞ ÖLÇÜMÜ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:hakedis-teyit
 *
 *  HİÇBİR ŞEY YAZMAZ.
 *
 *  ⚠ NİYE ÖNCE BU KOŞULUYOR — "kural teslim edilebilir mi" süzgeci.
 *
 *  Mimar isteği: _"sistemin 'kanal bana ne ödeyecek' iddiası ilk kez gerçek
 *  ödemeyle sınansın."_ O sınavın çalışabilmesi bir VARSAYIMA dayanıyor:
 *  rapor kalemlerinin satışlara BAĞLANMIŞ olması. Bağlanmamışsa ekran her
 *  satırda "GELMEDİ" der ve test hiçbir şey kanıtlamaz — yeşil de yanmaz,
 *  kırmızı da; sadece boş çıkar.
 *
 *  Bu varsayım daha önce ÖLÇÜLDÜ ve YANLIŞ çıktı: 13.08.2026'da 651 hakediş
 *  kaleminin **0 tanesi** bir satışa bağlıydı; 15.08.2026'da 110 kalemin
 *  hiçbiri. Eşleştirme yükleme anında yapılıyor, yani eski yüklemeler
 *  satışlar girilmeden önce yapılmışsa bağ hiç kurulmamış olabilir.
 *
 *  BU YÜZDEN TEST LİSTESİ VERİLMEDEN ÖNCE BU BETİK KOŞULUR. Çıktı testin
 *  koşulabilir olup olmadığını söyler.
 *
 *  ── AYRICA: İPTAL ↔ HAKEDİŞ ASİMETRİSİ ──────────────────────────────────
 *  Betik ayrıca iptal edilmiş olduğu hâlde hakediş kalemi taşıyan satışları
 *  listeler. Nakit takvimi rapor kalemlerini iptal süzgecinden GEÇİRMİYOR
 *  (tahmin tarafı geçiriyor). Bu bilinçli bir karar mı yoksa boşluk mu,
 *  gerçek veriye bakılarak konuşulsun diye ölçülüyor.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import {
  beklenenHakedis,
  beklenenVade,
  odemeDurumu,
} from "../src/lib/hakedis/eslestir";
import { HAKEDIS_ESIKLERI } from "../src/lib/hakedis/model";
import { gunDegeri, isTakvimGunu } from "../src/lib/donem";
import { canliYapilandirma } from "./canli-ortak";

function para(d: number | null): string {
  if (d === null) return "—";
  return d.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
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
  console.log("HAKEDİŞ CANLI TEYİDİ — ÖN UÇUŞ");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log("");

  const bugun = gunDegeri(isTakvimGunu(new Date()));

  // --- 1) TEST KOŞULABİLİR Mİ ----------------------------------------------
  const [partiSayisi, kalemSayisi, bagliSayisi] = await Promise.all([
    prisma.settlement.count(),
    prisma.settlementItem.count(),
    prisma.settlementItem.count({ where: { saleId: { not: null } } }),
  ]);

  console.log("  ── 1) TEST KOŞULABİLİR Mİ ─────────────────────────────────");
  console.log(`     yüklenmiş rapor partisi   ${partiSayisi}`);
  console.log(`     hakediş kalemi            ${kalemSayisi}`);
  console.log(`     ...satışa BAĞLI olan      ${bagliSayisi}`);
  if (kalemSayisi > 0) {
    const oran = Math.round((bagliSayisi / kalemSayisi) * 100);
    console.log(`     eşleşme oranı             %${oran}`);
  }
  if (bagliSayisi === 0) {
    console.log("");
    console.log("     ⚠ TEST BU HÂLİYLE BOŞ ÇIKAR.");
    console.log("       Hiçbir kalem satışa bağlı değil; karşılaştırma");
    console.log("       ekranı her satırda 'GELMEDİ' der. Eşleştirme YÜKLEME");
    console.log("       anında yapılır — satışlar girildikten SONRA yeni bir");
    console.log("       rapor yüklenmeli ki bağ kurulsun.");
  }
  console.log("");

  // --- 2) BEKLENEN vs GERÇEKLEŞEN ------------------------------------------
  /**
   * EKRANLA AYNI HESAP: `beklenenHakedis` ve `odemeDurumu` ekranın
   * kullandığı fonksiyonların ta kendisi. Betik kendi formülünü yazsaydı
   * "betik şunu diyor ama ekran bunu diyor" diye ikinci bir tartışma açardı.
   */
  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null },
    select: {
      id: true,
      code: true,
      soldAt: true,
      net1Amount: true,
      profitCurrency: true,
      fees: { where: { code: "MALIYET" }, select: { amount: true } },
      channelAccount: {
        select: { payoutDays: true, payoutDaysAreBusinessDays: true },
      },
      settlementItems: {
        select: { amount: true, currency: true, dueDate: true, paidAt: true },
      },
    },
    orderBy: { soldAt: "desc" },
  });

  const karsilastirilan = satislar.filter((s) => s.settlementItems.length > 0);

  console.log("  ── 2) BEKLENEN vs GERÇEKLEŞEN ─────────────────────────────");
  /**
   * ⚠ EŞİK BEYANLI — mimar şartı 18.08.2026. Hangi farkın "uyuştu",
   * hangisinin "UYUŞMUYOR" sayıldığı yazılı olmadan tablo okunamaz;
   * okuyan kendi eşiğini varsayar.
   */
  console.log(`     eşik: tutar farkı ±${HAKEDIS_ESIKLERI.tutarFarki} · gecikme ${HAKEDIS_ESIKLERI.gecikmeIsGunu} iş günü`);
  console.log(`     kuruş farkı UYUŞMUYOR sayılmaz; eşiğin altı "eşleşti".`);
  console.log(`     kalemi olan satış         ${karsilastirilan.length}`);
  console.log("");

  if (karsilastirilan.length > 0) {
    console.log(
      `     ${doldur("sipariş", 16)} ${doldur("beklenen", 12)} ${doldur("gerçekleşen", 12)} ${doldur("fark", 11)} durum`,
    );

    /** Kural #15 — tek tek gösterilen yerde toplam da olur. */
    let toplamBeklenen = 0;
    let toplamGerceklesen = 0;
    let eksikBilgi = 0;
    const durumSayaci = new Map<string, number>();

    for (const s of karsilastirilan) {
      const maliyet = s.fees.reduce((t, f) => t + Number(f.amount.toString()), 0);
      const beklenen = beklenenHakedis(
        s.net1Amount === null ? null : Number(s.net1Amount.toString()),
        maliyet,
      );
      const gerceklesen = s.settlementItems.reduce(
        (t, k) => t + Number(k.amount.toString()),
        0,
      );
      let vade: Date | null = null;
      let odendi = true;
      for (const k of s.settlementItems) {
        if (k.dueDate && (!vade || k.dueDate > vade)) vade = k.dueDate;
        if (!k.paidAt) odendi = false;
      }
      const durum = odemeDurumu({
        beklenenTutar: beklenen,
        gerceklesenTutar: gerceklesen,
        vade,
        odendiMi: odendi,
        bugun,
        kalemVarMi: true,
      });
      durumSayaci.set(durum, (durumSayaci.get(durum) ?? 0) + 1);

      if (beklenen === null) eksikBilgi++;
      else {
        toplamBeklenen += beklenen;
        toplamGerceklesen += gerceklesen;
      }

      console.log(
        `     ${doldur(s.code ?? "—", 16)} ${doldur(para(beklenen), 12)} ${doldur(para(gerceklesen), 12)} ` +
          `${doldur(beklenen === null ? "—" : para(gerceklesen - beklenen), 11)} ${durum}`,
      );
    }

    console.log("");
    console.log(`     TOPLAM beklenen           ${para(toplamBeklenen)}`);
    console.log(`     TOPLAM gerçekleşen        ${para(toplamGerceklesen)}`);
    console.log(`     FARK                      ${para(toplamGerceklesen - toplamBeklenen)}`);
    if (eksikBilgi > 0) {
      console.log(`     ⚠ ${eksikBilgi} satışta beklenen HESAPLANAMADI (kâr yok) — toplama girmedi`);
    }
    console.log("");
    console.log(
      `     durum dağılımı            ${[...durumSayaci.entries()].map(([d, n]) => `${d}:${n}`).join(" · ")}`,
    );
    console.log("");
  }

  // --- 3) İPTAL ↔ HAKEDİŞ ASİMETRİSİ ---------------------------------------
  /**
   * İPTAL EDİLMİŞ AMA HAKEDİŞ KALEMİ OLAN SATIŞLAR.
   *
   * Nakit takvimi iki kaynaktan besleniyor ve ikisi iptali FARKLI ele alıyor:
   *   · TAHMİN (satıştan)  → `iptalTarihi: null` süzgeci VAR
   *   · RAPOR (hakedişten) → süzgeç YOK
   *
   * Yani iptal edilmiş bir satışın rapor kalemi hâlâ "girecek para" sayılır.
   * Bunun doğru mu yanlış mı olduğu bir İŞ kararıdır (kanal raporu kanalın
   * kendi beyanıdır; bizim iptalimiz onu geri almaz) — ama karar VERİLMEDİ,
   * durum ölçülmedi. Önce ölçülüyor.
   */
  const iptalliAmaKalemli = await prisma.sale.findMany({
    where: { iptalTarihi: { not: null }, settlementItems: { some: {} } },
    select: {
      code: true,
      iptalTarihi: true,
      settlementItems: {
        select: { amount: true, currency: true, dueDate: true, paidAt: true },
      },
    },
  });

  console.log("  ── 3) İPTAL ↔ HAKEDİŞ ASİMETRİSİ ──────────────────────────");
  console.log(`     iptalli AMA hakediş kalemi olan satış: ${iptalliAmaKalemli.length}`);
  if (iptalliAmaKalemli.length === 0) {
    console.log("     Bugün için sorun DOĞMAMIŞ — karar acil değil, ama açık.");
  } else {
    let acikPara = 0;
    for (const s of iptalliAmaKalemli) {
      const tutar = s.settlementItems.reduce(
        (t, k) => t + Number(k.amount.toString()),
        0,
      );
      const odenmemis = s.settlementItems.some((k) => k.paidAt === null);
      if (odenmemis) acikPara += tutar;
      console.log(
        `     ${doldur(s.code ?? "—", 16)} ${doldur(para(tutar), 12)} ${odenmemis ? "ÖDENMEMİŞ → takvimde GİRECEK sayılıyor" : "ödenmiş"}`,
      );
    }
    console.log("");
    console.log(`     ⚠ Takvimde hâlâ beklenen para: ${para(acikPara)}`);
  }
  console.log("");

  // --- 4) VADE KURALI — TARİH TARAFI ---------------------------------------
  /**
   * ⚠ MİMAR NOTU 18.08.2026: "eski ekstreler öngörüyü sınayamaz, çünkü
   * onlar iddiadan ÖNCE girdi."
   *
   * Tutar için bu doğrudur. TARİH için TAM DOĞRU DEĞİL ve fark işe yarar:
   * `beklenenVade` tahmini, kanal hesabının `payoutDays` AYARINDAN üretilir
   * — rapordan değil. Yani ayarın ürettiği tarih ile raporun söylediği
   * tarih BAĞIMSIZ iki kaynaktır ve geçmişe dönük karşılaştırılabilir.
   *
   * Bu, "kanal bana NE ZAMAN ödeyecek" iddiasının kuralını bugün sınar.
   * "NE KADAR" tarafının ileri dönük sınavı için taze döküm gerekir.
   */
  console.log("  ── 4) VADE KURALI (ayar tahmini vs raporun tarihi) ────────");
  let vadeOlculen = 0;
  let vadeTutan = 0;
  const sapmalar: number[] = [];
  for (const s of karsilastirilan) {
    const rapordaki = s.settlementItems
      .map((k) => k.dueDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (!rapordaki) continue;

    /** AYARDAN tahmin — rapordaki vade BİLE BİLE verilmiyor. */
    const tahmin = beklenenVade(
      s.soldAt,
      null,
      s.channelAccount.payoutDays,
      s.channelAccount.payoutDaysAreBusinessDays,
    );
    if (tahmin === null) continue;

    vadeOlculen++;
    const gunFarki = Math.round(
      (rapordaki.getTime() - tahmin.tarih.getTime()) / 86400000,
    );
    sapmalar.push(gunFarki);
    if (gunFarki === 0) vadeTutan++;
  }

  if (vadeOlculen === 0) {
    console.log("     Ölçülebilir satış YOK (rapor vadesi ya da payoutDays eksik).");
  } else {
    sapmalar.sort((a, b) => a - b);
    const ortanca = sapmalar[Math.floor(sapmalar.length / 2)];
    console.log(`     ölçülen satış             ${vadeOlculen}`);
    console.log(`     GÜNÜ GÜNÜNE tutan         ${vadeTutan}`);
    console.log(`     sapma (gün)  en az ${sapmalar[0]} · ortanca ${ortanca} · en çok ${sapmalar[sapmalar.length - 1]}`);
    console.log("");
    console.log("     Ortanca sıfırdan uzaksa ayardaki payoutDays gerçeği");
    console.log("     temsil etmiyor demektir — nakit takvimi o kadar kayar.");
  }
  console.log("");

  await prisma.$disconnect();
}

main();
