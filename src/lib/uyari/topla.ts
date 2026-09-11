import { acikPartilerToplu } from "@/lib/stok";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import { nakitTakvimiKur } from "@/lib/panel/nakit-takvimi";
import { takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";


import { kanalKodsuzStokluVaryantlar, supheliVeriBulgusu } from "./faz2-veri";
import { izneGoreSuz, nakitAcigiOlcumu, uyarilariKur } from "./kurallar";
import { maliyetsizVaryantlar } from "./maliyetsiz-stok";
import { iadeSayaciOlcumu } from "./iade-sayaci";
import { yedekOlcumu } from "./yedek";
import type { Uyari } from "./turler";

/**
 * ============================================================================
 *  UYARI TOPLAYICI — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  Dördü de MEVCUT motorlardan okunur; bu dosya yeni bir hesap YAZMAZ.
 *
 *  ── KOPYA YASAK (mimar kuralı) ──────────────────────────────────────────
 *  1. Nakit açığı  → `nakitTakvimiKur` (panelin kullandığı motorun aynısı)
 *  2. Maliyetsiz   → `acikPartilerToplu` + `maliyetsizVaryantlar`
 *                    (stok süzgeci de aynı fonksiyonu çağırıyor)
 *  3. Kârsız satış → `gorevSayilariniTopla` (panel görev kutusunun sayacı)
 *  4. Geciken hakediş → `SettlementItem.dueDate/paidAt`
 *
 *  Üçüncüsü özellikle önemli: çan kendi `prisma.sale.count` sorgusunu
 *  yazsaydı, görev kutusundaki koşul bir gün değişip çandaki kalırdı ve
 *  aynı ekranda iki farklı sayı görünürdü.
 *
 *  ── HAKEDİŞ VADESİ KALEMDE, ÜST KAYITTA DEĞİL ───────────────────────────
 *  ⚠ `Settlement.paidAt` bir İÇE AKTARMA partisine aittir; ödeme vadesi
 *  `SettlementItem.dueDate`te tutulur. Yanlış seviyeden okunursa uyarı
 *  sessizce boş çıkar — yani hata "0 uyarı" olarak görünür ve kimse fark
 *  etmez. Sözleşmede bu ayrıca uyarı olarak yazılmıştı (15.08.2026).
 *
 *  ── PAHALI HESAP, BLOKLAMAYAN ÇAĞRI ─────────────────────────────────────
 *  Maliyetsiz stok bütün stok hareketlerini okuyan FIFO motorunu çalıştırır.
 *  Bu yüzden çan sayıları sayfa çizimini BEKLETMEZ; bileşen bağlandıktan
 *  sonra çağırır (bkz. `uyari-cani.tsx`).
 * ============================================================================
 */

/**
 * SON BAŞARILI YEDEĞİN ZAMANI — depo listesinden.
 *
 * ⚠ NEDEN VERİTABANI DAMGASI DEĞİL: "yedek alındı" damgasını veritabanına
 * yazmak yeni bir tablo/kolon, yani migration demekti — ve tam bu sırada
 * canlı migration bekliyor. Daha önemlisi: damga veritabanında dursaydı,
 * veritabanının kendisi gittiğinde yedeğin varlığını da kaybederdik.
 * Dosyanın KENDİSİ tek doğru kanıttır; listeleme onu okur.
 *
 * OKUNAMAZSA `null` DÖNER — ve null "yedek yok" uyarısı yakar. Hata
 * yutulup "sorun yok" sayılmaz: doğrulanamayan yedek, yedek değildir.
 */
type YedekKaynagi = "HEDEF" | "IZ" | "YOK";

/**
 * SON DOĞRULANMIŞ YEDEĞİN ZAMANI — VE HANGİ KAYNAKTAN BİLİNDİĞİ.
 *
 * ⭐ SIRA ÖNEMLİ VE GEREKÇESİ ESKİ KURALDAN GELİYOR: **dosyanın kendisi tek
 * doğru kanıttır**, bu yüzden ÖNCE hedefe bakılır. Hedef okunamıyorsa
 * `AuditLog` damgasına düşülür — ama o damga KANIT DEĞİL, yalnız bir
 * BEYANDIR ve ekranda öyle söylenir.
 *
 * ⚠ ESKİ GEREKÇE SİLİNMİYOR: "damga veritabanında dursaydı, veritabanının
 * kendisi gittiğinde yedeğin varlığını da kaybederdik." Doğru — ve bu
 * yüzden damga BİRİNCİL kaynak yapılmadı, yalnız hedef susunca konuşan
 * ikincil kaynak oldu.
 *
 * ⛔ NİYE ŞİMDİ (K193, 09.09.2026): Blob kotası **30 Eylül'e kadar** kapalı
 * ve o güne dek yedek operatörün makinesinde alınıyor. Üretimdeki çan o
 * diski göremez; damga olmasaydı **21 gün boyunca her gün** "yedek yok"
 * diye kırmızı yanardı — oysa yedek gerçekten alınıyor. Sönmeyen uyarı
 * okunmaz olur ve rozetin tamamına olan güveni götürür (K49).
 */
async function sonYedekZamani(): Promise<{
  an: Date | null;
  kaynak: YedekKaynagi;
}> {
  /**
   * ⛔ `list()` KALDIRILDI — VE BU ÇAĞRI KOTAYI YAKAN YERDİ (K192, 08.09.2026).
   * Bu gövde HER PANEL ÇİZİMİNDE bir `list()` atıyordu ve `list` bir
   * **advanced operation**; deponun askıya alınma sebebi tam buydu
   * (2000/2000). Artık hedef soyutlamasından geçiyor.
   */
  try {
    const { varsayilanYedekHedefi } = await import("@/lib/yedek-hedefi");
    const secim = varsayilanYedekHedefi();
    if (secim.tamam) {
      const kayitlar = await secim.hedef.listele("yedek/");
      if (kayitlar.length > 0) {
        return {
          an: kayitlar
            .map((k) => k.yazildi)
            .reduce((enYeni, t) => (t > enYeni ? t : enYeni)),
          kaynak: "HEDEF",
        };
      }
    }
  } catch {
    /** Hedef okunamadı — sessiz geçilmiyor, aşağıdaki ize düşülüyor. */
  }

  /**
   * İKİNCİL KAYNAK — `YEDEK_ALINDI` izi. Bu iz yalnız GERİ OKUMA TUTTUKTAN
   * sonra yazılıyor (bkz. `yedek-yaz.ts`), yani "yazıldı ama okunamadı"
   * hâlini temsil etmiyor.
   */
  try {
    const { YEDEK_IZI } = await import("@/lib/yedek-yaz");
    const iz = await prisma.auditLog.findFirst({
      where: { action: YEDEK_IZI },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (iz) return { an: iz.createdAt, kaynak: "IZ" };
  } catch {
    /** İz de okunamadı. */
  }

  return { an: null, kaynak: "YOK" };
}

/**
 * GECİKME KOŞULU — TEK KAYNAK.
 *
 * ⚠ İKİ SAYI TEK SINIRDAN. `hakedisGecikti` (kırmızı) ve
 * `hakedisBaglanmamis` (muafiyet beyanı) YALNIZCA `saleId` ile ayrılır;
 * gecikme tanımı ikisinde de aynıdır. Ayrı ayrı yazılsaydı biri
 * değiştirilip öteki unutulur, "kaç kalem muaf tutuldu" sorusunun cevabı
 * kırmızı sayıyla tutmazdı.
 *
 * ⚠ SINIR `bugun`, `new Date()` DEĞİL — İŞ TAKVİMİ günü. Vadesi BUGÜN
 * dolan kalem henüz gecikmiş değildir. (Bu sınır 19.08.2026'da bir
 * raporlama hatasına yol açtı: sonda `new Date()` ile ölçüp **83**
 * bulmuştum, ekran `bugun` ile **67** diyordu. İkisi de kendi sınırında
 * doğruydu; ayrışan şey ölçüt değil, benim raporumdu.)
 */
function gecikmeKosulu(bugun: Date) {
  return { paidAt: null, dueDate: { not: null, lt: bugun } };
}

/**
 * ⚠ `tamGorunum` — YALNIZ SİSTEM BAĞLAMLI ÇAĞIRANLAR İÇİNDİR (K-OZET).
 *
 * Varsayılan (`false`) davranış DEĞİŞMEDİ: oturumdaki kullanıcının izinlerine
 * göre süzülür (çan bunu çağırıyor). Günlük özet bir CRON işi — oturumu YOK,
 * dolayısıyla `izinVarMi` her zaman `false` döner ve süzgeç HER İZİNLİ
 * uyarıyı sessizce eler. Özetin kendisi zaten TEK bir sayfa izniyle
 * (`ozet.gor`) kapılı — anayasadaki sayfa-bazlı izin modeliyle aynı: sayfa
 * içeri girdiğinde ikinci bir alan-süzgeci açılmaz (`/tazminat`in kendi
 * içinde ikinci bir izin sınamıyor olması gibi).
 */
export async function uyarilariTopla(
  tamGorunum: boolean = false,
): Promise<Uyari[]> {
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  const [
    takvimSatirlari,
    gorevSayilari,
    gecikenHakedis,
    baglanmamisHakedis,
    partiler,
    cevapsizTalep,
    sonYedek,
    supheBulgusu,
    kanalKodsuzlar,
    zararinaSatisSayisi,
  ] = await Promise.all([
      takvimSatirlariniTopla(bugun),
      gorevSayilariniTopla(),
      /**
       * VADE KALEMDE. `paidAt` boş VE vadesi bugünden önce olan kalemler.
       * `lt: bugun` — bugün vadesi dolan henüz GECİKMİŞ değildir.
       */
      /**
       * ═══════════════════════════════════════════════════════════════
       *  ⚠ HAYALET KIRMIZI — SATIŞA BAĞLANAMAYAN KALEM SAYILMAZ
       * ---------------------------------------------------------------
       *  Canlı bulgu 19.08.2026 (mimar): çan "67 hakediş kalemi gecikti ·
       *  ₺137.975" diyordu. Ölçüm: sistemdeki ÜÇ hakediş partisinin
       *  177 farklı sipariş numarasının **HİÇBİRİ** bir satış kaydıyla
       *  eşleşmiyor — en yeni parti dahil.
       *
       *  Yani bu kalemler bizim defterimizde takip edilen bir alacak
       *  DEĞİL, içe aktarılmış bir rapor satırı. Kanal çoktan ödemiş
       *  olabilir; sistem bilemez. "Gecikti" demek, bilmediğimiz bir şeyi
       *  iddia etmekti — ve her gün ₺138K'lık sahte panik taşımak rozete
       *  olan güveni bitirir ("her zaman çıkan uyarı bilgi taşımaz").
       *
       *  ⚠ MUAFİYET SESSİZ DEĞİL: dışarıda kalanlar `hakedisBaglanmamis`
       *  nötr uyarısında ADIYLA sayılıyor. Sessiz muafiyet, ₺138K'yı
       *  hiçbir yerde görünmeden yok ederdi.
       *
       *  Bağlama çalışır çalışmaz bu uyarı KENDİLİĞİNDEN doğru sayıya
       *  döner; kural değil, kapsam daraltıldı.
       * ═══════════════════════════════════════════════════════════════
       */
      prisma.settlementItem.aggregate({
        where: { ...gecikmeKosulu(bugun), saleId: { not: null } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.settlementItem.count({
        where: { ...gecikmeKosulu(bugun), saleId: null },
      }),
      acikPartilerToplu(prisma, null),
      /**
       * CEVAPLANMAMIŞ TALEP — henüz ELE ALINMAMIŞ olanlar.
       *
       * Yalnız ACIK sayılıyor: INCELENIYOR/YAPILIYOR zaten görülmüş ve iş
       * başlamış demektir; onları da saymak uyarıyı iş bitene kadar yanar
       * hâlde tutar ve sönmeyen uyarı bir süre sonra okunmaz olur.
       */
      prisma.talep.count({ where: { durum: "ACIK" } }),
      sonYedekZamani(),
      /**
       * ⚠ SORGU BURADA YAZILMAZ — `faz2-veri.ts`ten çağrılır. Uyarının
       * götürdüğü EKRAN da aynı gövdeyi çağırıyor; iki taraf kendi
       * sorgusunu yazsaydı bir gün ayrışır, çan "1" derken liste 40
       * satır gösterirdi (görev kutusu vakası, 15.08.2026).
       */
      supheliVeriBulgusu(gunDegeri(isTakvimGunu(new Date()))),

      kanalKodsuzStokluVaryantlar(),
      /**
       * ⚠ SÜZGEÇLE AYNI KOŞUL. `/satislar?kar=zarar` şunu uyguluyor:
       * `profitStatus: "CALCULATED"` VE `net2Amount < 0`. Buraya yalnız
       * `net2Amount < 0` yazsaydık, kârı henüz hesaplanmamış kalemler
       * sayıya girer ama listede çıkmazdı — sayı ile liste ayrışırdı.
       */
      prisma.saleItem.count({
        where: {
          sale: { iptalTarihi: null },
          profitStatus: "CALCULATED",
          net2Amount: { lt: 0 },
        },
      }),
    ]);

  const takvim = nakitTakvimiKur({
    satirlar: takvimSatirlari,
    bugun,
    pencereGun: 14,
  });

  /**
   * Yedek yaşı İŞ TAKVİMİ GÜNÜNE göre ölçülür — yedek zamanı da aynı
   * takvime indirilir ki "bugün alındı" saat farkından "1 gün" görünmesin.
   */
  const yedek = yedekOlcumu(
    sonYedek.an === null ? null : gunDegeri(isTakvimGunu(sonYedek.an)),
    bugun,
  );

  /**
   * ⭐ ÜÇÜNCÜ HÂL: yedek TAZE ama depodan DOĞRULANAMIYOR.
   *
   * ⚠ KIRMIZI ÖNCELİKLİDİR: iz eski ya da hiç yoksa `yedekEski`/`yedekYok`
   * yerinde kalır — amber onları EZMEZ. Amber yalnız "yaş sorunu yok, ama
   * kanıt hedeften değil izden geliyor" hâlinde yanar.
   */
  const yedekIzden = {
    sayi:
      sonYedek.kaynak === "IZ" &&
      yedek.yedekEski.sayi === 0 &&
      yedek.yedekYok.sayi === 0
        ? 1
        : 0,
  };

  /**
   * İADE SAYAÇLARI — ekranla AYNI gövdeden (bkz. uyari/iade-sayaci.ts).
   * `bugun` buraya zaten iş takvimi günü olarak geliyor; sonda ile ekran
   * arasında parametre farkı doğamaz.
   */
  const iadeSayaci = await iadeSayaciOlcumu(bugun);

  const uyarilar = uyarilariKur({
    iadeSayaciDoluyor: iadeSayaci,
    nakitAcigi: nakitAcigiOlcumu(takvim.netPozisyon),
    yedekEski: yedek.yedekEski,
    yedekYok: yedek.yedekYok,
    yedekIzden,
    maliyetsizStok: { sayi: maliyetsizVaryantlar(partiler).length },
    karHesaplanamayan: { sayi: gorevSayilari.karHesaplanamayan },
    cevapsizTalep: { sayi: cevapsizTalep },
    veriSupheli: { sayi: supheBulgusu.kalemSayisi },
    kanalKodsuzStok: { sayi: kanalKodsuzlar.length },
    hakedisBaglanmamis: { sayi: baglanmamisHakedis },
    zararinaSatis: { sayi: zararinaSatisSayisi },
    hakedisGecikti: {
      sayi: gecikenHakedis._count._all,
      tutar:
        gecikenHakedis._sum.amount === null
          ? null
          : Number(gecikenHakedis._sum.amount.toString()),
    },
  });

  /** Sistem bağlamı (cron) — oturum yok, süzgeç uygulanmaz (yukarıdaki not). */
  if (tamGorunum) return uyarilar;

  /**
   * İZİN SÜZGECİ BURADA, sayım öncesinde. Rozet 3 gösterip listede 1 uyarı
   * çizmek "iki uyarı saklanıyor" demek olurdu — hem kafa karıştırır hem
   * saklananın varlığını sızdırır.
   */
  const [karGorunur, destekYonetir, veriAktarir] = await Promise.all([
    izinVarMi("satis.kar.gor"),
    izinVarMi("destek.yonet"),
    izinVarMi("veri.aktar"),
  ]);
  return izneGoreSuz(uyarilar, (izin) => {
    if (izin === "satis.kar.gor") return karGorunur;
    if (izin === "destek.yonet") return destekYonetir;
    if (izin === "veri.aktar") return veriAktarir;
    return true;
  });
}
