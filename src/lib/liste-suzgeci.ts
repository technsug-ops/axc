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

  const kosul: Prisma.SaleWhereInput = {
    // Süzgeç kapalıysa alan HİÇ yazılmaz; `undefined` koşulu Prisma'da
    // "koşul yok" demektir ama açıkça atlamak niyeti okunur kılıyor.
    ...(pencere.aralik ? { soldAt: pencere.aralik } : {}),
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
  };

  return { kosul, pencere };
}

// ---------------------------------------------------------------------------
//  ALIM
// ---------------------------------------------------------------------------

/** Alım durumları — koşul kurucusunun tanıdığı değerler. */
export const ALIM_DURUM_KODLARI = [
  "DRAFT",
  "ORDERED",
  "PARTIAL",
  "RECEIVED",
  "CANCELLED",
] as const;

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
    ...(alimDurumuGecerliMi(durum)
      ? { status: durum as Prisma.PurchaseWhereInput["status"] }
      : {}),
    ...(hesap ? { channelAccountId: hesap } : {}),
    ...(tedarikci ? { supplierId: tedarikci } : {}),
    ...(kart ? { creditCardId: kart } : {}),
  };

  return { kosul, pencere };
}
