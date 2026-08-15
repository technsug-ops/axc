import { alimAramaKosulu } from "@/lib/alim-arama";
import {
  LISTE_PENCERELERI,
  pencereOlustur,
  type Pencere,
  type PencereTuru,
} from "@/lib/donem";

import type { Prisma } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  LİSTE SÜZGEÇ KOŞULLARI — EKRAN VE EXCEL AYNI YERDEN OKUR
 * ----------------------------------------------------------------------------
 *  NEDEN ORTAK MODÜL: "Excel indir" ekrandaki süzgeci uygulamak zorunda
 *  (bkz. `lib/suzgec.ts` başlığı — alım aramasında liste bir şey, inen dosya
 *  başka şey söylüyordu). Koşul iki yerde ayrı yazılırsa bir gün biri
 *  güncellenir, öteki unutulur ve fark SESSİZ olur: dosya açılır, sayılar
 *  tutmaz, kimse hata görmez.
 *
 *  `/iadeler` (Aşama 0) koşulunu ekranda ve dışa aktarmada İKİ KEZ yazıyor.
 *  Bugün aynı sonucu veriyorlar ama o kopya bilinçli bir borç; Satışlar ve
 *  Alımlar aynı borcu almasın diye bu modül açıldı.
 *
 *  VERİTABANINA GİTMEZ (alım aramasının kendi sorgusu hariç), saf koşul
 *  üretir — `suzgec:dogrula` bunu veri olmadan sınıyor.
 * ============================================================================
 */

/** Süzgeçlerin geldiği yer: sayfanın searchParams'ı. */
export type SuzgecParametreleri = Record<string, string | undefined>;

export type PencereCozumu = {
  /** Boş metin = ZAMAN SÜZGECİ KAPALI (tüm kayıtlar). */
  tur: PencereTuru | "";
  pencere: Pencere | null;
  /** Prisma tarih aralığı; süzgeç kapalıysa `undefined`. */
  aralik: { gte: Date; lt: Date } | undefined;
};

/**
 * Adresteki pencere parametrelerini çözer.
 *
 * VARSAYILAN "TÜM ZAMANLAR" — bilinçli (karar 13.08.2026). Satışlar ve
 * Alımlar bugüne kadar dönem süzgeci olmadan çalışıyordu; varsayılanı
 * "son 30 gün" yapmak, 30 günden eski kayıtları hiçbir uyarı vermeden
 * ekrandan kaldırırdı. Kullanıcının "satışlarım kayboldu" demesi için
 * yeterli bir sebep; süzgeç eklemek, kayıt gizlemek anlamına gelmemeli.
 * Dönem GÖRÜNÜR bir seçim olarak duruyor ve seçildiğinde rozeti çıkıyor.
 *
 * GEÇERSİZ DEĞER DE KAPALIYA DÜŞER, hata vermez: kullanıcı adresi elle
 * kurcalayabilir ya da eski bir yer imi açabilir.
 *
 * @param an "Şimdi" — çağıran verir, böylece sınanabilir kalır.
 */
export function pencereCoz(
  p: SuzgecParametreleri,
  an: Date = new Date(),
): PencereCozumu {
  const istenen = (p.pencere ?? "").trim();
  if (istenen === "") return { tur: "", pencere: null, aralik: undefined };

  if (!(LISTE_PENCERELERI as readonly string[]).includes(istenen)) {
    return { tur: "", pencere: null, aralik: undefined };
  }
  const tur = istenen as PencereTuru;

  let pencere: Pencere;
  try {
    pencere = pencereOlustur(
      tur,
      an,
      tur === "OZEL" && p.baslangic && p.bitis
        ? { baslangic: p.baslangic, bitis: p.bitis }
        : undefined,
    );
  } catch {
    // Ters ya da eksik özel aralık: süzgeci hiç uygulamıyoruz. Boş liste
    // göstermek, kullanıcıya "kayıt yok" demenin yanlış yoludur.
    return { tur: "", pencere: null, aralik: undefined };
  }

  return {
    tur,
    pencere,
    aralik: { gte: pencere.baslangic, lt: pencere.bitisHaric },
  };
}

const temiz = (deger: string | undefined) => (deger ?? "").trim();

// ---------------------------------------------------------------------------
//  SATIŞ
// ---------------------------------------------------------------------------

/** Kâr süzgecinin tanıdığı değerler. */
export const KAR_SUZGECLERI = ["eksik", "tam"] as const;
/** İade süzgecinin tanıdığı değerler. */
export const IADE_SUZGECLERI = ["var", "yok"] as const;
/**
 * Kargo süzgeci — panelin "kargoya verilen / bekleyen" kutusu buraya bağlanır.
 * `Sale.shippedAt` dolu mu boş mu; başka bir kaynağı yok.
 */
export const KARGO_SUZGECLERI = ["verildi", "bekleyen"] as const;

/** Satış listesi koşulu — ekran ve Excel aynı koşulu kullanır. */
export function satisKosulu(
  p: SuzgecParametreleri,
  an: Date = new Date(),
): { kosul: Prisma.SaleWhereInput; pencere: PencereCozumu } {
  const pencere = pencereCoz(p, an);

  const arama = temiz(p.q);
  const kanal = temiz(p.kanal);
  const hesap = temiz(p.hesap);
  const kar = temiz(p.kar);
  const iade = temiz(p.iade);
  const kargo = temiz(p.kargo);

  const kosul: Prisma.SaleWhereInput = {
    // Süzgeç kapalıysa alan HİÇ yazılmaz; `undefined` koşulu Prisma'da
    // "koşul yok" demektir ama açıkça atlamak niyeti okunur kılıyor.
    /**
     * Dönem normalde SATIŞ tarihine uygulanır — ama kargo süzgeci açıkken
     * ekseni kargo devralır (aşağıya bakın). İki tarih koşulu aynı anda
     * yazılırsa "bu ay satılmış VE bu ay kargolanmış" olur; oysa sorulan
     * "bu ay kargolanmış"tır.
     */
    ...(pencere.aralik && kargo !== "verildi"
      ? { soldAt: pencere.aralik }
      : {}),
    ...(arama ? { code: { contains: arama } } : {}),
    /**
     * KANAL ve HESAP birlikte gelebilir (panelden gelen bağlantı kanal
     * verir, kullanıcı sonra hesabı daraltır). İkisi de aynı ilişkiye
     * yazıldığı için tek `channelAccount` bloğunda birleşiyorlar.
     */
    ...(kanal || hesap
      ? {
          channelAccount: {
            ...(hesap ? { id: hesap } : {}),
            ...(kanal ? { channel: { code: kanal } } : {}),
          },
        }
      : {}),
    // Kârı hesaplanamamış satışlar: rapordaki uyarının vardığı yer.
    ...(kar === "eksik"
      ? { OR: [{ profitStatus: null }, { NOT: { profitStatus: "CALCULATED" } }] }
      : {}),
    ...(kar === "tam" ? { profitStatus: "CALCULATED" } : {}),
    // İadesi olan / olmayan satışlar.
    ...(iade === "var" ? { returns: { some: {} } } : {}),
    ...(iade === "yok" ? { returns: { none: {} } } : {}),
    /**
     * KARGOYA VERİLDİ / BEKLİYOR. Panelden gelen bağlantı bunu taşıyor.
     * "Bekleyen" = `shippedAt` BOŞ; yani hiç işaretlenmemiş satış. Bunu
     * "kargo firması seçilmemiş" ile karıştırmamak gerekir — firma satışta
     * seçilir, verildi işareti sonra elle konur.
     */
    /**
     * DÖNEM, KARGO SÜZGECİNDE TARİH EKSENİNİ DEĞİŞTİRİR (15.08.2026).
     *
     * "Kargoya verilenler" sorusu bir OPERASYON sorusudur: "bu dönemde ne
     * KARGOLADIM". Satış tarihine göre süzülürse dün satılıp bugün
     * kargolanan paket bugünkü listede görünmez — panelin sayacında tam
     * olarak bu hata vardı ve liste de aynı hatayı tekrarlıyordu.
     *
     * Bu yüzden `kargo=verildi` seçiliyken dönem `shippedAt`e uygulanır,
     * `soldAt`a DEĞİL. Panelin sayacı ile bu listenin kaydı ancak böyle
     * birebir tutar (Halil testi maddesi c).
     */
    ...(kargo === "verildi"
      ? { shippedAt: pencere.aralik ?? { not: null } }
      : {}),
    ...(kargo === "bekleyen" ? { shippedAt: null } : {}),
  };

  return { kosul, pencere };
}

// ---------------------------------------------------------------------------
//  ALIM
// ---------------------------------------------------------------------------

/**
 * Alım durumları — koşul kurucusunun tanıdığı değerler.
 *
 * ⚠ ŞEMADAKİ ADLARLA BİREBİR OLMAK ZORUNDA. 15.08.2026'da burada `PARTIAL`
 * yazıyordu, şemadaki değer ise `PARTIALLY_RECEIVED`. Açılır liste doğru
 * değeri gönderiyor, bu kontrol onu TANIMIYOR ve süzgeç SESSİZCE DÜŞÜYORDU:
 * kullanıcı "Kısmen teslim alındı"yı seçiyor, liste bütün alımları
 * gösteriyor ve süzdüğünü sanıyordu. Bu dosyanın kendi başlığında yazan
 * "sessiz süzgeç kaybı" hatasının ta kendisi.
 * `suzgec:dogrula` artık bu listeyi şema enum'uyla karşılaştırıyor.
 */
export const ALIM_DURUM_KODLARI = [
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

/**
 * BİLEŞİK SÜZGEÇ — "mal kabul bekleyen".
 *
 * Panelin "Mal kabul bekleyen alım" sayısı ORDERED **ve**
 * PARTIALLY_RECEIVED'ı birlikte sayıyor: kalemlerin bir kısmı geldiyse iş
 * bitmemiştir. Bağlantı tek bir duruma gitseydi ekrandaki sayı ile listenin
 * kaydı TUTMAZDI — panelin en temel sözü budur (sayı = liste).
 */
export const ALIM_BEKLEYEN_KODU = "BEKLEYEN";
const ALIM_BEKLEYEN_DURUMLARI = ["ORDERED", "PARTIALLY_RECEIVED"] as const;

function alimDurumuGecerliMi(deger: string): boolean {
  return (ALIM_DURUM_KODLARI as readonly string[]).includes(deger);
}

/**
 * Alım listesi koşulu.
 *
 * ARAMA AYRI BİR SORGU İSTİYOR (`alimAramaKosulu`): alım kodu, tedarikçi
 * sipariş numarası ve tedarikçi adında ayraç duyarsız arama yapıyor. Bu
 * yüzden fonksiyon async — koşul kurucularının tek async olanı.
 */
export async function alimKosulu(
  p: SuzgecParametreleri,
  an: Date = new Date(),
): Promise<{ kosul: Prisma.PurchaseWhereInput; pencere: PencereCozumu }> {
  const pencere = pencereCoz(p, an);

  const arama = temiz(p.q);
  const durum = temiz(p.durum);
  const hesap = temiz(p.hesap);
  const tedarikci = temiz(p.tedarikci);
  const kart = temiz(p.kart);

  const aramaKosulu = await alimAramaKosulu(arama);

  const kosul: Prisma.PurchaseWhereInput = {
    ...(pencere.aralik ? { purchasedAt: pencere.aralik } : {}),
    ...(aramaKosulu ?? {}),
    // Bileşik "bekleyen" ÖNCE denenir; tek durum kontrolü onu tanımaz.
    ...(durum === ALIM_BEKLEYEN_KODU
      ? { status: { in: [...ALIM_BEKLEYEN_DURUMLARI] } }
      : alimDurumuGecerliMi(durum)
        ? { status: durum as Prisma.PurchaseWhereInput["status"] }
        : {}),
    ...(hesap ? { channelAccountId: hesap } : {}),
    ...(tedarikci ? { supplierId: tedarikci } : {}),
    ...(kart ? { creditCardId: kart } : {}),
  };

  return { kosul, pencere };
}
