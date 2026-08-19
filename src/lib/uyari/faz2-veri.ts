import { kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { prisma } from "@/lib/prisma";

import {
  DOGRULAMA_EYLEMI,
  damgaKur,
  kaydiCoz,
  susturmaGecerliMi,
  type Damga,
} from "./veri-dogrulama";
import { supheliMi, SUPHE_PENCERESI_GUN } from "./veri-supheli";

/**
 * ============================================================================
 *  FAZ 2 UYARILARININ VERİSİ — SAYI VE LİSTE TEK GÖVDEDEN
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AYRI DOSYA: bu fonksiyonları İKİ taraf çağırıyor — çanı besleyen
 *  `topla.ts` ve uyarının götürdüğü EKRAN. İkisi kendi sorgusunu yazsaydı
 *  bir gün ayrışır, çan "1" derken liste 40 satır gösterirdi.
 *
 *  Görev kutusunda tam bu yaşandı (15.08.2026): panel 5 diyor, açılan liste
 *  4 gösteriyordu. Sayı ile listenin ayrışması, panele olan güveni TEK
 *  SEFERDE bitirir.
 * ============================================================================
 */

/**
 * Şüpheli veri taşıyan satışların kimlikleri.
 *
 * ⚠ SATIŞ KİMLİĞİ DÖNER, KALEM DEĞİL — liste ekranı satış listeliyor.
 * Ama SAYIM KALEM ÜZERİNDEN yapılır: bir satışta iki bozuk kalem varsa
 * iki sorun vardır. İkisi ayrı ayrı döndürülüyor ki ekran "3 kalem,
 * 2 satış" diyebilsin; tek sayıya indirmek bilgiyi kaybettirirdi.
 *
 * ⚠ PENCEREYLE SINIRLI (`SUPHE_PENCERESI_GUN`). Maliyet sütun olarak
 * saklanmıyor, ledger'dan çözülüyor; sınırsız tarama çanı her sayfada
 * on binlerce satır okuturdu. Bedeli açık: bundan eskisi görünmez.
 */
export type SupheliKalem = {
  saleItemId: string;
  saleId: string;
  damga: Damga;
};

export async function supheliVeriBulgusu(bugun: Date): Promise<{
  saleIdleri: string[];
  kalemSayisi: number;
  /** Ekranın "Doğrula" düğmesini çizebilmesi için kalem kimlikleri. */
  kalemler: SupheliKalem[];
}> {
  /**
   * ⚠ DOĞRULANMIŞ KAYITLAR — susturma KAYDIN HÂLİNE bağlı.
   * Damga bugünkü değerlerle tutmuyorsa susturma DÜŞER ve kalem yeniden
   * sayılır. Kalıcı muafiyet, sonradan gerçekten bozulan bir kaydı
   * sonsuza kadar sessizleştirirdi.
   */
  const izler = await prisma.auditLog.findMany({
    where: { action: DOGRULAMA_EYLEMI, targetType: "SaleItem" },
    select: { targetId: true, detail: true },
    orderBy: { createdAt: "desc" },
  });
  const dogrulanmis = new Map<string, Damga>();
  for (const iz of izler) {
    if (!iz.targetId || dogrulanmis.has(iz.targetId)) continue;
    const kayit = kaydiCoz(iz.detail);
    if (kayit) dogrulanmis.set(iz.targetId, kayit.damga);
  }

  const adaylar = await prisma.saleItem.findMany({
    where: {
      sale: {
        iptalTarihi: null,
        soldAt: {
          gte: new Date(
            bugun.getTime() - SUPHE_PENCERESI_GUN * 24 * 60 * 60 * 1000,
          ),
        },
      },
    },
    select: {
      id: true,
      saleId: true,
      quantity: true,
      unitPriceAmount: true,
      net2Amount: true,
      stockMovements: {
        select: {
          quantityDelta: true,
          unitCostAmount: true,
          unitCostCurrency: true,
        },
      },
    },
  });

  const saleIdleri = new Set<string>();
  const kalemler: SupheliKalem[] = [];
  let kalemSayisi = 0;

  for (const k of adaylar) {
    /**
     * ⚠ MALİYET `kalemMaliyeti` İLE — kaleme BAĞLI her hareket işaretiyle
     * girer (17.08.2026 dersi). Tip listesiyle süzmek adet düzeltmesinin
     * ayna girişini kaçırır ve maliyeti ŞİŞİRİR; şişmiş maliyet burada
     * "verim düşük" görünür ve gerçek şüpheli kayıt gizlenirdi.
     */
    const maliyet = kalemMaliyeti(
      k.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        birimMaliyet:
          h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
        birimMaliyetParaBirimi: h.unitCostCurrency,
      })),
    ).maliyet;

    const net2 = k.net2Amount === null ? null : Number(k.net2Amount.toString());
    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;
    if (!supheliMi({ net2, maliyet, ciro })) continue;

    /**
     * ⚠ SUSTURMA BURADA DÜŞÜYOR. Kalem şüpheli ama doğrulanmışsa ve
     * damga BUGÜNKÜ değerlerle kuruşuna tutuyorsa sayılmaz. Tutmuyorsa
     * doğrulama geçersizdir ve kalem yeniden konuşur.
     */
    const bugunku = damgaKur({ net2: net2!, maliyet: maliyet!, ciro });
    const damga = dogrulanmis.get(k.id);
    if (damga && susturmaGecerliMi(damga, bugunku)) continue;

    kalemSayisi++;
    saleIdleri.add(k.saleId);
    kalemler.push({ saleItemId: k.id, saleId: k.saleId, damga: bugunku });
  }

  return { saleIdleri: [...saleIdleri], kalemSayisi, kalemler };
}

/**
 * Stoğu olan ama HİÇBİR kanalda kodu olmayan varyantlar.
 *
 * ⚠ VARYANT SEVİYESİNDE, HESAP SEVİYESİNDE DEĞİL. Ölçüldü 19.08.2026:
 * 46 stoklu varyant × 13 aktif hesap = **499 kodsuz çift**, ve 13 hesabın
 * 10'unda 46/46 boş — çünkü o hesaplar hiç kullanılmıyor. Çana konsaydı
 * her gün ~500 satır gösterir ve hiçbir bilgi taşımazdı ("her zaman çıkan
 * uyarı bilgi taşımaz").
 *
 * Hesap bazlı boşluk kanal SKU ekranında sütun olarak yaşar; burası
 * yalnız "mal rafta ama hiçbir yerde satışa açık değil" halini sayar.
 */
export async function kanalKodsuzStokluVaryantlar(): Promise<string[]> {
  const [stoklu, kodlu] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["variantId"],
      _sum: { quantityDelta: true },
    }),
    prisma.channelSku.findMany({
      where: { isActive: true },
      select: { variantId: true },
      distinct: ["variantId"],
    }),
  ]);

  const kodluIdler = new Set(kodlu.map((k) => k.variantId));
  return stoklu
    .filter((g) => (g._sum.quantityDelta ?? 0) > 0 && !kodluIdler.has(g.variantId))
    .map((g) => g.variantId);
}
