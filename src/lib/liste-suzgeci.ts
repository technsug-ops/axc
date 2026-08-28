import { alimAramaKosulu } from "@/lib/alim-arama";
import {
  LISTE_PENCERELERI,
  pencereOlustur,
  type Pencere,
  type PencereTuru,
} from "@/lib/donem";

import type { Prisma } from "@/generated/prisma/client";
import { KARGO_BEKLEYEN } from "@/lib/kargo-bekleyen";

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

/**
 * VERİ GÜVENİLİRLİĞİ SÜZGECİ — uyarı merkezinden gelir.
 *
 * ⚠ EŞİK BURADA YOK. Kümeyi `uyari/faz2-veri.ts` üretiyor ve satış
 * kimliklerini `supheliIdler` ile geçiriyor. Eşiği buraya kopyalasaydık
 * çan ile liste ayrı ayrı karar verir, bir gün ayrışırdı.
 */
export const VERI_SUZGECLERI = ["supheli"] as const;

/** Kâr süzgecinin tanıdığı değerler. */
export const KAR_SUZGECLERI = ["eksik", "tam", "zarar"] as const;
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
  /** `veri=supheli` için dışarıdan hesaplanmış satış kimlikleri. */
  supheliIdler?: string[],
  /** `paket=…` için hazırlanmış (paketlenmiş) satış kimlikleri. */
  paketliIdler?: string[],
): { kosul: Prisma.SaleWhereInput; pencere: PencereCozumu } {
  const pencere = pencereCoz(p, an);

  const arama = temiz(p.q);
  const kanal = temiz(p.kanal);
  const hesap = temiz(p.hesap);
  const kar = temiz(p.kar);
  const iade = temiz(p.iade);
  const iptal = temiz(p.iptal);
  const kargo = temiz(p.kargo);
  const veri = temiz(p.veri);
  const paket = temiz(p.paket);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  KİMLİK KÜMESİ KOŞULLARI TEK YERDE TOPLANIR (24.08.2026)
   * -----------------------------------------------------------------------
   *  ⚠ İKİ SÜZGEÇ AYNI ALANA YAZIYOR: `veri=supheli` ve `paket=…` ikisi de
   *  `id` üzerinden süzüyor. Nesneye düz `id:` olarak konsalardı ikincisi
   *  birincisini EZERDİ ve süzgeçlerden biri **sessizce** kaybolurdu —
   *  ekranda hata yok, yalnız yanlış liste. (`arama` ile `kar=eksik`
   *  arasında 17.08.2026'da yaşanan `OR` ezilmesinin aynısı.)
   *
   *  Bu yüzden kimlik koşulları bir diziye toplanıp tek `AND` olarak
   *  yazılıyor; yarın üçüncü bir kimlik süzgeci eklendiğinde de bedava
   *  doğru çalışır.
   * ═══════════════════════════════════════════════════════════════════════
   */
  const veKosullari: Prisma.SaleWhereInput[] = [];

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
    /**
     * ═══════════════════════════════════════════════════════════════════
     *  SATIŞ ARAMASI — SİPARİŞ NO + ÜRÜN KİMLİKLERİ (17.08.2026)
     * -------------------------------------------------------------------
     *  ⚠ Kullanıcı yakaladı: arama YALNIZ sipariş numarasına bakıyordu.
     *  "Bu ürünü hangi siparişte sattım", "şu pazaryeri SKU'su hangi
     *  satışlarda geçti" soruları operasyonun günlük soruları ve cevabı
     *  hiçbir ekranda yoktu.
     *
     *  Aynı tuzak alım listesinde 14.08.2026'da yaşanmıştı (`alim-arama.ts`
     *  başlığı); orada kapatıldı, satış tarafı unutulmuştu.
     *
     *  ── NEDEN `AND` İÇİNDE SARMALANDI ─────────────────────────────────
     *  `kar=eksik` süzgeci de kendi `OR` bloğunu yazıyor. İkisi aynı nesneye
     *  düz `OR` olarak konsaydı ikincisi birincisini EZERDİ ve süzgeçlerden
     *  biri sessizce kaybolurdu. `AND` içinde her koşul kendi `OR`unu
     *  korur — ikisi birlikte kullanılabilir.
     * ═══════════════════════════════════════════════════════════════════
     */
    ...(arama
      ? {
          AND: [
            {
              OR: [
                { code: { contains: arama } },
                /**
                 * GÖNDERİ (TAKİP) NUMARASI — K41①, 24.08.2026.
                 * Depoda elindeki kâğıtta hangisi yazıyorsa onu arar;
                 * "hangi kod hangi kutuya ait" ezberlemek zorunda kalmaz.
                 */
                { shipmentCode: { contains: arama } },
                { items: { some: { variant: { sku: { contains: arama } } } } },
                {
                  items: {
                    some: { variant: { companySku: { contains: arama } } },
                  },
                },
                {
                  items: {
                    some: { variant: { barcode: { contains: arama } } },
                  },
                },
                /** PAZARYERİ SKU'su — kullanıcı isteği 17.08.2026. */
                {
                  items: {
                    some: {
                      variant: {
                        channelSkus: {
                          some: { channelSku: { contains: arama } },
                        },
                      },
                    },
                  },
                },
                {
                  items: {
                    some: {
                      variant: { product: { name: { contains: arama } } },
                    },
                  },
                },
              ],
            },
          ],
        }
      : {}),
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
    /**
     * ZARARA GİDEN SATIŞLAR (2b). Panelin "N satış zararda" sayacı buraya
     * bağlanır.
     *
     * İKİ ŞART BİRLİKTE: NET-2 eksi OLMALI **ve** kâr HESAPLANMIŞ olmalı.
     * Yalnız `net2Amount < 0` denseydi, kârı hesaplanamamış satışların
     * NET'i `null` olduğu için listeye girmezdi — orası doğru; ama
     * `profitStatus` şartı olmadan yarın NET yazılıp durum bozuk kalırsa
     * o kayıt "zarar" sayılırdı. Zarar bir HÜKÜMDÜR; hesabı tamamlanmamış
     * satış hakkında hüküm verilmez.
     */
    ...(kar === "zarar"
      ? { profitStatus: "CALCULATED", net2Amount: { lt: 0 } }
      : {}),
    // İadesi olan / olmayan satışlar.
    ...(iade === "var" ? { returns: { some: {} } } : {}),
    ...(iade === "yok" ? { returns: { none: {} } } : {}),
    /**
     * ═══════════════════════════════════════════════════════════════════
     *  İPTAL SÜZGECİ — TEK KAYNAK (mimar şartı 17.08.2026)
     * -------------------------------------------------------------------
     *  İptal edilen satış ciroya, NET'e ve hakediş beklentisine GİRMEZ:
     *  mal hiç çıkmadı, komisyon kesilmedi, kargo yanmadı. İade gibi
     *  "düşülmez", HİÇ DOĞMAMIŞ sayılır ve kümeden çıkar.
     *
     *  VARSAYILAN GİZLİ, `?iptal=1` ile GÖRÜNÜR. Kayıt asla silinmez —
     *  görünmemesi yok olması değildir.
     *
     *  ⚠ BU SATIR TEK KAYNAKTIR. `prisma.sale` sorgusu yazan her yer bu
     *  koşuldan geçmek ZORUNDA; `iptal:bekci` bunu tarayıp süzgeçsiz
     *  sorguları kırmızıya düşürüyor. Her ekran kendi kontrolünü yazsaydı,
     *  biri unutulduğu gün o ekran iptalli satışları ciroya sayardı ve
     *  fark aylarca görülmezdi.
     * ═══════════════════════════════════════════════════════════════════
     */
    ...(iptal === "1" ? {} : { iptalTarihi: null }),
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
    /**
     * ⛔ ELLE `shippedAt: null` YAZILMAZ — tek gövde (K60).
     * İçe aktarılmış siparişin kargo tarihi BİLİNMİYOR; "çıkmadı" değil.
     * Panelin kutusu ve bu liste AYNI koşuldan beslenmeli, yoksa kutudaki
     * rakama tıklayınca başka bir liste açılır.
     */
    ...(kargo === "bekleyen" ? KARGO_BEKLEYEN : {}),
    /**
     * ŞÜPHELİ VERİ — küme DIŞARIDAN gelir (`supheliIdler`).
     *
     * ⚠ SQL'de ifade EDİLEMEZ: maliyet sütun olarak saklanmıyor, stok
     * hareketlerinden çözülüyor ve iki türetilmiş değeri (verim, maliyet
     * payı) karşılaştırıyoruz. Bu yüzden küme çağıran tarafta hesaplanıp
     * kimlik listesi olarak veriliyor — çanı besleyen gövdenin AYNISI.
     *
     * Liste `undefined` ise süzgeç istenmemiştir; BOŞ DİZİ ise istenmiş
     * ama hiç sonuç yoktur ve liste boş çıkar — doğru davranış budur.
     * "Süzgeç yokmuş gibi hepsini göster" sessiz bir kayıp olurdu.
     */
  };

  if (veri === "supheli") {
    veKosullari.push({ id: { in: supheliIdler ?? [] } });
  }

  /**
   * PAKETLEME SÜZGECİ — panelin "N paketlendi" rakamı buraya bağlanır.
   *
   * ⚠ KÜME DIŞARIDAN GELİR (`paketliIdler`), çünkü paketleme bir SÜTUN
   * değil `AuditLog` izi: en yeni iz `PAKETLENDI` mi yoksa
   * `PAKETLEME_GERI_ALINDI` mı — SQL'de ifade edilmiyor. Küme, panelin
   * sayacını besleyen gövdenin AYNISINDAN çözülüyor; iki ayrı "hazırlanıyor"
   * yorumu doğmasın diye.
   *
   * ⚠ `bekleyen` = kümenin DIŞI. Boş dizide `notIn: []` herkesi geçirir
   * (hiçbiri paketlenmemişse hepsi bekliyordur — doğru), `in: []` ise
   * kimseyi geçirmez (paketlenen yoksa liste boş — o da doğru).
   */
  if (paket === "hazirlanan") {
    veKosullari.push({ id: { in: paketliIdler ?? [] } });
  } else if (paket === "bekleyen") {
    veKosullari.push({ id: { notIn: paketliIdler ?? [] } });
  }

  if (veKosullari.length > 0) {
    kosul.AND = [...(Array.isArray(kosul.AND) ? kosul.AND : []), ...veKosullari];
  }

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

// ---------------------------------------------------------------------------
//  AKSAKLIK SAYISI → KAYNAK LİSTESİ (İlke #16)
// ---------------------------------------------------------------------------

/**
 * ⛔ BİR AKSAKLIK SAYISI, KAYNAĞINA GÖTÜRMEK ZORUNDA (kullanıcı kuralı
 * 28.08.2026). Panelde "47 satış hesaplanamadı" yazıyordu ve düz metindi:
 * rakamı gören kişi HANGİ satışlar olduğunu göremiyor, aramak zorunda
 * kalıyordu. Sayının işe yaraması için kaynağına açılması gerekir.
 *
 * ⚠ ADRESLER BURADA ÜRETİLİR, EKRANDA DEĞİL: süzgeç sözleşmesinin sahibi
 * bu dosya. Ekran kendi adresini kursaydı, `kar=eksik` koşulu değiştiğinde
 * sayı ile liste sessizce ayrışırdı — panelin en temel sözü "sayı = liste".
 */

/** ⚠ Saf: `Date` KULLANILMAZ, saat dilimi bu hesaba karışamaz. */
const AY_GUNLERI = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const artikYilMi = (yil: number) =>
  (yil % 4 === 0 && yil % 100 !== 0) || yil % 400 === 0;

/** Ayın gün sayısı — `ay` 1-12. */
export function ayinGunSayisi(yil: number, ay: number): number {
  if (ay < 1 || ay > 12) return 0;
  return ay === 2 && artikYilMi(yil) ? 29 : AY_GUNLERI[ay - 1];
}

const iki = (n: number) => String(n).padStart(2, "0");

/**
 * BİR AYIN kârı hesaplanamayan satışları.
 * ⚠ `bitis` DAHİLDİR (`pencereOlustur` OZEL dalı bir gün ileri taşıyor).
 */
export function karEksikAyAdresi(yil: number, ay: number): string {
  const son = ayinGunSayisi(yil, ay);
  if (son === 0) return "/satislar?kar=eksik";
  return (
    "/satislar?kar=eksik&pencere=OZEL" +
    `&baslangic=${yil}-${iki(ay)}-01` +
    `&bitis=${yil}-${iki(ay)}-${iki(son)}`
  );
}

/** BİR KANALIN kârı hesaplanamayan satışları. */
export function karEksikKanalAdresi(kanalKodu: string): string {
  const kod = kanalKodu.trim();
  return kod === ""
    ? "/satislar?kar=eksik"
    : `/satislar?kar=eksik&kanal=${encodeURIComponent(kod)}`;
}
