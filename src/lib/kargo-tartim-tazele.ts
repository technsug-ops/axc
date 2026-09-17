import { prisma } from "@/lib/prisma";
import { izYaz } from "@/lib/iz";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { n11KargoMaliyeti } from "@/lib/n11-kargo-tarifesi";

/**
 * ============================================================================
 *  GERÇEK DESİ GELİNCE, HENÜZ TAHMİN AŞAMASINDAKİ SİPARİŞİN KARGO
 *  TUTARINI VE KÂRINI TAZELE (K197-4/K201 SONRASI, 15.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ÖNCEKİ HÂL (K197-4, 09.09.2026): `kanalKargoDesi` bilerek NET'i,
 *  `cargoAmount`ı ve kâr hesabını "hiçbir şekilde etkilemez" diye kuruldu —
 *  kullanıcı kararı: "geçmişte gösterilecek ufak tefek gelir/kâr farklılıkları
 *  problem değil; asıl sistemin doğru kurulması önemli." O karar GEÇERLİ
 *  kalıyor: `cargoAmount` (kanalın/hakedişin GERÇEKLEŞEN dediği) dolu bir
 *  siparişe bu gövde HİÇ dokunmaz — eski gerekçe hâlâ doğru.
 *
 *  ⭐ ÇEVRİLEN KISIM (mimar kararı 15.09.2026): `cargoAmount` HÂLÂ boşsa,
 *  o sipariş bugün TAHMİNLE NET veriyor demektir — ve elimize gerçek desi
 *  (TARTIM) yeni geçtiyse, o tahmin ESKİ (ürün bazlı TAHMİN ya da KÜRESEL)
 *  bir desiyle hesaplanmış olabilir. Bu durumda tahmin TARTIM'la YENİDEN
 *  hesaplanır ve kâr (`satisKarTazele`) tazelenir. Yalnız BU dar durum —
 *  "hâlâ tahmin aşamasında olan sipariş" — kapsam dışına ASLA taşınmaz.
 *
 *  ⚠ NİYE GENİŞLETİLMEDİ: `cargoAmount` doluysa kanal zaten kesin bir tutar
 *  söylemiş demektir; o tutarın üstüne "daha doğru bir desiyle" gitmek,
 *  kanalın kendi beyanını bizim tahminimizle EZMEK olurdu — kaynak
 *  önceliğinin (içerden gelen bilgi üsttedir) tam tersi.
 *
 *  ⚠ `cargoDesi` (ürün bazlı TAHMİN) HİÇ DEĞİŞMEZ — "ne kadar yanılmışız"
 *  sorusunun cevabı orada duruyor. Yalnız `tahminiKargo` (TÜRETİLMİŞ tutar)
 *  güncellenir; ham desi karşılaştırması bozulmaz.
 *
 *  ⚠ İZ BIRAKIR: `tahminiKargo` sessizce üstüne yazılmaz — eski/yeni değer,
 *  kullanılan desi ve firma `AuditLog`a yazılır. _(Anayasa: "toplu yazımda
 *  önceki değer saklanır"; "kesik iz silinmez".)_
 * ============================================================================
 */

/**
 * KANALIN BİLDİRDİĞİ FİRMA ADI → BİZİM `CargoCarrier` KAYDIMIZ.
 *
 * ⛔ DİZE EŞLEŞTİRMESİ SABİT VE DAR TUTULUR — ölçülmemiş bir benzerlik
 * kuralı (ör. "içeriyor mu") yanlış firmaya bağlardı. Haritada olmayan bir
 * ad FIRMA_BILINMIYOR döner, asla en yakınına yuvarlanmaz.
 * _(Anayasa: "kanalın yazdığı ad bizim CargoCarrier kaydımızla birebir
 * tutmayabilir; eşleştirme bilerek yapılmıyor" — burada bilerek ve SABİT
 * bir haritayla, ölçülmüş adlarla yapılıyor.)_
 *
 * ⚠ ÖLÇÜLDÜ (15.09.2026): TY bugüne kadar yalnız "Aras Kargo Marketplace"
 * bildirdi (576 satış); HB "Aras Kargo" ve "hepsiJET" bildirdi (41 satış).
 * Yeni bir ad görülürse harita GENİŞLETİLİR, tahmin edilmez.
 */
const TY_FIRMA_ESLEME: Record<string, string> = {
  "Aras Kargo Marketplace": "Aras Kargo",
};
const HB_FIRMA_ESLEME: Record<string, string> = {
  "Aras Kargo": "Aras Kargo",
  hepsiJET: "hepsiJET",
};

/** Kanal adına göre doğru harita — dizin dışına çıkmaz. */
export function firmaEslemesi(kanalAdi: string, kanalKargoFirmasi: string | null): string | null {
  if (kanalKargoFirmasi === null) return null;
  if (kanalAdi === "Trendyol") return TY_FIRMA_ESLEME[kanalKargoFirmasi] ?? null;
  if (kanalAdi === "Hepsiburada") return HB_FIRMA_ESLEME[kanalKargoFirmasi] ?? null;
  return null;
}

export type TahminSonucu =
  | { tamam: true; tutar: number; carrierAdi: string }
  | { tamam: false; kod: "FIRMA_YOK" | "FIRMA_BILINMIYOR" | "TARIFE_YOK" | "DESI_YOK" | "KANAL_DESTEKLENMIYOR" };

/** `CargoTariff` genel tablosundan — yalnız TY/HB (tablo N11'de boş). */
async function tarifeTablosundanTahmin(
  db: Pick<typeof prisma, "cargoCarrier" | "cargoTariff">,
  kanalAdi: string,
  channelId: string,
  kanalKargoFirmasi: string | null,
  desi: number,
  /** ⚠ K201-4 — hangi tarife partisi geçerli, satışın günüyle çözülür. */
  soldAt: Date,
): Promise<TahminSonucu> {
  const carrierAdi = firmaEslemesi(kanalAdi, kanalKargoFirmasi);
  if (kanalKargoFirmasi === null) return { tamam: false, kod: "FIRMA_YOK" };
  if (carrierAdi === null) return { tamam: false, kod: "FIRMA_BILINMIYOR" };
  const carrier = await db.cargoCarrier.findFirst({ where: { name: carrierAdi }, select: { id: true } });
  if (!carrier) return { tamam: false, kod: "FIRMA_BILINMIYOR" };
  /**
   * ⚠ Tarife TAM desi adımında; kesirli desi YUKARI yuvarlanır (N11'le aynı kural).
   * ⛔ K201-4 (17.09.2026) — `orderBy` YOKTU; bkz. `kar-yeniden.ts`'teki aynı
   * düzeltme. Burada da `soldAt` kullanılır, `now()` değil: gerçek desi
   * genelde satıştan kısa süre sonra gelir ama tam tarife geçiş gününde
   * (ör. 10 Eylül) hâlâ tahmin aşamasında kalmış ESKİ bir satışa yeni
   * tarife sessizce uygulanmasın.
   */
  const tarife = await db.cargoTariff.findFirst({
    where: {
      channelId,
      carrierId: carrier.id,
      desi: Math.max(0, Math.ceil(desi - 0.0001)),
      effectiveFrom: { lte: soldAt },
    },
    orderBy: { effectiveFrom: "desc" },
    select: { amount: true },
  });
  if (!tarife) return { tamam: false, kod: "TARIFE_YOK" };
  return { tamam: true, tutar: Number(tarife.amount.toString()), carrierAdi };
}

/**
 * Kanal-agnostik dispatcher — tek gövde, üç kanal da buradan geçer.
 * ⛔ DIŞA AÇIK: önizleme betikleri (yazmadan "ne hesaplanırdı" göstermek
 * için) bunu doğrudan çağırır — `kargoTartimGeldiTazele`nin YAZAN kısmına
 * girmeden aynı hesabı görmek için ikinci bir kopya yazılmasın.
 */
export async function kanalTahminiHesapla(
  db: Pick<typeof prisma, "cargoCarrier" | "cargoTariff">,
  girdi: {
    kanalAdi: string;
    channelId: string;
    kanalKargoFirmasi: string | null;
    desi: number;
    /** ⚠ K201-4 — tarife partisi seçimi bu tarihe göre çözülür. */
    soldAt: Date;
  },
): Promise<TahminSonucu> {
  if (girdi.desi <= 0 || !Number.isFinite(girdi.desi)) return { tamam: false, kod: "DESI_YOK" };
  if (girdi.kanalAdi === "Trendyol" || girdi.kanalAdi === "Hepsiburada") {
    return tarifeTablosundanTahmin(
      db,
      girdi.kanalAdi,
      girdi.channelId,
      girdi.kanalKargoFirmasi,
      girdi.desi,
      girdi.soldAt,
    );
  }
  if (girdi.kanalAdi === "N11") {
    /**
     * ⚠ BUGÜN ÖLÇÜLMÜŞ HİÇBİR N11 SİPARİŞİ BU YOLU TETİKLEMİYOR: N11 API'si
     * desi hiç vermiyor (`kanalDesi: null` hep sabit, bkz. canli-n11-ice-aktar.ts).
     * Dal yine de yazıldı — kanal-agnostik olduğu iddiası koda karşılıksız
     * kalmasın diye; N11 bir gün desi vermeye başlarsa buraya bağlanır.
     */
    const n = n11KargoMaliyeti({ desi: girdi.desi, kanalFirmasi: girdi.kanalKargoFirmasi });
    if (!n.tamam) return { tamam: false, kod: n.kod === "DESI_YOK" ? "DESI_YOK" : "TARIFE_YOK" };
    return { tamam: true, tutar: n.tutar, carrierAdi: n.firma ?? "ortalama" };
  }
  return { tamam: false, kod: "KANAL_DESTEKLENMIYOR" };
}

export type TazeleGirdisi = {
  saleId: string;
  channelId: string;
  kanalAdi: string;
  kanalKargoFirmasi: string | null;
  /** Kanalın YENİ bildirdiği gerçek (tartılmış) desi — çağıran taraf bunun
   *  bu turda İLK KEZ dolduğunu zaten biliyor. */
  kanalKargoDesi: number;
  cargoAmount: number | null;
  tahminiKargo: number | null;
  /**
   * ⚠ K201-4 (17.09.2026) — tarife partisi SATIŞIN GÜNÜNE göre seçilir,
   * tartımın geldiği ANA göre değil: gerçek desi genelde satıştan kısa
   * süre sonra gelir ama tarife geçiş gününde (ör. 10 Eylül) hâlâ tahmin
   * aşamasında kalmış eski bir satışa yeni tarife sessizce uygulanmasın.
   */
  soldAt: Date;
};

export type TazeleSonucu =
  | { yapildi: true; eskiTahmin: number | null; yeniTahmin: number }
  | {
      yapildi: false;
      neden: "ZATEN_GERCEKLESEN" | "FIRMA_YOK" | "FIRMA_BILINMIYOR" | "TARIFE_YOK" | "DESI_YOK" | "KANAL_DESTEKLENMIYOR";
    };

/**
 * ⚠ `cargoAmount` DOLUYSA HİÇ DOKUNULMAZ — K197-4'ün "gerçekleşeni ezme"
 * kuralı burada da geçerli, kapsam yalnız TAHMİN aşamasındaki siparişe daralır.
 */
export async function kargoTartimGeldiTazele(
  girdi: TazeleGirdisi,
  db: typeof prisma = prisma,
): Promise<TazeleSonucu> {
  if (girdi.cargoAmount !== null) return { yapildi: false, neden: "ZATEN_GERCEKLESEN" };

  const hesap = await kanalTahminiHesapla(db, {
    kanalAdi: girdi.kanalAdi,
    channelId: girdi.channelId,
    kanalKargoFirmasi: girdi.kanalKargoFirmasi,
    desi: girdi.kanalKargoDesi,
    soldAt: girdi.soldAt,
  });
  if (!hesap.tamam) return { yapildi: false, neden: hesap.kod };

  const eskiTahmin = girdi.tahminiKargo;
  await db.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: girdi.saleId }, data: { tahminiKargo: String(hesap.tutar) } });
    await izYaz(
      {
        action: "KARGO_TAHMIN_TARTIMLA_TAZELE",
        targetType: "Sale",
        targetId: girdi.saleId,
        userId: null,
        detail: JSON.stringify({
          eskiTahmin,
          yeniTahmin: hesap.tutar,
          desi: girdi.kanalKargoDesi,
          firma: hesap.carrierAdi,
          kanal: girdi.kanalAdi,
        }),
      },
      tx,
    );
  });
  /** ⚠ AYRI ÇAĞRI — `satisKarTazele` kendi `$transaction`ını açar, iç içe
   *  işlem Prisma'da desteklenmez. Yukarıdaki yazım COMMIT olduktan sonra
   *  bu, güncel `tahminiKargo`yu okuyup kârı ona göre tazeler. */
  await satisKarTazele(girdi.saleId, db);

  return { yapildi: true, eskiTahmin, yeniTahmin: hesap.tutar };
}
