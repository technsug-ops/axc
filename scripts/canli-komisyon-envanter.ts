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
const GUNCELLEME_GUNU: Record<string, number[]> = {
  /**
   * TRENDYOL HAFTADA İKİ KEZ — 18.08.2026'da tarife dosyasından ÖLÇÜLDÜ.
   * Pencereler: Salı 08:00→Cuma 07:59 (3 gün) · Cuma 08:00→Salı 07:59
   * (4 gün). Tek gün yazsaydık cuma yayımını kaçırır, salıya kadar
   * "güncel" sayardık.
   */
  Trendyol: [2, 5],
  Hepsiburada: [3],
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
function sonGuncellemeGunu(bugun: Date, gunler: number[]): Date {
  /** Birden çok yayım günü varsa EN YAKINI geçerlidir. */
  let enYakin: Date | null = null;
  for (const g of gunler) {
    const d = new Date(bugun);
    const fark = (d.getUTCDay() - g + 7) % 7;
    d.setUTCDate(d.getUTCDate() - fark);
    if (!enYakin || d > enYakin) enYakin = d;
  }
  return enYakin!;
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
  /**
   * ⚠ ETİKET DÜZELTMESİ 18.08.2026 — ARAÇ KUSURU.
   *
   * Bu bölüm "son güncelleme günü 2026-08-18" yazıyordu ve 1. bölüm aynı
   * anda "en yeni 2026-08-14" diyordu. Mimar haklı olarak "iki bölüm farklı
   * kaynaktan mı okuyor" diye sordu.
   *
   * ÇELİŞKİ DEĞİLDİ, YANILTICI ETİKETTİ — ki daha kötüsüdür:
   *   · 1. bölüm VERİDEN okur (`commissionUpdatedAt`, gerçek güncelleme)
   *   · 2. bölümün rakamı VERİDEN GELMİYORDU: takvimden hesaplanan
   *     BEKLENEN YAYIM GÜNÜ. Bugün salı olduğu için 18.08 yazıyordu.
   *
   * "Son güncelleme günü" ifadesi "oran şu gün güncellendi" diye okunuyor.
   * İkisi artık yan yana ve adlarıyla basılıyor.
   */
  console.log("     Kanal oranı haftalık yayımlar: Trendyol SALI+CUMA, Hepsiburada ÇARŞAMBA.");
  console.log("     'Beklenen yayım' TAKVİMDEN hesaplanır; 'veride en yeni' KAYITTAN okunur.");
  console.log("     İkisi arasındaki boşluk = tazelenmemiş olabilir.");
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
    /**
     * ⚠ ETİKET İKİNCİ KEZ DÜZELTİLDİ — mimar 18.08.2026.
     *
     * "BAYAT 1029/1044" bir HÜKÜM cümlesiydi ve iki ayrı durumu tek
     * kelimeye sıkıştırıyordu: gerçekten tazelenmemiş kayıt ile "yükleme
     * koştu, oran DEĞİŞMEDİ" kaydı. İkincisi bayat değildir; damgası
     * ilerlememiştir çünkü `komisyon/plan.ts` aynı oranı yazma planına
     * hiç almaz (`ayniKalan`).
     *
     * Yükleme anındaki `ayniKalan` sayısına ulaşamıyoruz (hiçbir yere
     * yazılmıyor), AMA aynı ayrımı VERİDEN kurabiliyoruz:
     *   · yayım gününden BERİ damgalanan → o yüklemede DEĞİŞEN
     *   · daha eski damgalı              → değişmeyen
     *
     * Artık hüküm değil SAYIM basılıyor. Pencere tablosu gelene kadar
     * en dürüst gösterim bu.
     */
    const guncellenen = o.dolu - bayatlar.length;
    console.log(
      `     ${doldur(ad, 16)} beklenen yayım ${gun(sinir)} · veride en yeni ${gun(o.enYeni)}`,
    );
    console.log(
      `     ${doldur("", 16)} → yayımdan beri GÜNCELLENEN ${guncellenen} · DEĞİŞMEYEN ${bayatlar.length}  (toplam ${o.dolu})`,
    );
  }
  console.log("");
  console.log("     ⚠ 'DEĞİŞMEYEN' BAYAT DEMEK DEĞİLDİR. İki durumu birden");
  console.log("       kapsar: (a) oran gerçekten tazelenmedi, (b) yükleme koştu");
  console.log("       ama oran AYNI çıktı ve damga ilerlemedi. İkisi bu veriyle");
  console.log("       AYRILAMAZ — sayım basılıyor, hüküm verilmiyor.");
  console.log("");

  /**
   * ⚠ `commissionUpdatedAt` "DEĞİŞTİ" DEMEKTİR, "DOĞRULANDI" DEĞİL.
   *
   * `komisyon/plan.ts` oranı ZATEN AYNI olan satırı yazma planına hiç
   * almaz (`ayniKalan` sayacı). Yani dosya yüklenip her oran aynı çıkarsa
   * damga İLERLEMEZ ve kayıt "bir haftadır tazelenmemiş" görünür — oysa
   * bugün doğrulanmıştır.
   *
   * Bu ayrım bugün ölçülemiyor ve yeni tarife tablosunun (pencere kaydı)
   * gerekçelerinden biri: yükleme, oran değişmese bile pencere bırakır.
   */
  console.log("     ⚠ DAMGA 'DEĞİŞTİ' DEMEKTİR, 'DOĞRULANDI' DEĞİL.");
  console.log("       Oranı aynı çıkan satır yazma planına hiç girmez");
  console.log("       (komisyon/plan.ts → ayniKalan). Dosya yüklenip hiçbir");
  console.log("       oran değişmezse damga İLERLEMEZ; kayıt tazelenmemiş");
  console.log("       görünür ama aslında doğrulanmıştır. Bu ayrım bugün");
  console.log("       ölçülemiyor — yeni tarife tablosu (pencere) çözecek.");
  console.log("");

  /** GÜNE GÖRE DAĞILIM — "bugün bir şey değişti mi" bunu cevaplar. */
  /**
   * ⚠ KANAL KIRILIMI ŞART — mimar isteği 18.08.2026.
   *
   * Toplam sayı "bugün 15 kayıt değişti" der ama HANGİ kanalda olduğunu
   * söylemez. Hepsiburada için "yükleme koştu, hiçbir oran değişmedi" ile
   * "yükleme hiç koşmadı" ayırt edilemiyordu — ikisi de aynı boşluğu
   * gösteriyordu. Kırılımla en azından "o kanalda bugün hiç damga yok"
   * denebiliyor.
   */
  console.log("     GÜNCELLEME TARİHİ DAĞILIMI — KANAL KIRILIMLI (son 10 gün):");
  const kanallar = [...kanalOzeti.keys()].sort();
  const gunKanal = new Map<string, Map<string, number>>();
  for (const k of kayitlar) {
    if (k.commissionUpdatedAt === null) continue;
    const g = gun(k.commissionUpdatedAt);
    const satir = gunKanal.get(g) ?? new Map<string, number>();
    const ad = k.channelAccount.channel.name;
    satir.set(ad, (satir.get(ad) ?? 0) + 1);
    gunKanal.set(g, satir);
  }
  const siralı = [...gunKanal.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  console.log(
    `       ${doldur("tarih", 12)} ${doldur("toplam", 8)} ${kanallar.map((a) => doldur(a, 14)).join("")}`,
  );
  for (const [g, satir] of siralı.slice(0, 10)) {
    const toplam = [...satir.values()].reduce((t, n) => t + n, 0);
    console.log(
      `       ${doldur(g, 12)} ${doldur(String(toplam), 8)} ${kanallar
        .map((a) => doldur(satir.get(a) === undefined ? "—" : String(satir.get(a)), 14))
        .join("")}`,
    );
  }
  if (siralı.length === 0) console.log("       (hiç damga yok)");

  /**
   * ⚠ "—" İKİ ŞEY DEMEK OLABİLİR ve bugün ayırt EDİLEMİYOR:
   *   · o gün o kanala yükleme yapılmadı
   *   · yükleme yapıldı ama HİÇBİR oran değişmedi (`ayniKalan`)
   *
   * Mimar "bayrak etiketine `ayniKalan` sayısı" istedi; o sayı yükleme
   * ANINDA üretiliyor ve HİÇBİR YERE YAZILMIYOR — envanter sonradan
   * okuyamaz. Ayrımı yapmak için yükleme sonuçlarının kaydedilmesi
   * gerekir (küçük bir tablo). Kalem açıldı; uydurma bir sayı basmaktansa
   * belirsizlik YAZILIYOR.
   */
  console.log("");
  console.log("       ⚠ '—' İKİ ŞEY DEMEK OLABİLİR ve bugün AYIRT EDİLEMEZ:");
  console.log("         (a) o gün o kanala yükleme yapılmadı");
  console.log("         (b) yükleme yapıldı ama hiçbir oran değişmedi");
  console.log("         `ayniKalan` sayısı yükleme anında üretilip HİÇBİR");
  console.log("         YERE YAZILMIYOR; envanter onu sonradan okuyamaz.");
  console.log("         Ayrım için yükleme sonuçları kaydedilmeli (kalem açık).");
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


  // ==========================================================================
  //  5) ÖN AYRIM — BELİRLİ SİPARİŞLER (komut satırından)
  // ==========================================================================
  /**
   * Çalıştırma:  npm run canli:komisyon-envanter -- 11493262226 11492798173
   *
   * ⚠ ÖNCE BİR SINIRI BEYAN ETMEK GEREK: **ORAN GEÇMİŞİ TUTULMUYOR.**
   * Komisyon yüklemesi `ChannelSku.commissionRate`i ÜSTÜNE YAZAR ve yalnız
   * `commissionUpdatedAt` damgasını bırakır (ölçüldü 18.08.2026: ne ayrı bir
   * geçmiş tablosu ne de `AuditLog` kaydı var). Yani **"2,70 hangi yüklemeyle
   * geldi" sorusu sistemden CEVAPLANAMAZ** — o değer artık hiçbir yerde yok,
   * sadece satışa donmuş hâli duruyor.
   *
   * CEVAPLANABİLEN SORU ŞU VE AYRIMI YAPMAYA YETER:
   *
   *   oran GÜNCELLENME tarihi > satış tarihi
   *     → satış anında kayıtlı oran muhtemelen ESKİ değerdi; snapshot onu
   *       dondurdu. **Snapshot MEŞRU, düzeltilecek bir şey yok.**
   *
   *   oran GÜNCELLENME tarihi < satış tarihi
   *     → satış anında kayıtlı oran ZATEN yeni değerdi; buna rağmen satışa
   *       başka bir oran yazılmış. Satış formu öneriyi değiştirmeye izin
   *       verdiği için bu **elle giriş** olabilir. İncelenmeli.
   *
   * HÜKÜM YİNE DE BURADA VERİLMEZ. Nihai hakem, hakediş dosyasındaki
   * GERÇEK kesintidir: kanal o siparişten kaç TL komisyon kesmiş?
   * Bu bölüm yalnız hangi ihtimalin önde olduğunu söyler.
   */
  const istenenKodlar = process.argv.slice(2).filter((a) => /^\d{6,}$/.test(a));
  if (istenenKodlar.length > 0) {
    console.log("  ── 5) ÖN AYRIM — İSTENEN SİPARİŞLER ───────────────────────");
    console.log("     ⚠ ORAN GEÇMİŞİ TUTULMUYOR: eski oranın hangi yüklemeyle");
    console.log("       geldiği sistemden bilinemez. Aşağıdaki ölçüt, satış ile");
    console.log("       oranın SON güncellenme tarihini karşılaştırır.");
    console.log("");

    const hedefler = await prisma.saleItem.findMany({
      where: { sale: { code: { in: istenenKodlar } } },
      select: {
        commissionRate: true,
        quantity: true,
        unitPriceAmount: true,
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

    const skuKayitlari = await prisma.channelSku.findMany({
      where: {
        variantId: { in: [...new Set(hedefler.map((h) => h.variantId))] },
      },
      select: {
        channelAccountId: true,
        variantId: true,
        commissionRate: true,
        commissionUpdatedAt: true,
        updatedAt: true,
        createdAt: true,
        isActive: true,
      },
    });
    const skuHarita = new Map(
      skuKayitlari.map((k) => [`${k.channelAccountId}|${k.variantId}`, k]),
    );

    for (const h of hedefler) {
      const sku = skuHarita.get(`${h.sale.channelAccountId}|${h.variantId}`);
      const snapshot =
        h.commissionRate === null ? null : Number(h.commissionRate.toString());
      const guncel =
        sku?.commissionRate == null ? null : Number(sku.commissionRate.toString());

      console.log(`     ${h.sale.code}  ${h.variant.product.name.slice(0, 40)}`);
      console.log(`        kanal              ${h.sale.channelAccount.channel.name}`);
      console.log(`        SATIŞ tarihi       ${gun(h.sale.soldAt)}`);
      console.log(`        snapshot oran      ${snapshot === null ? "—" : snapshot.toFixed(2)}`);
      console.log(`        güncel oran        ${guncel === null ? "—" : guncel.toFixed(2)}`);
      console.log(`        oran güncellenme   ${gun(sku?.commissionUpdatedAt ?? null)}`);
      console.log(`        kanal SKU açılışı  ${gun(sku?.createdAt ?? null)}`);
      console.log(`        kanal SKU aktif mi ${sku ? (sku.isActive ? "evet" : "HAYIR") : "kayıt YOK"}`);

      const gncl = sku?.commissionUpdatedAt ?? null;
      const acilis = sku?.createdAt ?? null;

      /**
       * ⚠ ÖNCE "KAYIT VAR MIYDI" — 18.08.2026'da bulunan mantık boşluğu.
       *
       * İlk hâlde yalnız `commissionUpdatedAt` satış tarihiyle
       * karşılaştırılıyor ve "güncelleme satıştan sonraysa snapshot
       * meşru" deniyordu. Ama kanal SKU'su satıştan SONRA açıldıysa
       * satış anında ORTADA KAYIT YOKTU; snapshot ondan gelemezdi.
       * Hüküm "meşru" derken imkânsız bir kaynağı işaret ediyordu —
       * üstelik gereken veri (`createdAt`) aynı ekranda basılıydı.
       *
       * Kaynağın VAR OLUP OLMADIĞI, güncel olup olmadığından ÖNCE gelir.
       */
      if (acilis !== null && acilis.getTime() > h.sale.soldAt.getTime()) {
        console.log("        → KANAL SKU'SU SATIŞTAN SONRA AÇILMIŞ: satış anında");
        console.log("          ortada kayıt YOKTU, snapshot kayıttan GELEMEZ.");
        console.log("          **Oran satış formuna ELLE girilmiş.**");
      } else if (gncl === null) {
        console.log("        → oran hiç güncellenmemiş (damga boş) — snapshot");
        console.log("          nereden geldiği belirsiz, elle giriş ihtimali yüksek.");
      } else if (gncl.getTime() > h.sale.soldAt.getTime()) {
        console.log("        → GÜNCELLEME SATIŞTAN SONRA: satış anında kayıt VARDI");
        console.log("          ve muhtemelen o günkü oranı taşıyordu.");
        console.log("          **Snapshot meşru görünüyor.**");
      } else {
        console.log("        → GÜNCELLEME SATIŞTAN ÖNCE: satış anında kayıtlı oran");
        console.log("          zaten güncel değerdi, buna rağmen farklı oran");
        console.log("          yazılmış. **Elle giriş ihtimali — incelenmeli.**");
      }
      console.log("");
    }

    console.log("     ⚠ NİHAİ HAKEM BU BÖLÜM DEĞİL: kanalın o siparişten");
    console.log("       FİİLEN kestiği komisyon, hakediş .xlsx'inde yazılı.");
    console.log("       Dosya geldiğinde bu üç sipariş ÖZEL satır olarak");
    console.log("       karşılaştırılacak (gerçek · snapshot · güncel).");
    console.log("");
  }

  await prisma.$disconnect();
}

main();
