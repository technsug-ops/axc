import { ACIK_BILDIRIM_DURUMLARI } from "@/lib/iade/bildirim";
import { suzgecToplami } from "@/lib/liste-toplami";
import { kdvOraniniCoz } from "@/lib/kdv";
import { kalemToplamlari, type ParaToplami } from "@/lib/tutar";
import {
  PAKETLEME_EYLEMLERI,
  hazirlananSiparisler,
} from "@/lib/okuma/paketleme";
import {
  tarifeKapsami,
  type TarifeKapsami,
} from "@/lib/panel/tarife-penceresi";
import { kabulKosulu } from "@/lib/panel/kabul-sayimi";
import { prisma } from "@/lib/prisma";

import type { GorevAnahtari } from "./bugun-ne-yapmaliyim";
import { KARGO_BEKLEYEN } from "@/lib/kargo-bekleyen";

/**
 * ============================================================================
 *  "BUGÜN NE YAPMALIYIM" — SAYILAR
 * ----------------------------------------------------------------------------
 *  Her sayı, tıklanınca açılan SÜZÜLÜ LİSTENİN kaydı ile BİREBİR tutmalı.
 *  Tutmazsa kullanıcı "panel yalan söylüyor" der ve haklı olur — bu yüzden
 *  koşullar buradaki tek yerden geliyor ve `panel:dogrula` her birini
 *  hedef ekranın koşuluyla karşılaştırıyor.
 *
 *  DÖNEM SÜZGECİ UYGULANMAZ. "Kargoya verilmemiş sipariş" dünkü de olsa
 *  bugünün işidir; döneme bağlansaydı dönem daraldığında iş listesi
 *  sessizce kısalırdı.
 * ============================================================================
 */

/**
 * DÖNEM İÇİNDE GİRİLEN ALIM — panelin "Seçili dönem" kartı için.
 *
 * ⚠ NİYE GÖREV KUTUSUNDA DEĞİL: kullanıcı bu sayıyı "günlük bir emek" diye
 * istedi ve önce görev kutusuna kondu. Orada YANLIŞ YERDEYDİ — görev
 * kutuları YAPILMAMIŞ işi sayar, bu ise YAPILMIŞ işin adedi. Kullanıcı
 * kararı 21.08.2026 ile dönem kartına taşındı: orada kardeşleriyle aynı
 * dönemi paylaşıyor ve kıyas rozeti alabiliyor.
 *
 * ── ⛔ ALAN DEĞİŞTİ: `purchasedAt` → `receivedAt` (K112a, 31.08.2026) ─────
 *
 * Eski gerekçe SİLİNMİYOR, çevrildiği için burada duruyor: alan
 * `purchasedAt` seçilmişti çünkü alım listesi de onu süzüyor
 * (`liste-suzgeci.ts` → `alimKosulu`) ve iki ekran ayrışmasın isteniyordu.
 * Gerekçe iyi niyetliydi ama YANLIŞ SORUYU cevaplıyordu: kullanıcının
 * sorduğu şey "bugün ne sipariş ettim" değil, **"bugün depoya ne girdi"**.
 * Sipariş edilen mal daha rafta değildir, satışa da çıkamaz.
 *
 * ⚠ VE İKİ TARİH GERÇEKTEN AYRIŞIYOR — ölçüldü: 1973 alımın **1931'inde**
 * (%97,9) `receivedAt ≠ purchasedAt`, ortanca 3 gün, max 48. Yani sütun
 * neredeyse her kaydı yanlış güne yazıyordu.
 *
 * ⚠ SAYI = LİSTE SÖZLEŞMESİ KORUNUYOR AMA HEDEF DEĞİŞTİ: bu rakama
 * tıklayınca artık `/alimlar` (sipariş tarihli) değil, GÜNÜN GİRİŞLERİ
 * açılıyor — ikisi aynı gövdeden (`panel/kabul-sayimi.ts`) süzülüyor.
 * Eski hedefe bırakılsaydı sayı ile liste sessizce ayrışırdı.
 *
 * ⚠ KURAL TEK GÖVDEDE ve bekçiyle korunuyor: panelde çıplak `purchasedAt`
 * yazmak yasak (kart takvimi beyanlı istisna).
 *
 * ── ⚠ TUTAR KENDİ FORMÜLÜYLE HESAPLANMAZ ─────────────────────────────────
 * Alım listesindeki toplam kutusu `kalemToplamlari` + `suzgecToplami`
 * kullanıyor. Panel ayrı bir formül yazsaydı iki ekran aynı dönem için
 * FARKLI toplam gösterir ve hangisinin doğru olduğu tartışılırdı. Aynı
 * yardımcılar burada da çağrılıyor.
 *
 * ⚠ İPTALLER: adet TÜM kayıtları sayar (listede iptalli satır da görünür),
 * TUTAR ise iptalliyi DIŞARIDA bırakır — iptal edilmiş alım gerçekleşmiş
 * bir alış değildir, matraha yazılamaz. Alım listesi de tam böyle yapıyor;
 * ikisi ayrışmasın diye buraya da aynısı yazıldı.
 */
export async function donemAlimi(pencere: {
  baslangic: Date;
  bitisHaric: Date;
}): Promise<{
  adet: number;
  toplam: ParaToplami[];
  gunluk: { tarih: Date; tutar: number; kdv: number }[];
}> {
  /**
   * ⚠ YARI AÇIK ARALIK — `[baslangic, bitisHaric)`. `lte: sonGun`
   * yazılsaydı son günün 00:00'ından sonrası dışarıda kalırdı; `Pencere`
   * tipi bu tuzağı önlemek için `bitisHaric` taşıyor.
   */
  const alimlar = await prisma.purchase.findMany({
    where: kabulKosulu(pencere),
    select: {
      status: true,
      receivedAt: true,
      items: {
        select: {
          quantity: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          /**
           * ⚠ KDV ORANI ALIMDA SAKLANMIYOR — kategoriden çözülüyor.
           * `PurchaseItem`de oran alanı yok; ürün→kategori zinciri
           * okunuyor ve `kdvOraniniCoz` ile çözülüyor (istisna > kategori
           * > varsayılan %20). Satış tarafındaki `vatRate` bir SNAPSHOT'tır,
           * bu ise BUGÜNKÜ oran — fark ekranda beyan ediliyor.
           */
          variant: {
            select: {
              product: {
                select: {
                  vatRateOverride: true,
                  category: { select: { name: true, vatRate: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const sonuc = suzgecToplami(
    alimlar,
    (a) => kalemToplamlari(a.items),
    (a) => a.status === "CANCELLED",
  );

  /**
   * ⚠ GÜNLÜK DÖKÜM DE DÖNÜYOR — grafik için (21.08.2026).
   * Ayrı bir sorgu yazılmadı: aynı kayıtlar hem toplamı hem seriyi besliyor.
   * İki sorgu olsaydı ikisi farklı süzgeçle ayrışabilirdi.
   *
   * ⚠ İPTALLİ ALIM SERİYE GİRMEZ — toplamda da girmiyor. Grafik ile kutu
   * aynı kümeyi göstermeli, yoksa "grafikte 5 var, kutuda 4" olur.
   */
  return {
    adet: alimlar.length,
    toplam: sonuc.toplam,
    gunluk: alimlar
      .filter((a) => a.status !== "CANCELLED")
      .map((a) => ({
        /**
         * ⚠ `receivedAt` BURADA `null` OLAMAZ — `kabulKosulu` onu zaten
         * elemiştir. Yine de sessizce `purchasedAt`e DÜŞÜLMÜYOR: öyle
         * yapılsaydı grafik yanlış güne nokta koyar ve kimse görmezdi.
         */
        tarih: a.receivedAt!,
        tutar:
          kalemToplamlari(a.items).find((x) => x.paraBirimi === "TRY")?.tutar ??
          0,
        /**
         * ⚠ TUTARLAR KDV DAHİLDİR (bkz. `lib/kar.ts`), o yüzden içindeki
         * vergi ÇIKARILARAK bulunur: kdv = tutar − tutar/(1+oran).
         * Oranla ÇARPMAK yanlış olurdu — %20 için %20 değil %16,67 çıkar.
         */
        kdv: a.items
          .filter((k) => k.unitCostCurrency === "TRY")
          .reduce((t, k) => {
            const satir = Number(k.unitCostAmount.toString()) * k.quantity;
            const oran = kdvOraniniCoz(k.variant.product).oran;
            return t + (satir - satir / (1 + oran / 100));
          }, 0),
      })),
  };
}

/**
 * ============================================================================
 *  PAKETLENEN SİPARİŞ SAYISI — GÜNÜN İLERLEME SAYACI
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026: _"kargoya verilecek 15 · paketlenen 0; bir sipariş
 *  paketlendikten sonra kargoya verilecek 15 · paketlenen 1 — bu sayılar
 *  eşit olana kadar devam. Bu şekilde daha pratik ve kontrollü olur."_
 *
 *  ⚠ AYNI KÜMEDEN SAYILIR — YOKSA HİÇ EŞİTLENMEZLER. Payda "kargoya
 *  verilmemiş sipariş" (`shippedAt: null`); pay da o kümenin İÇİNDEN
 *  sayılıyor. Bütün paketleme izlerini saysaydık, kargoya verilmiş eski
 *  siparişler de paya girer ve sayaç paydayı aşardı — ilerleme çubuğu
 *  %140 gösteren bir şey olurdu.
 *
 *  ⚠ İZ `AuditLog`TA, DURUM SÜTUNU AÇILMADI (K34a kararı). En yeni iz
 *  `PAKETLENDI` ise sipariş hazırlanıyor; `PAKETLEME_GERI_ALINDI` ise değil.
 *  Kural `lib/okuma/paketleme.ts`te ve okuma ekranıyla AYNI gövdeden geçiyor.
 *
 *  ⚠ `in` LİSTESİ BUGÜN KÜÇÜK. Paketleme izi olan sipariş sayısı kadar
 *  büyür; hacim artarsa bu sorgu bir alt sorguya çevrilir. Bugün ~30
 *  paket/gün için gereksiz karmaşıklık olurdu.
 */
export async function hazirlananSiparisKimlikleri(): Promise<string[]> {
  const izler = await prisma.auditLog.findMany({
    where: { action: { in: [...PAKETLEME_EYLEMLERI] }, targetType: "Sale" },
    select: { action: true, createdAt: true, targetId: true },
  });
  return [...hazirlananSiparisler(izler)];
}

export async function paketlenenSiparisSayisi(): Promise<number> {
  const hazirlananlar = await hazirlananSiparisKimlikleri();
  if (hazirlananlar.length === 0) return 0;

  return prisma.sale.count({
    where: { id: { in: hazirlananlar }, ...KARGO_BEKLEYEN, iptalTarihi: null },
  });
}

/**
 * TARİFE PENCERESİ KAPSAMI — TEK TÜRETME NOKTASI (K47).
 *
 * ⚠ AYRI FONKSİYON, ÇÜNKÜ İKİ FARKLI ŞEY LAZIM. Görev kutusunun sayısı
 * yalnız `kapsamsizKanal`; satırın kendisi ayrıca `kalanGun`u yazıyor
 * ("2 gün kaldı"). `gorevSayilariniTopla` sözleşmesi gereği yalnız sayı
 * döndürüyor ve iki çağıranı var (`page.tsx` · `uyari/topla.ts`) — dönüş
 * şeklini değiştirmek ikisini birden kırardı.
 *
 * "En geç bitiş" türetmesi yalnız BURADA yapılıyor; iki yerde yapılsaydı
 * bir gün biri değişir, öteki değişmez ve panel ile uyarı merkezi farklı
 * gün sayardı.
 */
export async function tarifeKapsaminiOlc(): Promise<TarifeKapsami> {
  /**
   * ⚠ SORGU TARİFE TABLOSUNDAN BAŞLIYOR, KANAL TABLOSUNDAN DEĞİL.
   * Kanaldan başlasaydık hiç tarifesi olmayan Hepsiburada da kümeye girer
   * ve uyarı sonsuza kadar kırmızı yanardı — anayasa: "sonsuza kadar yanan
   * uyarı olmaz". HB'nin ilk tarifesi yüklendiği gün kanal kendiliğinden
   * kümeye girer.
   */
  const tarifeler = await prisma.komisyonTarifesi.findMany({
    select: {
      pencereBitis: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  });

  /** Kanal başına EN GEÇ bitiş — kural katmanının beklediği şekil. */
  const enGec = new Map<string, Date>();
  for (const t of tarifeler) {
    const ad = t.channelAccount?.channel.name ?? "(kanalsız)";
    const onceki = enGec.get(ad);
    if (onceki === undefined || t.pencereBitis > onceki) {
      enGec.set(ad, t.pencereBitis);
    }
  }

  return tarifeKapsami(
    [...enGec].map(([kanalAdi, sonBitis]) => ({ kanalAdi, sonBitis })),
    new Date(),
  );
}

export async function gorevSayilariniTopla(): Promise<
  Record<GorevAnahtari, number>
> {
  const [
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
    tarifeKapsam,
  ] = await Promise.all([
    // `/satislar?kargo=bekleyen` ile aynı koşul.
    prisma.sale.count({ where: { ...KARGO_BEKLEYEN, iptalTarihi: null } }),

    /**
     * Açık bildirim = mal yolda ya da karar bekleyen. Kapanmış/iptal olan
     * sayılmaz.
     *
     * ⚠ ÖLÇÜT DEĞİŞTİ 22.08.2026. Bu yorum hep doğruyu yazıyordu ama kod
     * `AYRILMIS_SAYILAN_DURUMLAR` sayıyordu — DEĞİŞİM STOĞU için yazılmış,
     * daha DAR bir liste. `ITIRAZ_RED` (itiraz kaybedildi, iade işlenecek)
     * onun dışında kaldığı için gerçek bekleyen iş panelde HİÇ görünmüyordu.
     * Ölçüt artık durum makinesinden türüyor (`ACIK_BILDIRIM_DURUMLARI`) ve
     * iade ekranındaki rozetle AYNI listeyi kullanıyor.
     */
    prisma.returnNotice.count({
      where: { status: { in: ACIK_BILDIRIM_DURUMLARI } },
    }),

    /**
     * `/alimlar?durum=ORDERED` — kısmi gelenler DE bekliyor sayılır:
     * kalemlerin bir kısmı geldiyse iş bitmemiştir. Şemadaki ad
     * `PARTIALLY_RECEIVED` (sözleşmede "PARTIAL" diye kısaltılmıştı).
     */
    prisma.purchase.count({
      where: { status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } },
    }),

    // `/satislar?kar=eksik` ile aynı koşul: hesaplanmamış ya da eksik.
    prisma.sale.count({
      where: {
        // İptal edilen satışın kârı hesaplanmaz; görev listesine girmemeli.
        iptalTarihi: null,
        OR: [{ profitStatus: null }, { NOT: { profitStatus: "CALCULATED" } }],
      },
    }),

    // `/kanal-sku?eksik=1` — yalnız SATIŞ hesaplarının oranı anlamlı.
    prisma.channelSku.count({
      where: { commissionRate: null, channelAccount: { satisIcin: true } },
    }),

    tarifeKapsaminiOlc(),

  ]);

  return {
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
    tarifePenceresi: tarifeKapsam.kapsamsizKanal,
  };
}
