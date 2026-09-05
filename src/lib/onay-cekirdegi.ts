import { izYaz } from "@/lib/iz";
import { onayaUygunMu } from "@/lib/onay-kuyrugu";
import type { IslemIstemcisi } from "@/lib/prisma";
import { sayimGecersizlestir, sonSayimTarihleri } from "@/lib/sayim-damgasi";
import { israrGecerliMi, sayimKorumasi } from "@/lib/sayim-korumasi";
import { donemKapisi } from "@/lib/donem-kapisi";
import {
  acikPartiler,
  fifoDagit,
  gunSonu,
  partileriOncele,
  type FifoPayi,
  type Parti,
} from "@/lib/stok";

/**
 * ============================================================================
 *  ONAY ÇEKİRDEĞİ — ELLE ONAY VE OTOMATİK ONAY TEK GÖVDEDEN (K164 / K168)
 * ----------------------------------------------------------------------------
 *  Halil 05.09.2026: _"tek parti mal varsa onaya gerek olmasın."_ Otomatik
 *  onay ile elle onay AYNI kapılardan geçmeli (uygunluk · sayım · dönem ·
 *  FIFO/seçim · SALE_OUT · onaylandiAt · iz) — yoksa biri ötekinin
 *  görmediğini yazar (İlke #16: iki yerde iki ölçüt olmaz).
 *
 *  Bu gövde İŞLEM İÇİNDE koşar (tx alır); kâr tazeleme burada DEĞİL —
 *  yazılmış SALE_OUT'u okuduğu için commit sonrası, çağıranda yapılır.
 *
 *  ⚠ `otomatik` yalnız İZ DAMGASINI değiştirir — kapıların HİÇBİRİNİ
 *  gevşetmez. Sayım/dönem duraksatırsa otomatik onay da REDDEDİLİR
 *  (kuyrukta kalır, elle onaya düşer); sessiz yazım yok.
 * ============================================================================
 */

export type OnayCekirdekSonucu =
  | { tamam: true; kalem: number; adet: number }
  | {
      tamam: false;
      kod:
        | "BULUNAMADI"
        | "ICE_AKTARMA_DEGIL"
        | "KARGOLANMIS"
        | "IPTALLI"
        | "ZATEN_ONAYLI"
        | "TARIHSEL"
        | "SAYIM_DURAKSADI"
        | "DONEM_KAPALI"
        | "STOK_YETERSIZ"
        | "SECIM_GECERSIZ"
        | "YAZILAMADI";
      ayrinti?: string;
    };

/**
 * Parti seçimi: kalemId → seçilen partinin StockMovement kimliği (K110
 * spesifik belirleme). Boş/eksik = o kalemde FIFO. Otomatik onay boş geçer
 * (tek partili siparişte seçilecek bir şey yok).
 */
export type PartiSecimleri = Record<string, string>;

/**
 * ⚠ DÖNEM KAPISI `DonemKorumasiHatasi` FIRLATIR — bu gövde onu YAKALAMAZ;
 * çağıran (elle onay try/catch, betik try/catch) `DONEM_KAPALI`ya çevirir.
 * Burada yakalamak, iki çağıranın ayrı davranmasını gizlerdi.
 */
export async function onayCekirdegi(
  tx: IslemIstemcisi,
  girdi: { saleId: string; secimler: PartiSecimleri; otomatik: boolean },
): Promise<OnayCekirdekSonucu> {
  const satis = await tx.sale.findUnique({
    where: { id: girdi.saleId },
    select: {
      id: true,
      code: true,
      soldAt: true,
      shippedAt: true,
      iptalTarihi: true,
      importKaynak: true,
      onaylandiAt: true,
      items: {
        select: {
          id: true,
          variantId: true,
          quantity: true,
          variant: { select: { sku: true } },
          stockMovements: {
            where: { type: "SALE_OUT" },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!satis) return { tamam: false, kod: "BULUNAMADI" };

  const uygunluk = onayaUygunMu({
    importKaynak: satis.importKaynak,
    shippedAt: satis.shippedAt,
    iptalTarihi: satis.iptalTarihi,
    soldAt: satis.soldAt,
    onaylandiAt: satis.onaylandiAt,
    saleOutSayisi: satis.items.reduce(
      (toplam, k) => toplam + k.stockMovements.length,
      0,
    ),
  });
  if (!uygunluk.uygun) return { tamam: false, kod: uygunluk.sebep };

  /** Sayım kapısı — satış akışıyla AYNI gövde. Onayda ısrar arayüzü YOK:
   *  canlı akışta soldAt bugündür ve duraksama tetiklenmez; tetiklenirse
   *  bu bir sinyaldir ve kayıt REDDEDİLİR (otomatik onay da). */
  const sonSayimlar = await sonSayimTarihleri(
    tx,
    satis.items.map((k) => k.variantId),
  );
  const duraksayanlar: string[] = [];
  for (const k of satis.items) {
    const karar = sayimKorumasi({
      sonSayimIsTarihi: sonSayimlar.get(k.variantId) ?? null,
      hareketIsTarihi: satis.soldAt,
      adet: -k.quantity,
    });
    if (karar.sonuc === "DURAKSA") duraksayanlar.push(k.variantId);
  }
  if (duraksayanlar.length > 0) {
    /** Boş ısrar geçersizdir (satış akışıyla AYNI gövde) — duraksayan
     *  sipariş elle satış akışının ısrar yoluyla girilir. */
    const israr = israrGecerliMi({ onaylandi: false, sebep: null, aciklama: "" });
    if (!israr.gecerli) {
      return { tamam: false, kod: "SAYIM_DURAKSADI" };
    }
    await sayimGecersizlestir(tx, duraksayanlar, new Date());
  }

  /** Dönem kapısı — kapalıysa DonemKorumasiHatasi fırlatır (çağıran yakalar). */
  await donemKapisi(tx, satis.soldAt, undefined);

  /** FIFO — parti durumu kalemler arasında taşınır (aynı parti iki kez
   *  tüketilmesin); sınır gunSonu(soldAt) (29.08 arızasının dersi).
   *  K110: operatör parti seçtiyse `partileriOncele` onu listenin başına
   *  alır ve AYNI `fifoDagit` çalışır — ikinci dağıtıcı yazılmaz. */
  const partiDurumu = new Map<string, Parti[]>();
  const planlar: {
    kalemId: string;
    variantId: string;
    dagitim: FifoPayi[];
    secimUygulandi: boolean;
  }[] = [];
  for (const k of satis.items) {
    const hamPartiler =
      partiDurumu.get(k.variantId) ??
      (await acikPartiler(tx, k.variantId, gunSonu(satis.soldAt)));
    const secim = girdi.secimler[k.id] ?? null;
    const oncelik = partileriOncele(hamPartiler, secim);
    /** Seçim VARDI ama uygulanamadı (parti tükenmiş/bulunamadı) → sessizce
     *  FIFO'ya düşme; operatör başka partiden düştüğünü sanır (İlke #5). */
    if (secim !== null && secim !== "" && !oncelik.secimUygulandi) {
      return { tamam: false, kod: "SECIM_GECERSIZ", ayrinti: k.variant.sku };
    }
    /** Tek parti gönderimi: seçilen parti siparişin adedini tek başına
     *  karşılamalı — kısmi bölme karmaşası açılmaz. */
    if (
      oncelik.secimUygulandi &&
      oncelik.secilenKalan !== null &&
      oncelik.secilenKalan < k.quantity
    ) {
      return {
        tamam: false,
        kod: "SECIM_GECERSIZ",
        ayrinti: k.variant.sku + ": seçilen partide " + oncelik.secilenKalan + "/" + k.quantity,
      };
    }
    const dagitim = fifoDagit(oncelik.partiler, k.quantity);
    if (!dagitim.yeterliMi) {
      return {
        tamam: false,
        kod: "STOK_YETERSIZ",
        ayrinti: k.variant.sku + ": " + dagitim.mevcut + "/" + k.quantity,
      };
    }
    partiDurumu.set(k.variantId, dagitim.kalanPartiler);
    planlar.push({
      kalemId: k.id,
      variantId: k.variantId,
      dagitim: dagitim.dagitim,
      secimUygulandi: oncelik.secimUygulandi,
    });
  }

  let adetToplam = 0;
  for (const plan of planlar) {
    for (const pay of plan.dagitim) {
      await tx.stockMovement.create({
        data: {
          variantId: plan.variantId,
          type: "SALE_OUT",
          quantityDelta: -pay.adet,
          occurredAt: satis.soldAt,
          saleItemId: plan.kalemId,
          sourceMovementId: pay.parti.hareketId,
          locationId: pay.parti.locationId,
          unitCostAmount: pay.parti.birimMaliyet,
          unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
        },
      });
      adetToplam += pay.adet;
    }
  }

  /** ONAYIN ÖZ İZİ (K164-②): kargo kümesi ve kuyruk BU kolona bakar; tek
   *  yazıcısı bu satır. SALE_OUT'larla AYNI işlemde — yarım onay kalamaz. */
  await tx.sale.update({
    where: { id: satis.id },
    data: { onaylandiAt: new Date() },
  });

  /** İz TEK GÖVDEDEN (`izYaz`) — çıplak `auditLog.create` yasak. Otomatik
   *  onayda userId oturumsuz (null, uydurulmaz); `tetik` alanı elle/oto
   *  ayrımını taşır (üç ay sonra "bunu kim onayladı" sorusunun cevabı). */
  await izYaz(
    {
      action: "SIPARIS_ONAYI",
      targetType: "Sale",
      targetId: satis.id,
      detail: JSON.stringify({
        code: satis.code,
        kalem: planlar.length,
        adet: adetToplam,
        tetik: girdi.otomatik ? "OTOMATIK_TEK_PARTI" : "ELLE",
        /** K110: hangi kalemde parti FIFO'dan mı, operatör seçiminden mi
         *  düştü — "bu neden bu partiden" sorusunun cevabı. */
        secim: planlar.some((p) => p.secimUygulandi) ? "OPERATOR" : "FIFO",
        dagitim: planlar.map((p) => ({
          kalemId: p.kalemId,
          secim: p.secimUygulandi ? "OPERATOR" : "FIFO",
          partiler: p.dagitim.map((d) => ({
            parti: d.parti.hareketId,
            adet: d.adet,
            birimMaliyet: String(d.parti.birimMaliyet),
          })),
        })),
      }),
    },
    tx,
  );

  return { tamam: true, kalem: planlar.length, adet: adetToplam };
}
