import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import {
  simulasyonZeminleri,
  type SimulasyonZemini,
} from "@/lib/fiyatlama/kart-verisi";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { kdvOraniniCoz } from "@/lib/kdv";
import { prisma } from "@/lib/prisma";
import { acikMaliyet } from "@/lib/buybox-fiyat";
import { etkinKuralOku } from "@/lib/buybox-kural-verisi";
import { acikPartiler } from "@/lib/stok";
import { kodKosulu } from "@/lib/varyant-arama-kurali";
import { kodlaVaryantCoz } from "@/lib/varyant-kod-cozumu";

/**
 * ============================================================================
 *  ÜRÜN ZEMİNİ — "BARKODU OKUT, GERİSİ GELSİN"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"ürün EAN, barkod, pazaryeri SKU gibi
 *  bilgileri girdiğimde bizde satılmışsa otomatik ortalama alım ve satım
 *  fiyatını, komisyon bilgisini yazsın. Ona göre kâr çıksın."_
 *
 *  nesatilir'in yapamayacağı şey tam olarak budur: orada üç rakamı da
 *  kullanıcı bilmek zorunda. Bizde alış maliyeti FIFO'da, komisyon oranı
 *  tarifede, satış geçmişi defterde ZATEN duruyor.
 *
 *  ── ORTALAMA ALIM: AÇIK PARTİ DEĞİL, BÜTÜN GEÇMİŞ ───────────────────────
 *  ⚠ Kârlılık kartındaki `ortalamaMaliyet` AÇIK PARTİLERİN ortalamasıdır —
 *  "elimdeki malın maliyeti" sorusunun cevabı. Burada sorulan soru farklı:
 *  _"bu ürünü genelde kaça alıyorum"_. Stoğu tükenmiş bir üründe açık parti
 *  yoktur ve o soru yine de cevaplanabilir olmalı.
 *
 *  Bu ayrım bugün bir kez daha canını yaktı: aynı gün, kartın "son alım"
 *  kutusu da açık partiden okuduğu için stok bitince "alım yok" diyordu ve
 *  93 varyantın 26'sı etkileniyordu. Aynı hatayı burada tekrarlamıyoruz.
 *
 *  ── ORTALAMALAR ADETLE AĞIRLIKLI ────────────────────────────────────────
 *  Basit ortalama, 1 adetlik bir alımla 50 adetlik bir alımı eşitler ve
 *  gerçekte ödenmeyen bir "ortalama" üretir.
 *
 *  ── HİÇBİR ŞEY YAZILMAZ ─────────────────────────────────────────────────
 *  Salt okuma. Bu modül bir denemeyi besler, kayıt üretmez.
 * ============================================================================
 */

/**
 * Alış maliyetinin hangi kaynaktan geldiği — ekran bunu YAZAR.
 * Sessiz seçim, iki ekranın aynı ürüne farklı rakam göstermesi demektir.
 */
export type MaliyetKaynagi = "ELDEKI" | "SON_ALIS";

/**
 * ============================================================================
 *  DENEME MALİYETİ SEÇİMİ — SAF GÖVDE
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA 08.11.2026 (kullanıcı bildirdi, ÖLÇÜLDÜ · varyant `axcali2950`):
 *  ekran alış kutusuna ₺7.607,99 yazıyordu; elde kalan 2 adedin maliyeti
 *  ₺9.899,00 idi. İkisi de kendi tanımına göre DOĞRUYDU:
 *
 *      2026-08-29  COUNT_CORRECTION  5 adet  9.899,00   ← fiziksel sayım
 *      2026-09-07  PURCHASE_IN       1 adet  7.607,99   ← EN SON ALIM
 *      2026-09-13/15  SALE_OUT  @7.607,99    ← o parti TÜKENDİ
 *      2026-10-08 · 10-30 · 11-03  SALE_OUT  @9.899,00  ← elde kalan BU
 *
 *  Yani "en son neye aldım" ile "elimdekinin maliyeti ne" ayrı sorular ve
 *  FİYAT KARARI ikincisini ister: satılacak olan eldeki maldır.
 *
 *  ⚠ VE KOLAY ÇARE ÖLÇÜMLE ELENDİ: `purchaseItemId` süzgecini gevşetip
 *  sayım düzeltmesini "alım" saymak bu vakayı ÇÖZMEZDİ — sayım 29.08,
 *  alım 07.09, yani alım daha YENİ. Sorun süzgeç değil, sorunun kendisi.
 *
 *  ⛔ 28.08.2026 KARARI SİLİNMEDİ — KAPSAMI DARALDI. "Ortalama değil son
 *  alım" kararı stoğu TÜKENMİŞ üründe aynen geçerli: orada açık parti
 *  yoktur ve "şunu yeniden alsam ne olur" sorusu yine cevaplanmalıdır.
 *  (Anayasa: ilke, kendi kapsamının dışına uygulanırsa hatayı korur.)
 * ============================================================================
 */
export function denemeMaliyetiSec(girdi: {
  eldekiAdet: number;
  eldekiMaliyet: number | null;
  sonAlisFiyati: number | null;
}): { tutar: number | null; kaynak: MaliyetKaynagi | null } {
  if (girdi.eldekiAdet > 0 && girdi.eldekiMaliyet !== null) {
    return { tutar: girdi.eldekiMaliyet, kaynak: "ELDEKI" };
  }
  if (girdi.sonAlisFiyati !== null) {
    return { tutar: girdi.sonAlisFiyati, kaynak: "SON_ALIS" };
  }
  return { tutar: null, kaynak: null };
}

export type UrunZemini = {
  variantId: string;
  ad: string;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;

  /** Adetle ağırlıklı ortalama alış (KDV DAHİL). Alımı yoksa null. */
  ortalamaAlis: number | null;
  alimAdedi: number;

  /**
   * EN SON ÖDENEN BİRİM MALİYET (KDV DAHİL) — hiç alınmadıysa null.
   *
   * ⚠ ORTALAMA DEĞİL, SON. Kullanıcı kararı 28.08.2026: _"ortalama alış
   * geldiği için yanıltıcı olabiliyor, direkt en son alım fiyatı gelsin."_
   *
   * ⛔ AYNI KARAR SATIŞ TARAFINDA 21.08.2026'DA VERİLMİŞTİ (`sonSatisFiyati`)
   * ve alış tarafı o değişikliğin DIŞINDA kalmıştı — bir tutarsızlık
   * (İlke #10: aynı işlem her ekranda aynı çalışır).
   *
   * ⚠ VE ÖLÇÜLDÜ (28.08.2026, n=708 alımlı varyant): ortalama ile son
   * **247 varyantta (%34,9) ayrışıyor**; |sapma| ortanca %3,15 · p90 %16,92
   * · **max %81,4** (`axcali2045`: ortalama ₺6.553 ↔ son ₺11.890). Ortalama
   * ile yapılan bir deneme o üründe kârlı görünüp gerçekte zarar ettirirdi.
   *
   * ⛔ ORTALAMA SİLİNMEDİ — ikisi de ekranda yazar. Form SON ile dolar,
   * özet satırı ikisini de gösterir; bilgi kaybı olmaz.
   */
  sonAlisFiyati: number | null;
  /** O alımın günü — rakamın ne kadar taze olduğu ekranda yazsın. */
  sonAlisTarihi: Date | null;

  /** Adetle ağırlıklı ortalama satış fiyatı (KDV DAHİL). Satışı yoksa null. */
  ortalamaSatis: number | null;
  satisAdedi: number;

  /**
   * EN SON SATILDIĞI BİRİM FİYAT (KDV DAHİL) — hiç satılmadıysa null.
   *
   * ⚠ ORTALAMA DEĞİL, SON. Kullanıcı kararı 21.08.2026: _"satış fiyatı
   * yazan yere en son satılan ürün fiyatını yaz."_ Gerekçesi denemenin
   * kendisinde: ortalama, aylar önceki bir fiyatı bugünkü denemeye
   * karıştırır ve **fiyat kaymasını gizler**. Bu ekran "şimdi ne yapayım"
   * diye soruyor; o sorunun başlangıç noktası en son fiilen olan şeydir.
   * (Anayasa: aynı veri, farklı soruya farklı pencereden bakar.)
   */
  sonSatisFiyati: number | null;
  /** O satışın günü — rakamın ne kadar taze olduğu ekranda yazsın. */
  sonSatisTarihi: Date | null;

  /** Ürünün KDV oranı — kategoriden çözülür. */
  kdvOrani: number;

  /** Elde kalan adet — "stok yok" ile "hiç alınmamış" ayrı şeyler. */
  eldekiAdet: number;

  /**
   * ELDEKİ MALIN ADETLE AĞIRLIKLI BİRİM MALİYETİ (KDV DAHİL) — açık parti
   * yoksa null. Kârlılık kartıyla AYNI gövdeden (`agirlikliOrtalama`).
   */
  eldekiMaliyet: number | null;

  /**
   * FİYAT DENEMESİNDE KULLANILACAK ALIŞ MALİYETİ — ve hangisinden geldiği.
   *
   * ⚠ KULLANICI KARARI 08.11.2026: stok VARKEN eldeki malın maliyeti,
   * stok bittiyse son alım. 28.08.2026'nın "son alım" kararı SİLİNMEDİ,
   * KAPSAMI daraldı — gerekçesi `denemeMaliyetiSec` gövdesinde.
   */
  denemeMaliyeti: number | null;
  denemeMaliyetKaynagi: MaliyetKaynagi | null;

  /** Kanal zeminleri: gerçek dilim tarifesi ve kesinti kuralları. */
  zeminler: SimulasyonZemini[];
};

/**
 * Koddan ürün zemini kurar — barkod · SKU · firma SKU · kanal SKU.
 *
 * ⚠ ARAMA `kodKosulu`DAN GEÇİYOR, kendi sorgusunu yazmıyor. Bu depoda tam
 * bu tuzağa düşülmüştü: `varyantAra` kuralı doğruydu ama Kanal SKU'yu hiç
 * sormuyordu. Ortak koşulu çağırmak, o kümenin bir daha ayrışmamasını sağlar.
 */
/**
 * ZEMİN SONUCU — "yok" ile "birden fazla" AYRI.
 *
 * ⛔ ÖNCE İKİSİ DE `null`DI ve çağıranlar ikisini birden "ürün bulunamadı"
 * diye çiziyordu. Yanlış ürünle zemin kurmaktan iyiydi ama operatöre
 * **yanlış sebebi** söylüyordu: var olan bir ürünü yokmuş gibi gösterip
 * onu yeniden tanımlamaya iter — yani ikiz sayısını artıran bir mesaj.
 * _(İlke #5: bir şey olmadıysa NEDEN olmadığı ekranda yazar.)_
 */
export type ZeminSonucu =
  | { durum: "BULUNDU"; zemin: UrunZemini }
  | { durum: "YOK" }
  | { durum: "COK"; adet: number };

export async function urunZemini(kod: string, an: Date): Promise<ZeminSonucu> {
  const temiz = kod.trim();
  if (temiz === "") return { durum: "YOK" };

  /**
   * ⛔ SESSİZ SEÇİM YOK (21.09.2026). Bir kod iki aktif varyanta uyuyorsa
   * zemin KURULMAZ. Yanlış ürünün maliyetiyle kurulan bir fiyat denemesi
   * kârlı görünüp zarar ettirirdi; susmak yanlış cevaptan iyidir.
   *
   * ⚠ VE BU SESSİZLİK BEYAN EDİLİYOR: çağıran bugün `null`ı "ürün
   * bulunamadı" diye çiziyor, oysa sebep "birden fazla bulundu". Ayrım
   * ekranda HENÜZ görünmüyor — açık kalem olarak panoda duruyor.
   */
  const cozum = await kodlaVaryantCoz(temiz);
  if (cozum.durum === "YOK") return { durum: "YOK" };
  if (cozum.durum === "COK")
    return { durum: "COK", adet: cozum.adaylar.length };

  const varyant = await prisma.productVariant.findUnique({
    where: { id: cozum.id },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      companySku: true,
      product: {
        select: {
          name: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });
  if (varyant === null) return { durum: "YOK" };

  /**
   * ── ORTALAMA ALIŞ — LEDGER'DAN ─────────────────────────────────────────
   * Alıma bağlı GİRİŞ hareketleri. Düzeltme (ADJUSTMENT) ve iade girişi
   * "alım" değildir; ikisi de pozitif hareket üretir ve süzülmezse ortalama
   * bozulur.
   *
   * ⚠ MALİYET HAREKETİN DAMGASINDAN (`unitCostAmount`): kasadan fiilen
   * çıkan tutarı taşıyan yer orası (kupon vakası 19.08.2026).
   */
  const girisler = await prisma.stockMovement.findMany({
    where: {
      variantId: varyant.id,
      purchaseItemId: { not: null },
      quantityDelta: { gt: 0 },
      unitCostAmount: { not: null },
    },
    select: { quantityDelta: true, unitCostAmount: true, occurredAt: true },
    /**
     * ⚠ SIRALAMA ORTALAMAYLA AYNI KÜMEDEN OKUNUYOR — iki rakam farklı
     * sorgudan gelseydi ekranda yan yana durup birbirini yalanlayabilirdi.
     * `occurredAt` eşitse `createdAt` ayırır: aynı güne damgalı iki alımda
     * "son" belirsiz kalmasın.
     */
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  let alimAdet = 0;
  let alimTutar = 0;
  for (const g of girisler) {
    alimAdet += g.quantityDelta;
    alimTutar += g.quantityDelta * Number(g.unitCostAmount);
  }

  /**
   * ── ORTALAMA SATIŞ — İPTALLİ HARİÇ ─────────────────────────────────────
   * İptal edilen satış hiç doğmamış sayılır; fiyat ortalamasına girmesi
   * gerçekte alınmamış bir parayı ortalamaya katmak olurdu.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: {
      variantId: varyant.id,
      sale: { iptalTarihi: null },
      ...KALEM_GECERLI,
    },
    select: { quantity: true, unitPriceAmount: true },
  });

  let satisAdet = 0;
  let satisTutar = 0;
  for (const k of kalemler) {
    satisAdet += k.quantity;
    satisTutar += k.quantity * Number(k.unitPriceAmount);
  }

  /**
   * ── SON SATIŞ — İPTALLİ HARİÇ ──────────────────────────────────────────
   * ⚠ Ortalamayla AYNI kümeden okunuyor (`sale.iptalTarihi: null`); iki
   * rakam farklı kümelerden gelseydi ekranda yan yana durup birbirini
   * yalanlarlardı.
   */
  const sonSatis = await prisma.saleItem.findFirst({
    where: {
      variantId: varyant.id,
      sale: { iptalTarihi: null },
      ...KALEM_GECERLI,
    },
    orderBy: { sale: { soldAt: "desc" } },
    select: { unitPriceAmount: true, sale: { select: { soldAt: true } } },
  });

  const stok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });

  /**
   * ⚠ ELDEKİ MALIN MALİYETİ KENDİ SORGUSUNU YAZMIYOR — buy box ekranıyla
   * AYNI gövdeden (`acikPartiler` + `acikMaliyet`). Ayrı bir kopya, iki
   * ekranın bir gün aynı ürüne farklı maliyet göstermesi demekti (İlke #10).
   *
   * ⚠ TERCİH ÜRÜNDEN OKUNUR (K366: en düşük · ortalama · en yüksek).
   * Buradan sabit "ortalama" demek, kullanıcının o ürün için seçtiği
   * tercihi sessizce yok saymak olurdu.
   *
   * ⚠ PARA BİRİMİ TRY — `acikMaliyet` tutmayan partiyi ELER ve o hâlde
   * `null` döner; seçim de son alıma düşer. Kur ÇEVRİLMEZ (anayasa).
   */
  const [partiler, kural] = await Promise.all([
    acikPartiler(prisma, varyant.id),
    etkinKuralOku(varyant.id),
  ]);
  const eldekiMaliyet = acikMaliyet(partiler, "TRY", kural.etkin.maliyet).maliyet;

  /**
   * KDV: ÜRÜN İSTİSNASI > KATEGORİ ORANI > VARSAYILAN %20 (anayasa sırası).
   * `kdvOraniniCoz` senkron ve saf; kaynağı da söylüyor ama burada yalnız
   * oran taşınıyor — ekran onu değiştirebiliyor.
   */
  const kdv = kdvOraniniCoz({
    vatRateOverride: varyant.product.vatRateOverride,
    category: varyant.product.category,
  });

  return {
    durum: "BULUNDU",
    zemin: {
      variantId: varyant.id,
      ad: varyant.name
        ? `${varyant.product.name} — ${varyant.name}`
        : varyant.product.name,
      sku: varyant.sku,
      barkod: varyant.barcode,
      firmaSku: varyant.companySku,
      /** ⚠ SIFIR ADETTE null — sıfıra bölmek yerine "bilinmiyor" doğru cevap. */
      ortalamaAlis: alimAdet > 0 ? alimTutar / alimAdet : null,
      alimAdedi: alimAdet,
      /** ⚠ Dizi `occurredAt asc` sıralı; sonuncusu EN YENİ giriştir. */
      sonAlisFiyati:
        girisler.length === 0
          ? null
          : Number(girisler[girisler.length - 1].unitCostAmount),
      sonAlisTarihi:
        girisler.length === 0 ? null : girisler[girisler.length - 1].occurredAt,
      ortalamaSatis: satisAdet > 0 ? satisTutar / satisAdet : null,
      satisAdedi: satisAdet,
      sonSatisFiyati:
        sonSatis === null ? null : Number(sonSatis.unitPriceAmount),
      sonSatisTarihi: sonSatis?.sale.soldAt ?? null,
      kdvOrani: kdv.oran ?? VARSAYILAN_KDV_ORANI,
      eldekiAdet: stok._sum.quantityDelta ?? 0,
      eldekiMaliyet,
      ...(() => {
        const secim = denemeMaliyetiSec({
          eldekiAdet: stok._sum.quantityDelta ?? 0,
          eldekiMaliyet,
          sonAlisFiyati:
            girisler.length === 0
              ? null
              : Number(girisler[girisler.length - 1].unitCostAmount),
        });
        return {
          denemeMaliyeti: secim.tutar,
          denemeMaliyetKaynagi: secim.kaynak,
        };
      })(),
      zeminler: await simulasyonZeminleri(varyant.id, an),
    },
  };
}
