import { izYaz } from "@/lib/iz";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import type { KodRolu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  PAKETLEME İZİ (K34a ek — İŞ 2)
 * ----------------------------------------------------------------------------
 *  Barkod okutulup ürün AÇIK SİPARİŞTE bulunduğunda, o siparişin yanındaki
 *  "Paketlendi" tuşu siparişi `HAZIRLANIYOR` izine geçirir.
 *
 *  ⚠ TUŞ SATIRIN YANINDA, OKUMANIN DEĞİL. Barkod ÜRÜNÜ söyler, SİPARİŞİ
 *  söylemez: aynı ürün üç açık siparişte geçiyorsa hangisine paketlendiğini
 *  yalnız kullanıcı bilir. Okumaya bağlı tek bir tuş, sistemin bilmediği bir
 *  seçimi kendi yapması olurdu.
 *
 *  ⚠ ŞEMA DEĞİŞMEDİ — K34a ile AYNI MERDİVEN BASAMAĞI. İz `AuditLog`ta:
 *  `action` (indeksli) durumu, `targetType/targetId` satışı, `detail` okunan
 *  barkodu ve hangi alanda bulunduğunu, `userId` kimin paketlediğini taşıyor.
 *  Yeni durum sütunu AÇILMADI; ekrandaki "hazırlanıyor" işareti bu izden
 *  TÜRETİLİYOR.
 *
 *  ⚠ SİLME YOK. Yanlış tuşa basıldığında kayıt silinmez; ters yönde İKİNCİ
 *  bir kayıt yazılır ve en yenisi okunur. Ledger ilkesi: bir paketin kaç kez
 *  işaretlenip geri alındığı kendi başına bilgidir.
 *
 *  ⚠ KAPI DEĞİL. Tuşa basmadan da paketlenebilir; hiçbir şey engellenmez.
 * ============================================================================
 */

export const PAKETLENDI_EYLEMI = "PAKETLENDI";
export const PAKETLEME_GERI_ALINDI_EYLEMI = "PAKETLEME_GERI_ALINDI";

export const PAKETLEME_EYLEMLERI = [
  PAKETLENDI_EYLEMI,
  PAKETLEME_GERI_ALINDI_EYLEMI,
] as const;

export type PaketlemeIzi = { action: string; createdAt: Date };

/**
 * BİR SİPARİŞ HAZIRLANIYOR MU — EN YENİ İZ KAZANIR.
 *
 * ⚠ EŞİT ZAMAN DAMGASINDA "GERİ ALINDI" KAZANIR. Aynı milisaniyede iki kayıt
 * oluşabilir (hızlı çift tıklama) ve sıra belirsiz kalır. Belirsizliği
 * hangi yöne çözeceğimiz bir tercih değil, bir RİSK kararı: yanlışlıkla
 * "hazırlanıyor" göstermek, birinin paketi hazır sanıp ATLAMASINA yol
 * açabilir. Yanlışlıkla "hazırlanmadı" göstermek ise en fazla bir kez
 * fazladan bakılmasına.
 */
export function hazirlaniyorMu(izler: PaketlemeIzi[]): boolean {
  let enYeni: PaketlemeIzi | null = null;
  for (const iz of izler) {
    if (
      iz.action !== PAKETLENDI_EYLEMI &&
      iz.action !== PAKETLEME_GERI_ALINDI_EYLEMI
    ) {
      continue;
    }
    if (enYeni === null) {
      enYeni = iz;
      continue;
    }
    if (iz.createdAt.getTime() > enYeni.createdAt.getTime()) {
      enYeni = iz;
      continue;
    }
    /* Eşitlikte geri alma kazanır — yukarıdaki risk gerekçesi. */
    if (
      iz.createdAt.getTime() === enYeni.createdAt.getTime() &&
      iz.action === PAKETLEME_GERI_ALINDI_EYLEMI
    ) {
      enYeni = iz;
    }
  }
  return enYeni?.action === PAKETLENDI_EYLEMI;
}

/**
 * SATIŞ BAŞINA HAZIRLANIYOR HARİTASI.
 *
 * İzler tek sorguda çekilir ve burada gruplanır; satış başına ayrı sorgu
 * atmak, üç açık siparişi olan bir üründe üç gidiş-dönüş demekti.
 */
export function hazirlananSiparisler(
  izler: (PaketlemeIzi & { targetId: string | null })[],
): Set<string> {
  const gruplar = new Map<string, PaketlemeIzi[]>();
  for (const iz of izler) {
    if (!iz.targetId) continue;
    const liste = gruplar.get(iz.targetId);
    if (liste) liste.push(iz);
    else gruplar.set(iz.targetId, [iz]);
  }

  const sonuc = new Set<string>();
  for (const [saleId, liste] of gruplar) {
    if (hazirlaniyorMu(liste)) sonuc.add(saleId);
  }
  return sonuc;
}

/**
 * PAKETLEME İZİ YAZ — TEK GÖVDE, ÜÇ ÇAĞIRAN (K34a + K207).
 *
 * ⚠ Barkod okuma (`/okut`, `/paketle`) VE elle işaretleme (`/satislar`) AYNI
 * gövdeden geçer — biri değişip öteki unutulmasın diye (anayasa: "iki
 * yerde iki ölçüt olmaz"). `okuma` yalnız barkod bağlamında dolu; elle
 * işaretlemede `null` — zaten `PAKETLEME_GERI_ALINDI` de hep `null` yazıyordu.
 *
 * ⛔ SİLME YOK — TERS KAYIT. Yanlış tuşa basıldığında önceki iz silinmez.
 */
export async function paketlemeIziYaz(
  eylem: string,
  saleId: string,
  okuma: { kod: string; alan: KodRolu | null } | null,
): Promise<void> {
  try {
    const kullanici = await oturumdakiKullanici();
    await izYaz({
      userId: kullanici?.id ?? null,
      action: eylem,
      targetType: "Sale",
      targetId: saleId,
      /**
       * ⚠ YAPILANDIRILMIŞ, SERBEST METİN DEĞİL — K34a ④ ile aynı kural.
       * "Hangi barkodla paketlendi" sorusu ileride metin ayrıştırmaya
       * dönmesin diye şekil bugün sabitleniyor.
       */
      detail: okuma ? JSON.stringify(okuma) : null,
    });
  } catch (e) {
    /* İz tutulamadıysa paket yine hazırlanır; operasyon ölçüm için durmaz. */
    console.error("[okuma] paketleme izi yazılamadı:", e);
  }
}

/**
 * PAKETLENMİŞ SİPARİŞ KÜMESİ — VERİLEN KİMLİKLERLE SINIRLI (K207).
 *
 * ⚠ `hazirlananSiparisKimlikleri()`nin (gorev-verisi.ts) tersine TÜM
 * `AuditLog` tablosunu TARAMAZ — yalnız verilen sale id'lerini sorgular.
 * Bir liste sayfasının kendi SAYFASINDAKİ (ör. 50) satır için paketleme
 * durumunu göstermesi gerektiğinde bu kullanılır; tam tabloyu taramak
 * her sayfa yüklemesinde gereksiz büyürdü. Aynı ölçüt (`hazirlananSiparisler`)
 * gövdesinden geçtiği için panel sayacıyla asla ayrışmaz.
 */
export async function paketliSaleIdKumesi(
  saleIds: string[],
): Promise<Set<string>> {
  if (saleIds.length === 0) return new Set();
  const izler = await prisma.auditLog.findMany({
    where: {
      action: { in: [...PAKETLEME_EYLEMLERI] },
      targetType: "Sale",
      targetId: { in: saleIds },
    },
    select: { action: true, createdAt: true, targetId: true },
  });
  return hazirlananSiparisler(izler);
}
