import { karHesapla, type KarGirdisi, type KarDurumu } from "@/lib/kar";
import { kdvHaricKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";
import { sonSayimTarihleri, sayimGecersizlestir } from "./sayim-damgasi";
import {
  israrGecerliMi,
  sayimKorumasi,
  type SayimIsrari,
} from "./sayim-korumasi";
import {
  acikPartiler,
  fifoDagit,
  gunSonu,
  partileriOncele,
  type Parti,
} from "@/lib/stok";

import type { Currency } from "@/generated/prisma/enums";
import {
  donemKapisi,
  donemIstisnaIzi,
  DONEM_ISTISNA_EYLEMI,
} from "@/lib/donem-kapisi";
import type { DonemIsrari } from "@/lib/donem-korumasi";

/**
 * ============================================================================
 *  SATIŞ KAYDI + FIFO STOK DÜŞÜMÜ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Satışın kaydı, FIFO düşümü ve negatif stok engeli TEK TRANSACTION içinde
 *  yapılır. Yarım satış kaydı oluşamaz: bir kalemde stok yetmiyorsa hiçbir
 *  satır yazılmaz, hiçbir stok hareketi oluşmaz.
 *
 *  Bir satış kalemi birden fazla partiden düşebilir. O durumda parti başına
 *  AYRI bir SALE_OUT hareketi yazılır; her hareket kendi partisini
 *  (`sourceMovementId`), o partinin birim maliyetini ve rafını taşır.
 *  Böylece "bu satış hangi maldan çıktı" sorusu ledger'dan cevaplanır.
 *
 *  Maliyet SaleItem'da tutulmaz — kâr motoru (sonraki aşama) SALE_OUT
 *  hareketlerinden okur. Para birimleri birbirine ÇEVRİLMEZ.
 * ============================================================================
 */

export type SatisKalemGirdisi = {
  variantId: string;
  quantity: number;
  unitPriceAmount: string;
  unitPriceCurrency: Currency;

  // --- kâr hesabı için, formdan gelen SON değerler (snapshot) ---
  /** Satış anında çözülen KDV oranı (%). */
  vatRate: number;
  /** Kanal SKU'sundan önerilen komisyon oranı (%). Tutar verilirse yok sayılır. */
  commissionRate: number | null;
  /** Panelde görülen komisyon TUTARI (KDV dahil). Doluysa oran kullanılmaz. */
  commissionAmount: number | null;

  /**
   * SPESİFİK BELİRLEME — operatörün seçtiği partinin hareket kimliği (K110).
   *
   * ⚠ `null` = SEÇİM YOK = FIFO. Varsayılan bu ve öyle kalmalı: alan
   * doldurulmadığında bugünkü davranış kuruşuna aynı sürer.
   */
  secilenPartiId: string | null;
};

export type SatisGirdisi = {
  code: string | null;
  /**
   * GÖNDERİ (TAKİP) NUMARASI — K41①, 24.08.2026.
   * Sipariş no ile AYNI KALIP: boş bırakılabilir, GİRİLİRSE BENZERSİZ.
   */
  shipmentCode: string | null;
  channelAccountId: string;
  soldAt: Date;
  note: string | null;
  kalemler: SatisKalemGirdisi[];

  // --- kargo (satışta seçilir, snapshot'lanır) ---
  cargoCarrierId: string | null;
  /** Pakete giren toplam desi — formdaki son değer. */
  cargoDesi: number | null;
  /**
   * KAÇ PAKETLE GÖNDERİLDİ — `PER_PACKAGE` kesintiler bununla çarpılır.
   * Verilmezse 1 (bölünmemiş sipariş).
   */
  paketSayisi?: number;
  /**
   * Elle girilen KDV DAHİL kargo tutarı. Doluysa tarife kullanılmaz —
   * komisyondaki oran/tutar ikilisinin aynısı: panel gerçeği kazanır.
   */
  cargoAmountManual: number | null;
  /**
   * ⭐ SAYIM KAPISI ISRARI — satış başına, kalem başına DEĞİL.
   * Kapıyı tetikleyen şey TARİH ve satışın tek tarihi var.
   * Verilmezse "ısrar edilmemiş" sayılır ve kapı duraksatır.
   */
  sayimIsrari?: SayimIsrari;
  /**
   * ⭐ DÖNEM KAPISI ISRARI (K108) — satış başına, kalem başına DEĞİL.
   * Sayım ısrarıyla AYNI gerekçe: kapıyı tetikleyen TARİH ve satışın tek
   * tarihi var. ⚠ Ama İKİSİ AYRI ALAN: sayım bir VARYANTIN fiziksel
   * sayımına, dönem bir AYIN beyanına bağlı. Tek alanda toplanırlarsa
   * kullanıcı sayım için verdiği onayla kapanmış bir dönemi de geçerdi.
   */
  donemIsrari?: DonemIsrari;
};

/** Stok yetmediğinde fırlatılır; transaction geri sarılır. */
export class YetersizStokHatasi extends Error {
  constructor(
    readonly variantId: string,
    readonly istenen: number,
    readonly mevcut: number,
  ) {
    super("Yetersiz stok");
    this.name = "YetersizStokHatasi";
  }
}

/**
 * ============================================================================
 *  SİPARİŞ NO ÇAKIŞMASI — İPTALLİ İLE AKTİF AYRI HÜKÜMDÜR
 * ----------------------------------------------------------------------------
 *  ⚠ VAKA 20.08.2026 — SİSTEM OPERATÖRÜ YANLIŞA ZORLADI.
 *
 *  Kullanıcı siparişi girdi, hata fark etti, İPTAL etti, aynı numarayla
 *  yeniden girmek istedi. Sistem _"bu sipariş mevcut"_ deyip reddetti —
 *  çünkü çakışma kontrolü iptalliyi süzmüyordu. Başka çıkış bırakılmadığı
 *  için numaranın sonuna bir `0` eklendi: `11518018178` → `115180181780`.
 *
 *  Sonuç: gerçek bir sipariş, **var olmayan bir numarayla** kaydedildi.
 *  Kanal ödeme dosyası gerçek numarayla geleceği için o satış hakedişle
 *  **hiçbir zaman** eşleşmeyecekti — hata vermeden, sessizce.
 *
 *  ── NİYE ENGEL KALKMIYOR, SADECE YÖN VERİLİYOR ──────────────────────────
 *  `Sale.code` veritabanında `@unique`. İptalli kaydı görmezden gelip yeni
 *  kayıt açtırmak MÜMKÜN DEĞİL — veritabanı yine reddederdi. Ve olsaydı
 *  bile doğru olmazdı: aynı sipariş için iki kayıt doğar, hangisinin
 *  gerçek olduğu belirsizleşir.
 *
 *  Doğru davranış numarayı serbest bırakmak değil, **operatörü doğru
 *  düğmeye göndermek**: o satışın İPTALİNİ GERİ AL. Ekran zaten var
 *  (`satislar/[id]` → "İptali geri al") ve kârı da kendisi tazeliyor.
 *
 *  _"Uyarı çıkmaza götürmez" ilkesinin bu ekrandaki karşılığı: engelleyen
 *  mesaj, engeli AŞMANIN yolunu da söylemek zorundadır._
 * ============================================================================
 */
export type CakismaHukmu =
  | { tur: "YOK" }
  | { tur: "AKTIF"; satisId: string }
  | { tur: "IPTALLI"; satisId: string };

/**
 * Çakışma hükmü — SAF. Veritabanına gitmez, yalnız bulunan kaydı yorumlar.
 *
 * ⚠ İki durumu ayırmak şart: aktif bir satışla çakışma GERÇEK bir
 * mükerrerlik uyarısıdır ("aynı satışı ikinci kez girme"); iptalli bir
 * satışla çakışma ise bir YÖNLENDİRMEDİR ("o kaydı geri al").
 */
export function siparisNoCakismaHukmu(
  mevcut: { id: string; iptalTarihi: Date | null } | null,
): CakismaHukmu {
  if (mevcut === null) return { tur: "YOK" };
  return mevcut.iptalTarihi === null
    ? { tur: "AKTIF", satisId: mevcut.id }
    : { tur: "IPTALLI", satisId: mevcut.id };
}

/** Sipariş numarası çakıştığında fırlatılır. */
export class SiparisNoCakismasiHatasi extends Error {
  constructor(
    readonly code: string,
    /** ⚠ Hüküm hatanın İÇİNDE taşınır — çağıran yeniden sorgulamasın. */
    readonly hukum: Exclude<CakismaHukmu, { tur: "YOK" }>,
  ) {
    super("Sipariş numarası zaten kayıtlı");
    this.name = "SiparisNoCakismasiHatasi";
  }
}

/**
 * ⭐ SAYIM KAPISI DURAKSATTI — kullanıcı ısrar etmedi.
 *
 * ⚠ HÜKÜM HATANIN İÇİNDE TAŞINIR: hangi varyantlar, hangi yön, hangi sayım
 * tarihi — çağıran yeniden sorgulamasın (`SiparisNoCakismasiHatasi` deseni).
 *
 * ⚠ VE ISRAR SATIŞ BAŞINA, KALEM BAŞINA DEĞİL: kapıyı tetikleyen şey TARİH
 * (`soldAt`) ve satışın tek bir tarihi var. Kalem başına sorulsaydı aynı
 * soru aynı cevapla defalarca sorulurdu.
 * _(Komisyon `oranIstisnasi` kalem başına — çünkü ORAN kalem başına.)_
 */
export class SayimKorumasiHatasi extends Error {
  constructor(
    readonly duraksayanlar: {
      variantId: string;
      yon: "ARTIRAN" | "DUSUREN";
      sayimTarihi: Date;
    }[],
    /** Israr neden geçersiz — `null` ise hiç ısrar edilmemiş. */
    readonly eksik: "onay" | "sebep" | "aciklama",
  ) {
    super("Sayım koruması duraksattı");
    this.name = "SayimKorumasiHatasi";
  }
}

/**
 * Satışı kaydeder ve stoğu FIFO ile düşer.
 *
 * @returns oluşan satışın kimliği
 * @throws YetersizStokHatasi | SiparisNoCakismasiHatasi
 */
export async function satisKaydet(girdi: SatisGirdisi): Promise<string> {
  return prisma.$transaction(async (tx) => {
    if (girdi.code) {
      const cakisan = await tx.sale.findUnique({
        where: { code: girdi.code },
        select: { id: true, iptalTarihi: true },
      });
      const hukum = siparisNoCakismaHukmu(cakisan);
      if (hukum.tur !== "YOK")
        throw new SiparisNoCakismasiHatasi(girdi.code, hukum);
    }

    /**
     * ⚠ GÖNDERİ NUMARASI ÇAKIŞMASI — AYNI ÖLÇÜT, AYNI GÖVDE.
     *
     * Aynı kod ikinci bir satışa girilirse okutma İKİ sonuç döndürür ve
     * hangisinin doğru olduğu bilinemez. Veritabanı `@unique` ile zaten
     * engelliyor ama ham Prisma hatası ekranda anlamsız görünürdü;
     * hüküm burada, sipariş numarasıyla AYNI kuraldan (`siparisNoCakismaHukmu`)
     * geçiyor — iptal edilmiş bir satışın kodu yeniden kullanılabilir.
     */
    if (girdi.shipmentCode) {
      const cakisan = await tx.sale.findUnique({
        where: { shipmentCode: girdi.shipmentCode },
        select: { id: true, iptalTarihi: true },
      });
      const hukum = siparisNoCakismaHukmu(cakisan);
      if (hukum.tur !== "YOK")
        throw new SiparisNoCakismasiHatasi(girdi.shipmentCode, hukum);
    }

    /**
     * ═══ SAYIM KAPISI ══════════════════════════════════════════════════════
     *
     * ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** Satış formu `soldAt`i
     * kullanıcıdan alıyor — yani sayımdan ÖNCEYE yazılabilir. Satış
     * DÜŞÜREN yöndedir ve asıl tehlike odur: sayılmış malı yok eder.
     *
     * ⚠ YASAK DEĞİL DURAKSAMA: geç girilen satış meşrudur. Kullanıcı ısrar
     * ederse geçer — sebebiyle ve izle.
     *
     * ⚠ VE HEPSİ TOPLANIR, İLKİNDE DURULMAZ: kullanıcıya "şu üç üründe
     * sayım var" demek, "birinde var" demekten daha kullanışlı — yoksa
     * aynı formu üç kez gönderip üç kez uyarı alır.
     */
    const sonSayimlar = await sonSayimTarihleri(
      tx,
      girdi.kalemler.map((k) => k.variantId),
    );
    const duraksayanlar: {
      variantId: string;
      yon: "ARTIRAN" | "DUSUREN";
      sayimTarihi: Date;
    }[] = [];
    for (const kalem of girdi.kalemler) {
      const karar = sayimKorumasi({
        sonSayimIsTarihi: sonSayimlar.get(kalem.variantId) ?? null,
        hareketIsTarihi: girdi.soldAt,
        /** ⚠ Satış çıkıştır — işaret EKSİ. */
        adet: -kalem.quantity,
      });
      if (karar.sonuc === "DURAKSA") {
        duraksayanlar.push({
          variantId: kalem.variantId,
          yon: karar.yon,
          sayimTarihi: karar.sayimTarihi,
        });
      }
    }
    /**
     * ═══ DÖNEM KAPISI (K108) — SAYIM KAPISININ HEMEN YANINDA ═══
     * ⚠ İKİ KAPI AYRI AYRI SORULUR ve sırası önemli değil: ikisi de
     * yazmadan ÖNCE, işlemin içinde koşuyor. Birleştirilselerdi tek bir
     * onay iki farklı riski birden geçerdi.
     */
    const donemSonucu = await donemKapisi(tx, girdi.soldAt, girdi.donemIsrari);

    if (duraksayanlar.length > 0) {
      /**
       * ⛔ SUNUCU EKRANA GÜVENMEZ — ekran düğmeyi kilitliyor ama aynı
       * ölçüt burada da koşuyor. İki yerde iki ölçüt olmasın diye ikisi de
       * `israrGecerliMi` saf gövdesini çağırıyor.
       */
      const g = israrGecerliMi(
        girdi.sayimIsrari ?? { onaylandi: false, sebep: null, aciklama: "" },
      );
      if (!g.gecerli) throw new SayimKorumasiHatasi(duraksayanlar, g.eksik);
    }

    // Aynı varyant birden fazla kalemde geçebilir; partilerin kalan durumu
    // kalemler arasında taşınmalı ki aynı parti iki kez tüketilmesin.
    const partiDurumu = new Map<string, Parti[]>();

    async function varyantinPartileri(variantId: string): Promise<Parti[]> {
      const mevcut = partiDurumu.get(variantId);
      if (mevcut) return mevcut;

      /**
       * ⛔ SINIR ZORUNLU — 29.08.2026 canlı arızasının kaynağı tam buydu.
       * Sınırsız çağrı, geriye dönük girilen bir satışın BUGÜNKÜ partiyi
       * tüketmesine izin veriyordu; 809 bağ böyle bozuldu.
       * Sınır SATIŞ GÜNÜNÜN SONU: aynı gün alınan mal içeride kalır
       * (ölçüldü: çıkışların %48,72'si partisiyle aynı anı taşıyor).
       */
      const partiler = await acikPartiler(tx, variantId, gunSonu(girdi.soldAt));
      partiDurumu.set(variantId, partiler);
      return partiler;
    }

    // ÖNCE tüm dağıtımlar hesaplanır. Böylece son kalemde stok yetmezse
    // önceki kalemler için hiçbir şey yazılmamış olur.
    const planlar: {
      kalem: SatisKalemGirdisi;
      dagitim: { parti: Parti; adet: number }[];
    }[] = [];

    for (const kalem of girdi.kalemler) {
      const partiler = await varyantinPartileri(kalem.variantId);
      /**
       * ⭐ SPESİFİK BELİRLEME (K110): seçilen parti BAŞA alınır, kalanlar FIFO
       * sırasında kalır. Seçim yoksa liste AYNEN geçer — bugünkü davranış
       * kuruşuna aynı sürer.
       */
      const oncelik = partileriOncele(partiler, kalem.secilenPartiId);
      const sonuc = fifoDagit(oncelik.partiler, kalem.quantity);

      if (!sonuc.yeterliMi) {
        throw new YetersizStokHatasi(
          kalem.variantId,
          kalem.quantity,
          sonuc.mevcut,
        );
      }

      partiDurumu.set(kalem.variantId, sonuc.kalanPartiler);
      planlar.push({ kalem, dagitim: sonuc.dagitim });
    }

    const satis = await tx.sale.create({
      data: {
        code: girdi.code,
        shipmentCode: girdi.shipmentCode,
        channelAccountId: girdi.channelAccountId,
        soldAt: girdi.soldAt,
        note: girdi.note,
      },
      select: { id: true },
    });

    for (const plan of planlar) {
      const satisKalemi = await tx.saleItem.create({
        data: {
          saleId: satis.id,
          variantId: plan.kalem.variantId,
          quantity: plan.kalem.quantity,
          unitPriceAmount: plan.kalem.unitPriceAmount,
          unitPriceCurrency: plan.kalem.unitPriceCurrency,
        },
        select: { id: true },
      });

      for (const pay of plan.dagitim) {
        await tx.stockMovement.create({
          data: {
            variantId: plan.kalem.variantId,
            type: "SALE_OUT",
            // Çıkış negatiftir.
            quantityDelta: -pay.adet,
            occurredAt: girdi.soldAt,
            saleItemId: satisKalemi.id,
            sourceMovementId: pay.parti.hareketId,
            // Mal hangi raftan çıktıysa o raf; varyantın güncel rafı değil.
            locationId: pay.parti.locationId,
            // Maliyet partiden kopyalanır — kâr motoru bunu okuyacak.
            unitCostAmount: pay.parti.birimMaliyet,
            unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
          },
        });
      }
    }

    // ------------------------------------------------------------------
    //  KÂR HESABI — aynı transaction içinde, satış anındaki oranlarla
    // ------------------------------------------------------------------
    //  Snapshot'tır: kategori oranı, komisyon oranı veya kargo tarifesi
    //  sonradan değişse bu satışın hesabı DEĞİŞMEZ. Yeniden hesaplama
    //  ayrı ve bilinçli bir eylemdir.
    await karHesabiniYaz(tx, satis.id, girdi, planlar);

    /**
     * ═══ İSTİSNA İZ BIRAKIR — İKİ YERE ═══════════════════════════════════
     *
     * ⭐ ANAYASA: _"'Devam edilsin' demek, kaydın sessizce geçmesi demek
     * değildir."_ İki AYRI okuyucu, biri ötekinin yerine geçmez:
     *  · `AuditLog`        → "ne oldu, hangi sebeple" (geçmişe bakan)
     *  · `sayimGecersizAt` → "bu varyantın sayımı ARTIK GEÇERSİZ"
     *                        (ileriye bakan: yeniden sayılmalı)
     *
     * ⚠ İŞLEM İÇİNDE YAZILIR: satış geri sarılırsa damga da sarılmalı.
     * Dışarıda yazılsaydı, başarısız bir satış sayımı geçersizleştirirdi.
     */
    /**
     * ⚠ DÖNEM İSTİSNASININ İZİ — İŞLEM İÇİNDE. Satış geri sarılırsa iz de
     * sarılmalı; dışarıda yazılsaydı başarısız bir satış "uyarıya rağmen
     * yazıldı" diye kayda geçerdi.
     */
    if (donemSonucu.durum === "ISRARLA_GECILDI") {
      await tx.auditLog.create({
        data: {
          action: DONEM_ISTISNA_EYLEMI,
          targetType: "Sale",
          targetId: satis.id,
          detail: donemIstisnaIzi({
            yol: "/satislar — yeni satış",
            donem: donemSonucu.donem,
            isTarihi: girdi.soldAt,
            israr: girdi.donemIsrari,
          }),
        },
      });
    }

    if (duraksayanlar.length > 0) {
      const an = new Date();
      await sayimGecersizlestir(
        tx,
        duraksayanlar.map((x) => x.variantId),
        an,
      );
      await tx.auditLog.create({
        data: {
          action: "SAYIM_KORUMASI_ISTISNASI",
          targetType: "Sale",
          targetId: satis.id,
          detail: JSON.stringify({
            yol: "/satislar — yeni satış",
            soldAt: girdi.soldAt.toISOString(),
            sebep: girdi.sayimIsrari?.sebep ?? null,
            aciklama: girdi.sayimIsrari?.aciklama.trim() || null,
            duraksayanlar: duraksayanlar.map((x) => ({
              variantId: x.variantId,
              yon: x.yon,
              sayimTarihi: x.sayimTarihi.toISOString(),
            })),
            sonuc: "SAYIM GECERSIZLESTI — bu varyantlar yeniden sayilmali.",
          }),
        },
      });
    }

    return satis.id;
  });
}

/** Kanalın kesinti kuralları + kargo tarifesi + FIFO maliyetiyle kârı yazar. */
async function karHesabiniYaz(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  saleId: string,
  girdi: SatisGirdisi,
  planlar: {
    kalem: SatisKalemGirdisi;
    dagitim: { parti: Parti; adet: number }[];
  }[],
) {
  const hesap = await tx.channelAccount.findUnique({
    where: { id: girdi.channelAccountId },
    select: { channelId: true },
  });
  if (!hesap) return;

  const kurallar = await tx.channelFee.findMany({
    where: {
      channelId: hesap.channelId,
      isActive: true,
      validFrom: { lte: girdi.soldAt },
    },
    orderBy: { validFrom: "desc" },
  });

  // Aynı koddan birden fazla sürüm varsa en yenisi geçerlidir.
  const gecerli = new Map<string, (typeof kurallar)[number]>();
  for (const k of kurallar) if (!gecerli.has(k.code)) gecerli.set(k.code, k);

  const komisyonKdvKurali = gecerli.get("KOMISYON_KDV");
  const komisyonKdvOrani = komisyonKdvKurali?.rate
    ? Number(komisyonKdvKurali.rate.toString())
    : null;

  /**
   * ⚠ İKİ KAPSAM DA ALINIR — `PER_SALE` ve `PER_PACKAGE`.
   * Süzgeç yalnız `PER_SALE` yazsaydı, paket başına kural sessizce
   * DÜŞERDİ ve kesinti hiç uygulanmazdı: kâr daha da şişerdi.
   * _"Tip listesi değil, bağ" dersinin kapsam hâli._
   */
  const siparisKesintileri = [...gecerli.values()]
    .filter((k) => k.scope === "PER_SALE" || k.scope === "PER_PACKAGE")
    .map((k) => ({
      code: k.code,
      basis:
        k.basis === "FIXED" ? ("FIXED" as const) : ("SALE_AMOUNT" as const),
      rate: k.rate ? Number(k.rate.toString()) : null,
      amount: k.amount ? Number(k.amount.toString()) : null,
      paketBasina: k.scope === "PER_PACKAGE",
    }));

  // --- kargo: ELLE GİRİLEN TUTAR TARİFEYİ EZER ---
  // Panel gerçeği tarifeden sapabilir (anlaşmalı fiyat, ek bedel...).
  let kargoTarifesi: number | null = null;
  let kargoTarifesiBulunamadi = false;
  // `!= null` bilerek: undefined de null gibi ele alınır. Aksi hâlde eksik
  // alan NaN üretip Decimal yazımını patlatıyordu (fifo:dogrula yakaladı).
  if (girdi.cargoAmountManual != null) {
    // Elle girilen tutar KDV DAHİL; motor KDV hariç bekliyor.
    kargoTarifesi = kdvHaricKargo(girdi.cargoAmountManual);
  } else if (girdi.cargoCarrierId && girdi.cargoDesi != null) {
    const tamDesi = Math.max(0, Math.ceil(girdi.cargoDesi));
    const tarife = await tx.cargoTariff.findFirst({
      where: {
        channelId: hesap.channelId,
        carrierId: girdi.cargoCarrierId,
        desi: tamDesi,
      },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargoTarifesiBulunamadi = true;
  }

  // --- kalem maliyetleri FIFO dağıtımından ---
  const kalemler: KarGirdisi["kalemler"] = planlar.map((plan) => {
    let maliyet: number | null = 0;
    let maliyetParaBirimi: Currency | null = null;

    for (const pay of plan.dagitim) {
      if (pay.parti.birimMaliyet === null) {
        maliyet = null;
        break;
      }
      maliyet = (maliyet ?? 0) + Number(pay.parti.birimMaliyet) * pay.adet;
      maliyetParaBirimi = pay.parti.birimMaliyetParaBirimi;
    }

    return {
      satisTutari: Number(plan.kalem.unitPriceAmount) * plan.kalem.quantity,
      satisParaBirimi: plan.kalem.unitPriceCurrency,
      maliyet,
      maliyetParaBirimi,
      kdvOrani: plan.kalem.vatRate,
      komisyonTutari: plan.kalem.commissionAmount,
      komisyonOrani: plan.kalem.commissionRate,
    };
  });

  const sonuc = karHesapla({
    kalemler,
    komisyonKdvOrani,
    siparisKesintileri,
    kargoTarifesi,
    kargoTarifesiBulunamadi,
    paketSayisi: girdi.paketSayisi,
  });

  const paraBirimi = girdi.kalemler[0]?.unitPriceCurrency ?? "TRY";

  // --- satış seviyesi snapshot ---
  await tx.sale.update({
    where: { id: saleId },
    data: {
      cargoCarrierId: girdi.cargoCarrierId,
      cargoDesi: girdi.cargoDesi === null ? null : String(girdi.cargoDesi),
      paketSayisi: Math.max(1, Math.trunc(girdi.paketSayisi ?? 1)),
      cargoAmount: kargoTarifesi === null ? null : String(kargoTarifesi),
      cargoCurrency: kargoTarifesi === null ? null : "TRY",
      net1Amount: String(sonuc.net1),
      net2Amount: String(sonuc.net2),
      profitCurrency: paraBirimi,
      profitStatus: sonuc.durum,
      calculatedAt: girdi.soldAt,
    },
  });

  // --- kalem seviyesi snapshot + kesinti satırları ---
  const kalemKayitlari = await tx.saleItem.findMany({
    where: { saleId },
    orderBy: { id: "asc" },
    select: { id: true, variantId: true, quantity: true },
  });

  for (const [i, plan] of planlar.entries()) {
    // planlar ile kayıtlar aynı sırada oluşturuldu.
    const kayit = kalemKayitlari[i];
    if (!kayit) continue;
    const kalemSonucu = sonuc.kalemler[i];

    await tx.saleItem.update({
      where: { id: kayit.id },
      data: {
        vatRate: String(plan.kalem.vatRate),
        commissionRate:
          plan.kalem.commissionRate === null
            ? null
            : String(plan.kalem.commissionRate),
        net1Amount: String(kalemSonucu.net1),
        net2Amount: String(kalemSonucu.net2),
        profitStatus: kalemSonucu.durum,
      },
    });

    for (const kesinti of kalemSonucu.kesintiler) {
      if (kesinti.tutar === 0 && kesinti.code === "KOMISYON") continue;
      await tx.saleFee.create({
        data: {
          saleId,
          saleItemId: kayit.id,
          code: kesinti.code,
          amount: String(kesinti.tutar),
          currency: paraBirimi,
        },
      });
    }
  }

  // --- sipariş başına kesintiler (saleItemId boş) ---
  for (const kesinti of sonuc.siparisKesintileri) {
    await tx.saleFee.create({
      data: {
        saleId,
        code: kesinti.code,
        amount: String(kesinti.tutar),
        currency: paraBirimi,
      },
    });
  }
}

/** Ekranların kâr durumunu okurken kullandığı tip. */
export type { KarDurumu };

/**
 * Bir satış kaleminin FIFO düşümleri — detay ekranı için.
 * Hangi partiden kaç adet düştüğü, o partinin maliyeti ve rafı.
 */
export async function kalemDusumleri(kalemIdleri: string[]) {
  // Boş liste geldiğinde `in: []` hiç satır döndürmez; ayrı erken çıkış
  // gerekmiyor ve dönüş tipi tek yerden türüyor.
  const hareketler = await prisma.stockMovement.findMany({
    where: { saleItemId: { in: kalemIdleri }, type: "SALE_OUT" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      saleItemId: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      location: { select: { code: true } },
      sourceMovement: {
        select: {
          id: true,
          occurredAt: true,
          type: true,
          purchaseItem: {
            select: { purchase: { select: { id: true, code: true } } },
          },
        },
      },
    },
  });

  const harita = new Map<string, typeof hareketler>();
  for (const hareket of hareketler) {
    if (!hareket.saleItemId) continue;
    const liste = harita.get(hareket.saleItemId) ?? [];
    liste.push(hareket);
    harita.set(hareket.saleItemId, liste);
  }
  return harita;
}

/** Tek bir FIFO düşümü — ekranların kullandığı satır tipi. */
export type Dusum =
  Awaited<ReturnType<typeof kalemDusumleri>> extends Map<string, (infer T)[]>
    ? T
    : never;

/**
 * ============================================================================
 *  SATIŞ KALEMİNİN GERİ DÖNÜŞLERİ — stoğa dönmüş adetler
 * ----------------------------------------------------------------------------
 *  ⚠ 17.08.2026 GÖRÜNTÜ BORCU. `kalemDusumleri` yalnız `SALE_OUT` satırlarını
 *  getirir — FIFO izlenebilirliği için doğrudur, hangi partiden düştüğü orada
 *  yazar. Ama adet düzenlemesiyle stoğa mal DÖNDÜĞÜNDE döküm bunu göstermez:
 *  1 adetlik satışta 2 çıkış satırı görünür, kullanıcı "adet 1 yazıyor ama
 *  burada 2 var" der.
 *
 *  Rakamlar doğruydu, GÖRÜNTÜ yanıltıcıydı — "kaydedilen ≠ görünen" dersinin
 *  aynısı. Dönüşler ayrı kaynak olarak okunur ve dökümde KENDİ SATIRI olur.
 *
 *  ── NİYE `kalemDusumleri` GENİŞLETİLMEDİ ────────────────────────────────
 *  O fonksiyonu ürün kârlılık kartı da kullanıyor ve "alımdan satışa kaç
 *  gün" hesabını `sourceMovement.occurredAt`ten çıkarıyor. Ayna girişin
 *  kaynak bağı YOKTUR (hayalet parti dersi); listeye karışsaydı kartın
 *  gün hesabı bozulurdu. İki soru ayrı, iki kaynak ayrı.
 * ============================================================================
 */
export async function kalemGeriDonusleri(kalemIdleri: string[]) {
  const hareketler = await prisma.stockMovement.findMany({
    where: { saleItemId: { in: kalemIdleri }, quantityDelta: { gt: 0 } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      saleItemId: true,
      quantityDelta: true,
      occurredAt: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      location: { select: { code: true } },
    },
  });

  const harita = new Map<string, typeof hareketler>();
  for (const hareket of hareketler) {
    if (!hareket.saleItemId) continue;
    const liste = harita.get(hareket.saleItemId) ?? [];
    liste.push(hareket);
    harita.set(hareket.saleItemId, liste);
  }
  return harita;
}

/** Tek bir geri dönüş satırı. */
export type GeriDonus =
  Awaited<ReturnType<typeof kalemGeriDonusleri>> extends Map<string, (infer T)[]>
    ? T
    : never;
