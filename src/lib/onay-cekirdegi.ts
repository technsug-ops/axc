import { izYaz } from "@/lib/iz";
import { onayaUygunMu } from "@/lib/onay-kuyrugu";
import type { IslemIstemcisi } from "@/lib/prisma";
import { sayimGecersizlestir, sonSayimTarihleri } from "@/lib/sayim-damgasi";
import {
  israrGecerliMi,
  sayimKorumasi,
  type SayimIsrari,
} from "@/lib/sayim-korumasi";
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
  girdi: {
    saleId: string;
    secimler: PartiSecimleri;
    otomatik: boolean;
    /**
     * ⛔ SAYIM KORUMASI ISRARI — VERİLMEZSE KAPI ESKİSİ GİBİ DURDURUR.
     * Otomatik onay bunu ASLA geçirmez: istisna bir İNSAN kararıdır ve her
     * kullanımı `SAYIM_KORUMASI_ISTISNASI` iziyle kayda geçer.
     */
    israr?: SayimIsrari;
  },
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

  /**
   * ════════════════════════════════════════════════════════════════════════
   *  SAYIM KAPISI — ISRAR YOLU AÇILDI (K188-⑤, 08.09.2026)
   * ------------------------------------------------------------------------
   *  ⛔ ESKİ GEREKÇE SİLİNMEDİ, ÇÜRÜDÜ. Burada şu yazılıydı:
   *
   *    _"Onayda ısrar arayüzü YOK: canlı akışta soldAt bugündür ve duraksama
   *     tetiklenmez; tetiklenirse bu bir sinyaldir ve kayıt REDDEDİLİR."_
   *
   *  Öncül ölçümle çürüdü (08.09.2026, satış `4707418677`): geçmiş bir
   *  siparişin API'den GEÇ yazılması gerçek ve tekrarlanan bir akış — soldAt
   *  bugün DEĞİL. Kayıt reddedilince satış onay kuyruğunda **kapatılamaz**
   *  bir madde olarak kaldı (K49: kapatılamayan madde kutunun tamamına olan
   *  güveni eritir ve kullanıcıyı yıkıcı işleme iter).
   *
   *  ⭐ VE ASIL KUSUR SİMETRİSİZLİKTİ: anayasa _"uyarı sorar, kullanıcı ısrar
   *  ederse istisna İZ BIRAKARAK geçer"_ diyor ve mekanizma depoda ZATEN
   *  vardı — `mal-kabul` ve `/stok` düzeltme ekranları kullanıyordu. Aynı
   *  ilkenin üç yerinden ikisinde vardı, onay yolunda yoktu. Kural yazılıydı,
   *  bu yolda **teslim edilemiyordu.**
   *  _(Anayasa: "kural doğru mu değil, kural teslim edilebilir mi".)_
   *
   *  ⛔ KAPI GEVŞEMEDİ, KAPIYA KAPI EKLENDİ: ısrar VERİLMEZSE davranış
   *  BİREBİR eskisi (`SAYIM_DURAKSADI`). Otomatik onay ısrar geçirmez, yani
   *  kuyruk sessizce açılmaz — istisna her zaman bir İNSAN kararıdır.
   * ════════════════════════════════════════════════════════════════════════
   */
  const sonSayimlar = await sonSayimTarihleri(
    tx,
    satis.items.map((k) => k.variantId),
  );
  /** ⚠ KARAR SAKLANIR, YALNIZ KİMLİK DEĞİL: iz "hangi sayım damgası, hangi
   *  hareket tarihi, hangi yön" yazmak zorunda ve bunlar kararın içinde. */
  const duraksayanlar: {
    variantId: string;
    adet: number;
    karar: Extract<ReturnType<typeof sayimKorumasi>, { sonuc: "DURAKSA" }>;
  }[] = [];
  for (const k of satis.items) {
    const karar = sayimKorumasi({
      sonSayimIsTarihi: sonSayimlar.get(k.variantId) ?? null,
      hareketIsTarihi: satis.soldAt,
      adet: -k.quantity,
    });
    if (karar.sonuc === "DURAKSA") {
      duraksayanlar.push({ variantId: k.variantId, adet: -k.quantity, karar });
    }
  }
  if (duraksayanlar.length > 0) {
    /** Israr YOKSA boş sayılır ve kapı eskisi gibi DURDURUR. */
    const israr = israrGecerliMi(
      girdi.israr ?? { onaylandi: false, sebep: null, aciklama: "" },
    );
    if (!israr.gecerli) {
      return { tamam: false, kod: "SAYIM_DURAKSADI" };
    }
    const an = new Date();
    /**
     * İKİ AYRI ŞEY, İKİSİ DE ŞART (emsal: `/stok` düzeltme ekranı):
     *  · `sayimGecersizAt` → "bu varyantın sayımı ARTIK GEÇERLİ DEĞİL"
     *  · `AuditLog`        → "kim, ne zaman, hangi damgayı, niye aştı"
     * Yalnız damga yazılsaydı istisnayı kimin geçtiği kaybolurdu; yalnız iz
     * yazılsaydı geçersizleşen sayım hiçbir ekranda görünmez ve kimse
     * yeniden saymazdı.
     */
    await sayimGecersizlestir(
      tx,
      duraksayanlar.map((d) => d.variantId),
      an,
    );
    /**
     * ⛔ İZ ZORUNLU VE AYNI İŞLEMDE — SESSİZ KAPI AÇMA YASAĞI.
     * Bu satır silinirse bir insan sayım korumasını aşar ve hiçbir yerde
     * yazmaz. Bekçi tam bunu ölçüyor (izsiz geçen ısrar KIRMIZI).
     */
    await izYaz(
      {
        action: "SAYIM_KORUMASI_ISTISNASI",
        targetType: "Sale",
        targetId: satis.id,
        detail: JSON.stringify({
          yol: "onay çekirdeği — sipariş onayı",
          satisKodu: satis.code,
          sebep: girdi.israr?.sebep ?? null,
          aciklama: girdi.israr?.aciklama.trim() || null,
          kalemler: duraksayanlar.map((d) => ({
            variantId: d.variantId,
            adet: d.adet,
            yon: d.karar.yon,
            sayimTarihi: d.karar.sayimTarihi.toISOString(),
            hareketIsTarihi: d.karar.hareketIsTarihi.toISOString(),
          })),
          sonuc: "SAYIM GECERSIZLESTI — bu varyant(lar) yeniden sayilmali.",
        }),
      },
      tx,
    );
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
