import { prisma } from "@/lib/prisma";
import { ayKaydir } from "@/lib/donem";
import { envanterVerisi } from "@/lib/envanter-veri";
import { DONEM_ISTISNA_EYLEMI } from "@/lib/donem-kapisi";
import { donemAnahtari, type DonemAnahtari } from "@/lib/donem-korumasi";

/**
 * ============================================================================
 *  DÖNEM RAPORU — MUHASEBECİYE VERİLECEK TEK SAYFA (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ YENİ HESAP YAZILMADI. Envanter değeri `envanterVerisi()` gövdesinden,
 *  kesintiler defterdeki `SaleFee` satırlarından, NET'ler satışın kendi
 *  snapshot'ından geliyor. İkinci bir hesap yolu açılsaydı iki rakam
 *  ayrışırdı ve hangisinin doğru olduğu sorulamazdı.
 *  _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir" ve K53'ün
 *  "aynı gövde, ikinci hesap yolu açılmaz" kuralı.)_
 *
 *  ── ⚠ HER RAKAM KAPSAMIYLA TAŞINIR ──────────────────────────────────────
 *  "₺747.024" tek başına bir belge değildir; "kaç satış üstünden" yazılmadan
 *  muhasebeci onu doğrulayamaz. Kapsam değişince sayı bayatlar ve bunu
 *  okuyan bilmek zorunda.
 *
 *  ── ⚠ KESİNTİLER DEFTERDEN, TARİFEDEN DEĞİL ────────────────────────────
 *  Oran bugün değişse geçmiş ayın raporu OYNAMAZ: satış anında snapshot'lanan
 *  `SaleFee` satırları okunuyor. Tarifeden yeniden hesaplamak, kapanmış bir
 *  dönemin rakamını bugünün oranıyla yeniden yazmak olurdu.
 *
 *  ── ⚠ İPTALLER HER YERDE DIŞARIDA ──────────────────────────────────────
 *  İptal edilmiş satış ciroya, NET'e, kesintiye ve beyana girmez. Sayıya
 *  katmak kaybı/kazancı ABARTMAK olurdu.
 * ============================================================================
 */

export type KesintiSatiri = { kod: string; tutar: number };

export type DonemRaporu = {
  yil: number;
  ay: number;
  /** Kapanmış mı — açık dönem raporu "değişebilir" şerhi taşır. */
  kapaliMi: boolean;
  /** ⚠ KAPSAM: bütün para rakamları BU satış kümesinin üstünden. */
  satisSayisi: number;
  ciro: number;
  net1: number;
  net2: number;
  /** Kesinti kodları ayrı satır — komisyon · kargo · hizmet · KDV · stopaj… */
  kesintiler: KesintiSatiri[];
  kesintiToplami: number;
  iadeSayisi: number;
  iadeTutari: number;
  /** Dönem SONUNDAKİ envanter değeri (mal bedeli, KDV hariç). */
  envanterMalBedeli: number;
  /** ⚠ ŞERH: mal bedeli toplamına GİREMEYEN satır sayısı. */
  envanterKdvCozulemeyen: number;
  /** ⚠ ŞERH: kârı hesaplanamayan satışlar — sessiz kalmaz. */
  hesaplanamayanSatis: number;
  /** ⚠ ŞERH: uyarıya rağmen bu döneme yazılan hareket sayısı. */
  uyariyaRagmen: number;
  /** Para birimi karışıksa rapor tek rakam veremez — ekran bunu söyler. */
  paraKarisikMi: boolean;
};

function donemSiniri(yil: number, ay: number): { bas: Date; bit: Date } {
  const bas = new Date(Date.UTC(yil, ay - 1, 1));
  const s = ayKaydir(yil, ay, 1);
  return { bas, bit: new Date(Date.UTC(s.yil, s.ay - 1, 1)) };
}

export async function donemRaporu(
  yil: number,
  ay: number,
): Promise<DonemRaporu> {
  const { bas, bit } = donemSiniri(yil, ay);

  const [donemKaydi, satislar, iadeler, izler] = await Promise.all([
    prisma.muhasebeDonemi.findUnique({
      where: { yil_ay: { yil, ay } },
      select: { durum: true },
    }),
    /**
     * ⚠ İPTALLER DIŞARIDA — ve bu süzgeç `AND` ile değil doğrudan koşulda,
     * çünkü burada başka bir kullanıcı süzgeci YOK; ezilecek bir şey yok.
     */
    prisma.sale.findMany({
      where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null },
      select: {
        id: true,
        profitStatus: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        items: { select: { unitPriceAmount: true, quantity: true } },
        fees: { select: { code: true, amount: true } },
      },
    }),
    /**
     * ⚠ İADE TUTARI KALEMİN SATIŞ FİYATINDAN — `ReturnItem`da tutar alanı YOK.
     * İadenin kendi `returnCargoAmount`/`penaltyAmount` alanları KARGO ve
     * CEZA; "iade tutarı" dendiğinde muhasebecinin sorduğu şey geri dönen
     * CİRODUR. Onu uydurmak yerine satılan kalemin fiyatından okuyoruz.
     */
    prisma.returnItem.findMany({
      where: { return: { occurredAt: { gte: bas, lt: bit } } },
      select: {
        quantity: true,
        saleItem: { select: { unitPriceAmount: true } },
      },
    }),
    /**
     * ⚠ "UYARIYA RAĞMEN" SAYISI İZDEN OKUNUR — kayda sütun açılmadı.
     * Merdivenin ilk basamağı (mevcut alan) yeterliydi: `AuditLog.detail`
     * içindeki `donem` alanı bu dönemi işaret ediyor.
     */
    prisma.auditLog.findMany({
      where: { action: DONEM_ISTISNA_EYLEMI },
      select: { detail: true },
    }),
  ]);

  let ciro = 0;
  let net1 = 0;
  let net2 = 0;
  let hesaplanamayan = 0;
  const kesintiHaritasi = new Map<string, number>();
  const paraBirimleri = new Set<string>();

  for (const s of satislar) {
    if (s.profitCurrency) paraBirimleri.add(s.profitCurrency);
    for (const k of s.items) {
      ciro += Number(k.unitPriceAmount.toString()) * k.quantity;
    }
    /**
     * ⛔ YALNIZ `CALCULATED` NET'LER TOPLANIR. Hesaplanamayan bir satışın
     * NET'i `null`; onu 0 sayıp toplamak, eksik bir hesabı "sıfır kâr" diye
     * göstermek olurdu (anayasa: bilinmeyen sıfıra çevrilmez).
     */
    if (s.profitStatus === "CALCULATED" && s.net1Amount && s.net2Amount) {
      net1 += Number(s.net1Amount.toString());
      net2 += Number(s.net2Amount.toString());
    } else {
      hesaplanamayan += 1;
    }
    for (const f of s.fees) {
      kesintiHaritasi.set(
        f.code,
        (kesintiHaritasi.get(f.code) ?? 0) + Number(f.amount.toString()),
      );
    }
  }

  const kesintiler = [...kesintiHaritasi.entries()]
    .map(([kod, tutar]) => ({ kod, tutar }))
    /** ⚠ SIRA TUTARA GÖRE: muhasebeci en büyük kalemi önce görmek ister. */
    .sort((a, b) => b.tutar - a.tutar);

  const iadeTutari = iadeler.reduce(
    (t, i) => t + Number(i.saleItem.unitPriceAmount.toString()) * i.quantity,
    0,
  );

  /**
   * ⚠ ENVANTER DÖNEM SONUNDAKİ HÂLİYLE — bugünkü değil. `envanterVerisi`
   * tarihli fotoğraf çekebiliyor ve bu rapor tam onu istiyor: kapanmış bir
   * ayın envanteri, o ay bittiğinde neydi.
   */
  const envanter = await envanterVerisi(bit);
  /**
   * ⚠ ALAN ADI `toplamMalBedeli` — ve o alan YALNIZ KDV oranı ÇÖZÜLEBİLEN
   * satırları topluyor. Çözülemeyen satır sayısı da taşınıyor: rakam
   * kapsamsız verilseydi muhasebeci eksik bir toplamı tam sanardı.
   */
  const envanterMalBedeli = envanter.sonuc.bloklar.reduce(
    (t, b) => t + b.toplamMalBedeli,
    0,
  );
  const envanterKdvCozulemeyen = envanter.sonuc.bloklar.reduce(
    (t, b) => t + b.kdvCozulemeyenSatir,
    0,
  );

  const anahtar = donemAnahtari(yil, ay);
  let uyariyaRagmen = 0;
  for (const iz of izler) {
    if (iz.detail === null) continue;
    try {
      const cozulen = JSON.parse(iz.detail) as { donem?: string };
      if (cozulen.donem === anahtar) uyariyaRagmen += 1;
    } catch {
      /**
       * ⚠ BOZUK İZ SESSİZCE SAYILMAZ AMA RAPORU DA DÜŞÜRMEZ. Sayılsaydı
       * olmayan bir istisna raporlanırdı; rapor düşseydi tek bozuk satır
       * muhasebeciyi belgesiz bırakırdı.
       */
    }
  }

  return {
    yil,
    ay,
    kapaliMi: donemKaydi?.durum === "KAPALI",
    satisSayisi: satislar.length,
    ciro,
    net1,
    net2,
    kesintiler,
    kesintiToplami: kesintiler.reduce((t, k) => t + k.tutar, 0),
    iadeSayisi: iadeler.length,
    iadeTutari,
    envanterMalBedeli,
    envanterKdvCozulemeyen,
    hesaplanamayanSatis: hesaplanamayan,
    uyariyaRagmen,
    paraKarisikMi: paraBirimleri.size > 1,
  };
}

/** Rapor adresinin dönem anahtarı — ekran ve PDF aynı gövdeden okur. */
export function raporAnahtari(yil: number, ay: number): DonemAnahtari {
  return donemAnahtari(yil, ay);
}
