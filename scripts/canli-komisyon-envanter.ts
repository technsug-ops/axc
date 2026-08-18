/**
 * ============================================================================
 *  KOMİSYON ENVANTERİ — AŞAMA 0 ZEMİN RAPORU
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:komisyon-envanter
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da yoktur.
 *
 *  ⚠ NİYE VAR — Aşama 1'in (fiyatlama aracı) girdisi budur. Dilim
 *  simülasyonu, elimizdeki oranların HÂLİ bilinmeden kurulamaz: oran boşsa
 *  simülasyon uydurur, bayatsa yanlış dilimi önerir.
 *
 *  ⚠ AYRICA DEPODA BÖYLE BİR KOMUT YOKTU (ölçüldü 18.08.2026).
 *  `komisyon:dogrula` saf hesabı sınar (veritabanına gitmez),
 *  `komisyon:prova` YEREL ve YAZAN bir uçtan uca provadır (canlıda
 *  çalışmayı reddeder). İkisi de envanter değildir.
 *
 *  ── DÖRT BÖLÜM ──────────────────────────────────────────────────────────
 *  1. DOLULUK      — kaç kanal SKU'sunda oran var, kaçında yok
 *  2. YAŞ          — oran ne zaman güncellendi; haftalık ritme göre bayat mı
 *  3. SNAPSHOT TAZELİĞİ (en kritik) — satışa yazılan oran ile bugünkü
 *                    kayıtlı oran farklı mı
 *  4. DİLİM        — kayıtlarımız fiyat aralığı taşıyor mu
 *
 *  ── 3. BÖLÜM NİYE EN KRİTİK ─────────────────────────────────────────────
 *  Satış anında oran KAYDA GEÇİRİLİR (snapshot) ve kâr o oranla hesaplanır.
 *  Bu doğru bir tasarımdır — oran sonradan değişse eski satışın hesabı
 *  kaymaz. AMA bir varsayıma dayanır: **satış anındaki oranın GÜNCEL
 *  olduğu.** O varsayım bugüne kadar hiç ölçülmedi.
 *
 *  Oran haftalık değişiyor (TY salı, HB çarşamba). Kanal SKU'sundaki değer
 *  güncellenmeden satış girilmişse, snapshot BAYAT bir oranı dondurur ve o
 *  satışın kârı sessizce yanlış kalır — düzeltilmediği sürece kalıcı.
 * ============================================================================
 */

import { gunDegeri, isTakvimGunu } from "../src/lib/donem";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Kaç günlük satış taranacak. */
const GERIYE_GUN = 60;

/**
 * Oranın haftalık güncellendiği gün (0=Paz … 6=Cmt).
 * _Kaynak: CLAUDE.md iş sabitleri — Trendyol Salı, Hepsiburada Çarşamba._
 */
const GUNCELLEME_GUNU: Record<string, number> = {
  Trendyol: 2,
  Hepsiburada: 3,
};

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

function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
}

/**
 * Verilen haftanın gününe göre EN SON güncelleme tarihi.
 * Bugün o günse bugünü sayar — güncelleme günü henüz geçmemiş olabilir,
 * o yüzden "bayat" hükmü bir sonraki bölümde eşikle veriliyor.
 */
function sonGuncellemeGunu(bugun: Date, haftaninGunu: number): Date {
  const d = new Date(bugun);
  const fark = (d.getUTCDay() - haftaninGunu + 7) % 7;
  d.setUTCDate(d.getUTCDate() - fark);
  return d;
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

  /** "Bugün" İŞ saat diliminden — anayasa kuralı, ortamdan okunmaz. */
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  console.log("");
  console.log("KOMİSYON ENVANTERİ — AŞAMA 0 ZEMİN RAPORU");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log(`  bugün      ${gun(bugun)} (Europe/Istanbul)`);
  console.log("");

  // ==========================================================================
  //  1) DOLULUK
  // ==========================================================================
  const kayitlar = await prisma.channelSku.findMany({
    where: { isActive: true },
    select: {
      channelSku: true,
      commissionRate: true,
      commissionUpdatedAt: true,
      variant: { select: { product: { select: { name: true } } } },
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
  });

  console.log("  ── 1) ORAN DOLULUĞU ───────────────────────────────────────");
  console.log(`     aktif kanal SKU'su: ${kayitlar.length}`);

  type Ozet = { toplam: number; dolu: number; enEski: Date | null; enYeni: Date | null };
  const kanalOzeti = new Map<string, Ozet>();
  for (const k of kayitlar) {
    const ad = k.channelAccount.channel.name;
    const o = kanalOzeti.get(ad) ?? { toplam: 0, dolu: 0, enEski: null, enYeni: null };
    o.toplam++;
    if (k.commissionRate !== null) o.dolu++;
    const t = k.commissionUpdatedAt;
    if (t) {
      if (!o.enEski || t < o.enEski) o.enEski = t;
      if (!o.enYeni || t > o.enYeni) o.enYeni = t;
    }
    kanalOzeti.set(ad, o);
  }

  const toplamDolu = kayitlar.filter((k) => k.commissionRate !== null).length;
  console.log(`     oranı TANIMLI:      ${toplamDolu}`);
  console.log(`     oranı BOŞ:          ${kayitlar.length - toplamDolu}`);
  console.log("");
  console.log(`     ${doldur("kanal", 16)} ${doldur("dolu/toplam", 14)} ${doldur("en eski", 12)} en yeni`);
  for (const [ad, o] of [...kanalOzeti.entries()].sort()) {
    console.log(
      `     ${doldur(ad, 16)} ${doldur(`${o.dolu}/${o.toplam}`, 14)} ${doldur(gun(o.enEski), 12)} ${gun(o.enYeni)}`,
    );
  }
  /**
   * BOŞ ORAN SESSİZ DEĞİL: oran yoksa satış formu öneri veremez ve kâr
   * ya elle girilen bir orana ya da hiçbir şeye dayanır.
   */
  if (kayitlar.length - toplamDolu > 0) {
    console.log("");
    console.log("     ⚠ Oranı boş kayıtlarda satış formu ÖNERİ veremez;");
    console.log("       kâr elle girilen orana dayanır ya da hesaplanamaz.");
  }
  console.log("");

  // ==========================================================================
  //  2) YAŞ — HAFTALIK RİTME GÖRE BAYAT MI
  // ==========================================================================
  console.log("  ── 2) ORAN YAŞI ───────────────────────────────────────────");
  console.log("     Oran haftalık değişir: Trendyol SALI, Hepsiburada ÇARŞAMBA.");
  console.log("     Ölçüt: son güncelleme günü geçtiği hâlde oran güncellenmemişse ŞÜPHELİ.");
  console.log("");

  for (const [ad, o] of [...kanalOzeti.entries()].sort()) {
    const haftaninGunu = GUNCELLEME_GUNU[ad];
    if (haftaninGunu === undefined) {
      console.log(
        `     ${doldur(ad, 16)} güncelleme ritmi TANIMSIZ — bayatlık ölçülemedi`,
      );
      continue;
    }
    const sinir = sonGuncellemeGunu(bugun, haftaninGunu);
    const bayatlar = kayitlar.filter(
      (k) =>
        k.channelAccount.channel.name === ad &&
        k.commissionRate !== null &&
        (k.commissionUpdatedAt === null || k.commissionUpdatedAt < sinir),
    );
    console.log(
      `     ${doldur(ad, 16)} son güncelleme günü ${gun(sinir)} → BAYAT ${bayatlar.length}/${o.dolu}`,
    );
  }
  console.log("");
  console.log("     ⚠ 'Bayat' KESİN HATA DEĞİLDİR: oran o hafta değişmemiş de");
  console.log("       olabilir. Sinyaldir — hangi kanalın oranlarına bakılacağını");
  console.log("       söyler, tek başına yanlışlık iddia etmez.");
  console.log("");

  // ==========================================================================
  //  3) SNAPSHOT TAZELİĞİ — EN KRİTİK
  // ==========================================================================
  console.log("  ── 3) SNAPSHOT TAZELİĞİ (en kritik) ───────────────────────");
  console.log(`     Son ${GERIYE_GUN} günün satışları: satışa YAZILAN oran ile`);
  console.log("     bugünkü KAYITLI oran karşılaştırılıyor.");
  console.log("");

  const geriye = new Date(bugun);
  geriye.setUTCDate(geriye.getUTCDate() - GERIYE_GUN);

  const kalemler = await prisma.saleItem.findMany({
    where: {
      commissionRate: { not: null },
      sale: { soldAt: { gte: geriye }, iptalTarihi: null },
    },
    select: {
      quantity: true,
      unitPriceAmount: true,
      commissionRate: true,
      variantId: true,
      variant: { select: { product: { select: { name: true } } } },
      sale: {
        select: {
          code: true,
          soldAt: true,
          channelAccountId: true,
          channelAccount: { select: { channel: { select: { name: true } } } },
        },
      },
    },
  });

  /** Bugünkü kayıtlı oran: (kanal hesabı + varyant) ikilisinden. */
  const guncelOranlar = new Map<string, number>();
  for (const k of await prisma.channelSku.findMany({
    where: { isActive: true, commissionRate: { not: null } },
    select: { channelAccountId: true, variantId: true, commissionRate: true },
  })) {
    guncelOranlar.set(
      `${k.channelAccountId}|${k.variantId}`,
      Number(k.commissionRate!.toString()),
    );
  }

  let esit = 0;
  let farkli = 0;
  let karsiligiYok = 0;
  let toplamEtki = 0;
  const satirlar: string[] = [];

  for (const k of kalemler) {
    const anahtar = `${k.sale.channelAccountId}|${k.variantId}`;
    const guncel = guncelOranlar.get(anahtar);
    const snapshot = Number(k.commissionRate!.toString());

    if (guncel === undefined) {
      karsiligiYok++;
      continue;
    }
    if (Math.abs(guncel - snapshot) < 0.005) {
      esit++;
      continue;
    }
    farkli++;

    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;
    /**
     * ETKİ TAHMİNİ — komisyon farkı. NET-2'ye etkisi bundan biraz AZDIR:
     * komisyon değişince KDV mahsubu ve stopaj matrahı da kayar, ayrıca
     * HB'de komisyona KDV eklenir, TY'de eklenmez. Bu yüzden rakam
     * "tahmin" diye yazılıyor — kesin NET-2 farkı motordan çıkar.
     */
    const etki = (ciro * (guncel - snapshot)) / 100;
    toplamEtki += etki;

    satirlar.push(
      `     ${doldur(k.sale.code ?? "—", 14)} ${doldur(k.sale.channelAccount.channel.name, 13)} ` +
        `snap ${doldur(snapshot.toFixed(2), 7)} güncel ${doldur(guncel.toFixed(2), 7)} ` +
        `ciro ${doldur(para(ciro), 11)} etki ~${para(-etki)}  ${k.variant.product.name.slice(0, 28)}`,
    );
  }

  console.log(`     incelenen kalem        ${kalemler.length}`);
  console.log(`     oranı AYNI             ${esit}`);
  console.log(`     oranı FARKLI           ${farkli}`);
  console.log(`     bugün karşılığı yok    ${karsiligiYok}  (kanal SKU'su silinmiş/pasif ya da oran boş)`);
  console.log("");

  if (satirlar.length > 0) {
    console.log("     FARKLI OLANLAR:");
    for (const r of satirlar.slice(0, 40)) console.log(r);
    if (satirlar.length > 40) {
      console.log(`     ... ve ${satirlar.length - 40} satır daha`);
    }
    console.log("");
    console.log(`     TOPLAM TAHMİNİ KÂR ETKİSİ  ~${para(-toplamEtki)}`);
    console.log("     (eksi = snapshot oranı düşük kalmış, kârı FAZLA göstermişiz)");
    console.log("");
    console.log("     ⚠ BU RAKAM HÜKÜM DEĞİL. Fark, oranın satıştan SONRA");
    console.log("       değişmiş olmasından da doğabilir — o durumda snapshot");
    console.log("       DOĞRUDUR ve düzeltilecek bir şey yoktur. Ayrımı satış");
    console.log("       tarihi ile oranın güncellenme tarihi yapar; aşağıdaki");
    console.log("       satırlarda ikisi de var.");
  } else if (farkli === 0) {
    console.log("     ✓ Snapshot'lar bugünkü oranlarla ÖRTÜŞÜYOR.");
  }
  console.log("");

  // ==========================================================================
  //  4) DİLİM — KAYITLAR FİYAT ARALIĞI TAŞIYOR MU
  // ==========================================================================
  console.log("  ── 4) DİLİM (fiyat aralığı) ───────────────────────────────");
  console.log("     Yapısal cevap KODDAN okunur, ölçüme gerek yok:");
  console.log("");
  console.log("     · `ChannelSku` TEK oran taşır (`commissionRate`) —");
  console.log("       fiyat aralığı alanı YOK.");
  console.log("     · Komisyon okuyucusu satır başına TEK oran alır");
  console.log("       (`KomisyonSatiri.oran`); dilim kolonu aranmıyor.");
  console.log("     · Ham dosya SAKLANMIYOR — kaynakta dilim var mıydı diye");
  console.log("       geriye dönük bakılamaz. Yeni bir dosya incelenmeli.");
  console.log("");
  console.log("     KANAL KAPSAMI — içe aktarma yalnız TRENDYOL ve HEPSIBURADA");
  console.log("     tanıyor. Diğer kanalların (N11 dahil) oranları elle girilir;");
  console.log("     yukarıdaki 1. bölümde o kanalların doluluğu görünüyor.");
  console.log("");
  console.log("     → AŞAMA 1 İÇİN SONUÇ: dilim simülasyonu bugünkü veriyle");
  console.log("       KURULAMAZ. Önce dilimin nereden geleceğine karar verilmeli");
  console.log("       (pazaryeri dosyasında dilim kolonu var mı, yoksa elle mi");
  console.log("       tanımlanacak). Bu, Aşama 1'in ilk sorusudur.");
  console.log("");

  await prisma.$disconnect();
}

main();
