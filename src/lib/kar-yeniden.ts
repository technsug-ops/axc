import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import {
  komisyonKdvOrani as kesintiKomisyonKdvOrani,
  siparisKesintiKurallari,
} from "@/lib/siparis-kesintileri";
import { kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { desiSecimi, kargoSecimi } from "@/lib/kargo-kaynagi";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { karHesapla, type KarGirdisi, type KarSonucu,
  type KarDurumu,
} from "@/lib/kar";
import { kdvHaricKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ⚠ PRISMA PARAMETRE OLARAK ALINABİLİR (K164 oto-onay). Varsayılan global
 * `prisma` (uygulama içi çağrılar dokunulmadan çalışır); çekim BETİĞİ kendi
 * adaptör istemcisini geçer — global `prisma` `process.env.DATABASE_URL`e
 * bakar ve betikte canlıyı göstermeyebilir. `$transaction`a ihtiyaç var,
 * bu yüzden tam istemci tipi (tx değil).
 */
type KarIstemcisi = typeof prisma;

/**
 * ============================================================================
 *  KÂR YENİDEN HESAPLAMA
 * ----------------------------------------------------------------------------
 *  Kâr satış anında snapshot'lanır. Yanlış bir oran veya eksik kargo sonradan
 *  fark edilirse bu servis kullanılır: DEĞERLERİ DÜZELTİP yeniden hesaplar.
 *
 *  NE DEĞİŞİR : komisyon oran/tutarı, kargo firması/desi/tutarı, kâr snapshot'ı
 *  NE DEĞİŞMEZ: stok hareketleri, FIFO partileri, satılan adet, satış fiyatı
 *
 *  Yani ledger'a DOKUNULMAZ — kâr hesabı yeniden yazılır, mal hareketi değil.
 *  Bu ayrım bilinçlidir: stok düzeltmesi ters ADJUSTMENT ile yapılır.
 *
 *  `onizle` ile yazmadan sonuç alınır; ekran eski/yeni değerleri yan yana
 *  gösterip kullanıcıdan onay ister (Kullanıcı Kolaylığı #6).
 * ============================================================================
 */

/**
 * ============================================================================
 *  KARGO TUTARININ KAYNAĞI — TİPİN KENDİSİ ZORUNLU KILAR (K202-2, 18.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ESKİ TASARIM: `cargoAmountManual: number | null` + AYRI, OPSİYONEL bir
 *  `cargoAmountTahminiMi?: boolean` bayrağı. Beş doğrudan çağırandan yalnız
 *  BİRİ (`satisKarTazele`) bu bayrağı doğru geçiyordu; diğer dördü
 *  (`hesap-actions.ts` · `satis-duzenleme-veri.ts` · `iptal-geri-alma-
 *  veri.ts` · kullanıcının "Yeniden Hesapla" ekranı) HİÇ geçmiyordu —
 *  TypeScript bunu YAKALAMADI çünkü alan opsiyoneldi, derlenirdi.
 *
 *  ⚠ CANLI VAKA (17.09.2026, sipariş 4633427855): kullanıcı "Yeniden
 *  Hesapla" ekranında kargo tutarını BOŞ bıraktı (yalnız firma/desi girdi).
 *  Sistem `cargoDesi=2` (ÜRÜN TAHMİNİ — kanalın gerçek tartımı
 *  `kanalKargoDesi=3` DEĞİL) ile taze bir tarife hesapladı ve unutulan
 *  bayrak yüzünden bunu "gerçekleşen" diye `cargoAmount`a yazdı.
 *
 *  ⭐ YENİ TASARIM: tek bir alan, ÜÇ DURUMLU BİRLEŞİK TİP. "Bu tutar nereden
 *  geliyor" sorusunun cevabı olmadan tutar VERİLEMEZ — TypeScript her
 *  çağıranı bu seçimi yapmaya ZORLAR, unutmak DERLEME HATASI olur.
 */
export type CargoTutariBilgisi =
  | { tur: "YOK" }
  /** İnsan açıkça yazdı ya da kanal/mutabakat bunu doğruladı — cargoAmount'a YAZILIR. */
  | { tur: "GERCEK"; tutarKdvDahil: number }
  /** Önceden hesaplanmış bir tahmin (ör. `kargoSecimi()` sonucu) — NET'te
   *  KULLANILIR ama cargoAmount'a YAZILMAZ. */
  | { tur: "TAHMIN"; tutarKdvDahil: number };

/**
 * Eski `cargoAmountManual: number | null` şeklini yeni birleşik tipe çevirir.
 * ⚠ YALNIZ "GERÇEK" SINIFI İÇİN — bu betikler/ekranlar elle düzenleme ya da
 * mutabakat kaynağından geliyordu (K202-2 öncesi tasarımın "(a) sınıfı").
 * Yeni kod bu yardımcıyı ÇAĞIRMAZ; `cargoTutari`yi doğrudan, kendi
 * kaynağına göre (GERÇEK/TAHMIN/YOK) kurar.
 */
export function gercekCargoTutari(tutarKdvDahil: number | null): CargoTutariBilgisi {
  return tutarKdvDahil === null ? { tur: "YOK" } : { tur: "GERCEK", tutarKdvDahil };
}

export type YenidenHesaplaGirdisi = {
  saleId: string;
  /** Kalem kimliği -> düzeltilmiş komisyon. */
  kalemler: {
    saleItemId: string;
    commissionRate: number | null;
    commissionAmount: number | null;
  }[];
  cargoCarrierId: string | null;
  cargoDesi: number | null;
  /** `tur: "YOK"` ise VE `cargoCarrierId`+`cargoDesi` doluysa, taze bir
   *  tarife hesabı yapılır — bu HER ZAMAN tahmindir (bkz. `cargoTahminMi`). */
  cargoTutari: CargoTutariBilgisi;
};

export type YenidenHesaplaSonucu = {
  onceki: { net1: number | null; net2: number | null; durum: string | null };
  yeni: KarSonucu;
  paraBirimi: Currency;
  /**
   * ⛔ K202-2 (18.09.2026) — ARTIK ÇAĞIRANDAN GELMİYOR, BURADA ÇÖZÜLÜYOR.
   * Eskiden `girdi.cargoAmountTahminiMi` diye ÇAĞIRANIN geçmesi gereken bir
   * bayraktı ve yalnız `satisKarTazele` bunu doğru geçiyordu — `hesap-
   * actions.ts`, `satis-duzenleme-veri.ts`, `iptal-geri-alma-veri.ts` ve
   * `yeniden-hesapla-actions.ts` (kullanıcının "Yeniden Hesapla" ekranı)
   * HİÇ geçmiyordu, yani varsayılan `undefined` → `false` davranıyor ve
   * TARİFE TABANLI TAHMİN sessizce "gerçekleşen" diye `cargoAmount`a
   * yazılıyordu.
   * ⚠ CANLI VAKA (17.09.2026, sipariş 4633427855): kullanıcı "Yeniden
   * Hesapla" ekranında kargo tutarını BOŞ bıraktı (yalnız firma/desi
   * girdi); sistem `cargoDesi=2` (ÜRÜN TAHMİNİ, kanalın gerçek tartımı
   * `kanalKargoDesi=3` DEĞİL) ile taze bir tarife hesapladı ve bunu
   * "gerçekleşen" diye yazdı — hem YANLIŞ DESİ hem (o an düzeltilmemiş
   * sıralama hatası yüzünden) ESKİ TARİFE aynı anda karıştı.
   * ⭐ DÜZELTME: bayrak artık ÇAĞIRANDAN ALINMIYOR — `karOnizle`nin KENDİSİ,
   * hangi DALIN çalıştığına bakarak hesaplıyor: `cargoAmountManual` doluysa
   * (insan açıkça bir tutar yazdı) FALSE; taze tarife hesabı çalıştıysa
   * (`cargoCarrierId`+`cargoDesi` ile) HER ZAMAN TRUE — hangi ekrandan
   * geldiği ya da desi'nin hangi kaynaktan geldiği FARK ETMEZ. Bizim kendi
   * tarife tablomuzdan türetilen hiçbir sayı asla "gerçekleşen" olamaz.
   */
  cargoTahminMi: boolean;
};

/** Kâr girdisini veritabanından toplar; hesaplar ama YAZMAZ. */
export async function karOnizle(
  girdi: YenidenHesaplaGirdisi,
  db: KarIstemcisi = prisma,
): Promise<YenidenHesaplaSonucu | null> {
  const satis = await db.sale.findUnique({
    where: { id: girdi.saleId },
    include: {
      channelAccount: { select: { channelId: true } },
      items: {
        /**
         * KALDIRILMIŞ KALEM KÂRA GİRMEZ (K78).
         *
         * ⚠ VE AŞAĞIDAKİ YAZMA DÖNGÜSÜYLE SIRA SIRA EŞLEŞİR: `karYenidenYaz`
         * `satis.items.entries()` ile dönüp `yeni.kalemler[i]`i yazıyor. İki
         * sorgu farklı süzerse i'inci kalem BAŞKASININ NET'ini alır — sessiz
         * ve ekranda makul görünen bir para hatası. Bu yüzden iki yerde de
         * AYNI süzgeç ve AYNI sıra (`KALEM_GECERLI` + `orderBy: id asc`).
         */
        where: { ...KALEM_GECERLI },
        orderBy: { id: "asc" },
        include: {
          /**
           * MALİYET LEDGER'IN KENDİSİDİR — KALEME BAĞLI TÜM HAREKETLER.
           *
           * ⚠ 17.08.2026: burada `where: { type: "SALE_OUT" }` vardı ve adet
           * azaltmada yazılan ayna girişi (ADJUSTMENT) görmüyordu; kâr iki
           * adetlik maliyetle hesaplanıyordu. Süzgeç kaldırıldı, kural
           * `lib/kalem-maliyeti.ts`e taşındı: bağ varsa hareket sayılır.
           */
          stockMovements: {
            select: {
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
            },
          },
        },
      },
    },
  });
  if (!satis) return null;

  const kurallar = await db.channelFee.findMany({
    where: {
      channelId: satis.channelAccount.channelId,
      isActive: true,
      validFrom: { lte: satis.soldAt },
    },
    orderBy: { validFrom: "desc" },
  });
  /**
   * ⛔ TEKİLLEŞTİRME VE SÜZME ARTIK ORTAK GÖVDEDE (K116①, 31.08.2026).
   * Bu blok `satis.ts` ve `kar-yeniden.ts` içinde AYNI ANDA yazılıydı; biri
   * kaysaydı BİR YOL çift sabit gider yazar, öteki yazmazdı ve fark ancak
   * aynı satışı iki yoldan geçiren biri tarafından görülürdü.
   */

  const komisyonKdvOrani = kesintiKomisyonKdvOrani(kurallar);

  /**
   * ⚠ İKİ KAPSAM DA ALINIR — `PER_SALE` ve `PER_PACKAGE`.
   * Süzgeç yalnız `PER_SALE` yazsaydı, paket başına kural sessizce
   * DÜŞERDİ ve kesinti hiç uygulanmazdı: kâr daha da şişerdi.
   * _"Tip listesi değil, bağ" dersinin kapsam hâli._
   */
  const siparisKesintileri = siparisKesintiKurallari(kurallar);

  // --- kargo: gerçek/tahmin tutarı VARSA tarifeyi EZER ---
  let kargoTarifesi: number | null = null;
  let kargoTarifesiBulunamadi = false;
  /**
   * ⛔ K202-2 — `girdi.cargoTutari.tur === "TAHMIN"` İSE ya da bu fonksiyon
   * KENDİSİ taze bir tarife hesabı yaptıysa (aşağıdaki `else if` dalı)
   * sonuç HER ZAMAN tahmindir. Kim çağırdığı ya da desi'nin hangi
   * kaynaktan geldiği fark etmez: bizim `CargoTariff` tablomuzdan türetilen
   * bir sayı asla "kanalın gerçekleşen kesintisi" olamaz.
   */
  let cargoTahminMi = false;

  if (girdi.cargoTutari.tur !== "YOK") {
    // KDV DAHİL gelir; motor KDV hariç bekliyor.
    kargoTarifesi = kdvHaricKargo(girdi.cargoTutari.tutarKdvDahil);
    cargoTahminMi = girdi.cargoTutari.tur === "TAHMIN";
  } else if (girdi.cargoCarrierId && girdi.cargoDesi != null) {
    cargoTahminMi = true;
    /**
     * ⛔ K201-4 (17.09.2026) — `orderBy` YOKTU. Tarife partileri EKLENEBİLİR
     * (eski effectiveFrom SİLİNMEZ, bkz. `canli-hb-kargo-tarifesi-yukle.ts`);
     * 2026-09-10'da ikinci HB partisi eklenene kadar bu satırda TEK satır
     * vardı ve `findFirst` "hangisi" sorusunu hiç sormadan doğru geliyordu.
     * İkinci parti gelince MySQL'in sırasız taraması ESKİ (08-01) satırı
     * döndürdü — ÖLÇÜLDÜ: 17.964 desi/taşıyıcı kombinasyonunun 116/116'sında
     * (örneklenen) `findFirst` STALE tarifeyi verdi. Aynı dosyada iki satır
     * yukarıda `channelFee` AYNI deseni zaten kullanıyordu
     * (`validFrom: { lte: satis.soldAt }` + `orderBy: desc`) — kargo bunu
     * miras almamıştı ("iki yerde iki ölçüt olmaz").
     * ⚠ `satis.soldAt`, `now()` DEĞİL: bu TARİHÇE düzeltmesi/yeniden hesap —
     * satışın KENDİ gününde geçerli olan tarife okunur, bugünün tarifesi
     * değil (bkz. "iki tarih ilkesi" / additive tarih partileri).
     */
    const tarife = await db.cargoTariff.findFirst({
      where: {
        channelId: satis.channelAccount.channelId,
        carrierId: girdi.cargoCarrierId,
        desi: Math.max(0, Math.ceil(girdi.cargoDesi)),
        effectiveFrom: { lte: satis.soldAt },
      },
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargoTarifesiBulunamadi = true;
  }

  const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

  const kalemler: KarGirdisi["kalemler"] = satis.items.map((kalem) => {
    const { maliyet, paraBirimi } = kalemMaliyeti(
      kalem.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        birimMaliyet:
          h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
        birimMaliyetParaBirimi: h.unitCostCurrency,
      })),
    );
    const maliyetParaBirimi = paraBirimi as Currency | null;

    const duzeltme = duzeltmeler.get(kalem.id);

    return {
      satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      satisParaBirimi: kalem.unitPriceCurrency,
      maliyet,
      maliyetParaBirimi,
      // KDV oranı satış anındaki snapshot'tan gelir; yeniden hesapta DEĞİŞMEZ.
      kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
      komisyonTutari: duzeltme?.commissionAmount ?? null,
      komisyonOrani: duzeltme?.commissionRate ?? null,
    };
  });

  const yeni = karHesapla({
    kalemler,
    komisyonKdvOrani,
    siparisKesintileri,
    kargoTarifesi,
    kargoTarifesiBulunamadi,
    /**
     * ⚠ PAKET SAYISI SATIŞTAN OKUNUR. Yeniden hesap, kaydın kendi
     * gerçeğiyle koşmalı; varsayılan 1'e düşseydi bölünmüş bir satış her
     * tazelemede yeniden şişerdi.
     */
    paketSayisi: satis.paketSayisi,
  });

  return {
    onceki: {
      net1: satis.net1Amount ? Number(satis.net1Amount.toString()) : null,
      net2: satis.net2Amount ? Number(satis.net2Amount.toString()) : null,
      durum: satis.profitStatus,
    },
    yeni,
    paraBirimi: satis.profitCurrency ?? kalemler[0]?.satisParaBirimi ?? "TRY",
    cargoTahminMi,
  };
}

/** Önizlemedeki sonucu KALICI yazar. Ledger'a dokunmaz. */
/**
 * ⛔ NET YALNIZ `CALCULATED` İKEN YAZILIR — ötekilerde `null` (28.08.2026).
 *
 * `karHesapla` durumu ne olursa olsun bir sayı üretir: maliyet
 * bilinmiyorsa `0` sayıp, komisyon kuralı yoksa `0` sayıp devam eder.
 * O sayı bir HESAP DEĞİL, bir ARTIKTIR — ve kayda yazıldığında alan
 * "kârı budur" diye **iddia eder.**
 *
 * ⚠ ÖLÇÜLDÜ 28.08.2026 canlı: `NO_COST` satırlarda `net1` **₺5.668.424**,
 * `net2` **₺4.714.528** yazılıydı — maliyeti düşülmemiş rakamlar.
 * Bugün onları toplayan tüketici yoktu (`satis-toplami.ts` süzgecinde
 * `profitStatus: "CALCULATED"` var), ama koruma **DİSİPLİNE** bağlıydı:
 * süzgeci unutan İLK tüketici o rakamı kâra yazardı.
 *
 * ⛔ KURAL DURUMA GENELDİR, `NO_COST`A ÖZEL DEĞİL: `RULE_MISSING` ve
 * `CURRENCY_MISMATCH` de eksik bir hesabı temsil eder. Yalnız `NO_COST`
 * yazılsaydı, yarın doğan bir `RULE_MISSING` satırı aynı yalanı taşırdı.
 *
 * ⚠ SÜZGEÇ ZORUNLULUĞU KALDIRILMADI — ikinci savunma olarak duruyor.
 * _(Anayasa: "maliyet bilinmiyorsa NET de bilinmiyor"; "varsayılan değer
 * alanın anlamından türetilir".)_
 */
function netYaz(durum: KarDurumu, deger: number): string | null {
  return durum === "CALCULATED" ? String(deger) : null;
}

export async function karYenidenYaz(
  girdi: YenidenHesaplaGirdisi,
  db: KarIstemcisi = prisma,
): Promise<boolean> {
  const onizleme = await karOnizle(girdi, db);
  if (!onizleme) return false;

  const { yeni, paraBirimi, cargoTahminMi } = onizleme;

  await db.$transaction(async (tx) => {
    const satis = await tx.sale.findUnique({
      where: { id: girdi.saleId },
      /** ⛔ `karOnizle` İLE AYNI KÜME + AYNI SIRA — indeks eşleşmesi buna bağlı. */
      include: {
        items: {
          where: { ...KALEM_GECERLI },
          orderBy: { id: "asc" },
          select: { id: true },
        },
      },
    });
    if (!satis) return;

    // Eski kesinti dökümü silinir; yerine yenisi yazılır.
    // Bu SaleFee kayıtları hesabın fotoğrafıdır, ledger değildir —
    // yeniden hesapta değişmeleri beklenir.
    await tx.saleFee.deleteMany({ where: { saleId: girdi.saleId } });

    const kargoKalemi = yeni.siparisKesintileri.find((k) => k.code === "KARGO");
    const kargoHaric =
      kargoKalemi === undefined ? null : kargoKalemi.tutar / 1.2;
    /**
     * ⛔ TAHMİNİ KAYNAKLIYSA `cargoAmount`A YAZILMAZ — bkz. `cargoTahminMi`
     * alanının yorumu (`YenidenHesaplaSonucu`). NET hesabı `kargoHaric`i
     * zaten kullandı (yukarıda, `karHesapla` çağrısında); burada yalnız
     * SNAPSHOT engelleniyor. `karOnizle`nin KENDİ hesapladığı bayrak
     * kullanılır — çağırandan gelen bir bayrağa GÜVENİLMEZ (K202-2).
     */
    const cargoAmountYazilacak = cargoTahminMi ? null : kargoHaric;

    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        cargoCarrierId: girdi.cargoCarrierId,
        cargoDesi: girdi.cargoDesi === null ? null : String(girdi.cargoDesi),
        cargoAmount: cargoAmountYazilacak === null ? null : String(cargoAmountYazilacak),
        cargoCurrency: cargoAmountYazilacak === null ? null : "TRY",
        net1Amount: netYaz(yeni.durum, yeni.net1),
        net2Amount: netYaz(yeni.durum, yeni.net2),
        profitCurrency: paraBirimi,
        profitStatus: yeni.durum,
        calculatedAt: new Date(),
      },
    });

    const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

    for (const [i, kalem] of satis.items.entries()) {
      const sonuc = yeni.kalemler[i];
      if (!sonuc) continue;
      const duzeltme = duzeltmeler.get(kalem.id);

      await tx.saleItem.update({
        where: { id: kalem.id },
        data: {
          commissionRate:
            duzeltme?.commissionRate === null ||
            duzeltme?.commissionRate === undefined
              ? null
              : String(duzeltme.commissionRate),
          net1Amount: netYaz(sonuc.durum, sonuc.net1),
          net2Amount: netYaz(sonuc.durum, sonuc.net2),
          profitStatus: sonuc.durum,
        },
      });

      for (const kesinti of sonuc.kesintiler) {
        await tx.saleFee.create({
          data: {
            saleId: girdi.saleId,
            saleItemId: kalem.id,
            code: kesinti.code,
            amount: String(kesinti.tutar),
            currency: paraBirimi,
          },
        });
      }
    }

    for (const kesinti of yeni.siparisKesintileri) {
      await tx.saleFee.create({
        data: {
          saleId: girdi.saleId,
          code: kesinti.code,
          amount: String(kesinti.tutar),
          currency: paraBirimi,
        },
      });
    }
  });

  return true;
}

/**
 * SATIŞIN KÂRINI TAZELE — GİRDİYİ KAYITTAN KURAR.
 *
 * ⚠ ORTAK GÖVDE, ÜÇÜNCÜ KOPYA DEĞİL. Bu girdi kurulumu (`items` →
 * `commissionRate`, kargo firması/desi, KDV dahil kargo) hesap değiştirme ve
 * yeniden hesapla yollarında zaten iki kez yazılıydı. Üçüncüsünü elle
 * yazsaydık aynı satış üç yoldan üç türlü hesaplanabilirdi.
 *
 * ⚠ KOMİSYON ORANI TAŞINMAZ: kalemdeki snapshot oran korunur — oran
 * değişikliği ayrı bir düzeltmedir ve kendi ekranından yapılır.
 */
export async function satisKarTazele(
  saleId: string,
  db: KarIstemcisi = prisma,
): Promise<boolean> {
  const satis = await db.sale.findUnique({
    where: { id: saleId },
    select: {
      cargoCarrierId: true,
      cargoDesi: true,
      kanalKargoDesi: true,
      cargoAmount: true,
      tahminiKargo: true,
      /** Kaldırılmış kalemin komisyon düzeltmesi de olmaz. */
      items: {
        where: { ...KALEM_GECERLI },
        select: { id: true, commissionRate: true },
      },
    },
  });
  if (!satis) return false;

  /**
   * ⭐ KAYNAK SIRASI TEK GÖVDEDEN (K201): gerçekleşen kesinti varsa O,
   * yoksa tahmin. Sıra burada YAZILMAZ, `kargoSecimi` ÇAĞRILIR — iki
   * okuyucu iki farklı sıra kursaydı biri tahmini öteki gerçekleşeni
   * tercih ederdi ve ikisi de "doğru" görünürdü.
   */
  const kargo = kargoSecimi({
    cargoAmount:
      satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
    tahminiKargo:
      satis.tahminiKargo === null ? null : Number(satis.tahminiKargo.toString()),
  });

  /**
   * ⛔ K202-2 (18.09.2026) — DESİ DE TEK GÖVDEDEN (`desiSecimi`). Kaynak
   * "YOK" olduğunda (aşağıdaki `cargoTutari: { tur: "YOK" }`) `karOnizle`
   * `cargoDesi`+`cargoCarrierId` ile TAZE bir tarife hesabı yapar; o hesap
   * `satis.cargoDesi`yi (ÜRÜN TAHMİNİ) DEĞİL, TARTIM öncelikli `desiSecimi`
   * sonucunu görmeli — yoksa kanal ZATEN gerçek desiyi bildirmişken sistem
   * kendi ürün tahminiyle hesaplar (canlı vaka: sipariş 4633427855, tartım
   * desi=3 dururken ürün tahmini desi=2 kullanıldı).
   */
  const desi = desiSecimi({
    kanalKargoDesi:
      satis.kanalKargoDesi === null ? null : Number(satis.kanalKargoDesi.toString()),
    cargoDesi: satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
  });

  return karYenidenYaz(
    {
    saleId,
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      commissionRate:
        k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      commissionAmount: null,
    })),
    cargoCarrierId: satis.cargoCarrierId,
    cargoDesi: desi.desi,
    /**
     * ⛔ KAYNAK GERÇEKLEŞEN DEĞİLSE `cargoAmount`A YAZILMAZ (K197-4/K201,
     * 15.09.2026 düzeltmesi — K201-2, 16.09.2026 — ve K202-2, 18.09.2026).
     * Artık tip SEÇTİRİR: "YOK" ise `karOnizle` TAZE hesaplar (ve o hesap
     * HER ZAMAN tahmindir, bkz. `cargoTahminMi`); "TAHMIN"/"GERCEK" ise
     * `kargo.kaynak`tan BİREBİR taşınır, ayrı bir bayrağa GÜVENİLMEZ.
     *
     * ⚠ CANLI VAKA (16.09.2026, sipariş 11606375536): eski ölçüt `===
     * "TAHMINI"` yazıyordu ve `kargoSecimi()` ÜÇÜNCÜ bir sonuç da
     * döndürebiliyor — "YOK" (ikisi de boş; sipariş İLK KEZ onaylanıyor,
     * henüz ne gerçekleşen ne tahmin var). O durumda `=== "TAHMINI"`
     * **false** dönüyordu, bayrak korumayı DEVRE DIŞI bırakıyordu — ve
     * `karOnizle` boş tutar karşısında `cargoDesi` (ÜRÜN BAZLI TAHMİN,
     * kanalın TARTIM'ı DEĞİL) ile taze bir tarife hesabı yapıp bunu
     * "gerçekleşen" diye yazıyordu. Sonuç: desi=5 tahmini (₺117,85)
     * `cargoAmount`a girdi, kanalın gerçek desi=3 tartımı (₺100,84) hiç
     * görülmedi VE `kargoTartimGeldiTazele` bir daha asla düzeltemedi
     * (o gövde `cargoAmount` DOLUYSA hiç dokunmuyor). Bu değer NET hesabı
     * için kullanılır ama kanalın gerçekleşen kesintisi DEĞİLDİR.
     */
    cargoTutari:
      kargo.kaynak === "YOK"
        ? { tur: "YOK" }
        : {
            tur: kargo.kaynak === "GERCEKLESEN" ? "GERCEK" : "TAHMIN",
            tutarKdvDahil: kdvDahilKargo(kargo.tutar)!,
          },
    },
    db,
  );
}
