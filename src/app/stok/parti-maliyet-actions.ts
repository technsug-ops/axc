"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { yetkiIste } from "@/lib/yetki";
import {
  MALIYET_DUZELTME_EYLEMI,
  maliyetDuzeltmePlani,
  type DuzeltmeRedSebebi,
  type PartiMaliyetDurumu,
} from "@/lib/parti-maliyeti";

/**
 * ============================================================================
 *  PARTİ MALİYETİ DÜZELTME — SUNUCU EYLEMİ (K127, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: kullanıcı bir satış detayında ₺340'lık uydurma bir maliyet
 *  gördü ve düzeltemedi. Üç kapı da kapalıydı (alım düzenleme · veri şüpheli
 *  · stok düzeltme) çünkü partinin arkasında alım kaydı YOK — onarım
 *  betiğinin açtığı bir parti. Kullanıcı: "yanlış verilen verinin kullanıcı
 *  tarafından düzeltilememesi anlamsız."
 *
 *  ── ⛔ DÜZELTME ÇIKIŞLARA DA ULAŞIR — ASIL MESELE BU ─────────────────
 *  19.08.2026 dersi: alım düzenleme ekranı `purchaseItemId` ile bağlı
 *  hareketleri güncelliyordu ama çıkışlar partiye `sourceMovementId` ile
 *  bağlı ve canlıda çıkışların yüzde SIFIRINDA `purchaseItemId` doluydu.
 *  Yani düzeltme çıkışlara HİÇ ulaşmıyor, ekran doğru görünüyor, NET eski
 *  maliyetle kalıyordu. Bu eylem partiyi VE ondan çekilmiş çıkışları
 *  birlikte damgalar, sonra etkilenen satışların kârını tazeler.
 *
 *  ── ⚠ ADEDE DOKUNULMAZ ──────────────────────────────────────────────
 *  Ledger dokunulmazlığı yerinde: miktar değişmiyor, yalnız birim maliyet
 *  damgası düzeliyor. Adet düzeltmesi hâlâ ters işaretli ADJUSTMENT işi.
 * ============================================================================
 */


async function redMetinleri(redler: DuzeltmeRedSebebi[]): Promise<string[]> {
  const t = await getTranslations("PartiMaliyet");
  return redler.map((r) => t(("red" + r) as never));
}

/**
 * ⭐ ÖNİZLEME VE YAZIM AYNI GÖVDEDEN GEÇER. İki ayrı yol olsaydı önizlemenin
 * söylediği ile yazımın yaptığı bir gün ayrışırdı — ve kullanıcı onayı
 * GÖRDÜĞÜ şeye verir, yapılana değil.
 */
async function planiKur(
  hareketId: string,
  yeniMaliyetMetni: string,
  sebep: string,
) {
  const parti = await prisma.stockMovement.findUnique({
    where: { id: hareketId },
    select: {
      id: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
    },
  });
  /** ⛔ ÇIKIŞIN MALİYETİ TEK BAŞINA DÜZELTİLMEZ — o, partinin damgasıdır. */
  if (parti === null || parti.quantityDelta <= 0) return null;

  const cikislar = await prisma.stockMovement.findMany({
    where: { sourceMovementId: hareketId },
    select: {
      id: true,
      quantityDelta: true,
      unitCostAmount: true,
      saleItemId: true,
      saleItem: { select: { saleId: true } },
    },
  });

  const plan = maliyetDuzeltmePlani({
    parti: {
      hareketId: parti.id,
      birimMaliyet: parti.unitCostAmount?.toString() ?? null,
      birimMaliyetParaBirimi: parti.unitCostCurrency,
      girenAdet: parti.quantityDelta,
    },
    yeniMaliyetMetni,
    paraBirimi: parti.unitCostCurrency,
    sebep,
    cikislar: cikislar.map((c) => ({
      hareketId: c.id,
      adet: Math.abs(c.quantityDelta),
      birimMaliyet: c.unitCostAmount?.toString() ?? null,
      saleItemId: c.saleItemId,
      saleId: c.saleItem?.saleId ?? null,
    })),
  });
  return { parti, plan };
}

/** ÖNİZLEME — hiçbir şey yazmaz, ne olacağını söyler. */
export async function partiMaliyetiOnizle(
  _onceki: PartiMaliyetDurumu,
  formData: FormData,
): Promise<PartiMaliyetDurumu> {
  await yetkiIste("stok.duzelt");
  const t = await getTranslations("PartiMaliyet");

  const kurulum = await planiKur(
    String(formData.get("hareketId") ?? ""),
    String(formData.get("yeniMaliyet") ?? ""),
    String(formData.get("sebep") ?? ""),
  );
  if (kurulum === null) return { hatalar: [t("partiBulunamadi")] };
  if (!kurulum.plan.yazilabilir) {
    return { hatalar: await redMetinleri(kurulum.plan.redler) };
  }
  return {
    onizleme: {
      eski: kurulum.plan.eskiMaliyet,
      yeni: kurulum.plan.yeniMaliyet,
      cikis: kurulum.plan.damgalanacakCikislar.length,
      satis: kurulum.plan.tazelenecekSatislar.length,
      adet: kurulum.plan.etkilenenAdet,
      fark: kurulum.plan.maliyetFarkiToplam,
    },
  };
}

/** YAZIM — önizlemeyi ONAYLAYAN çağrı. */
export async function partiMaliyetiniDuzelt(
  _onceki: PartiMaliyetDurumu,
  formData: FormData,
): Promise<PartiMaliyetDurumu> {
  await yetkiIste("stok.duzelt");
  const t = await getTranslations("PartiMaliyet");

  /**
   * ⛔ ONAY KUTUSU AÇIK OLMADAN YAZILMAZ — "sorulsun" demek cevabı BEKLEMEK
   * demektir. Geçmiş satışların NET'i değişecek; bu sürpriz olmamalı.
   * _(Anayasa: uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir.)_
   */
  if (String(formData.get("onay") ?? "") !== "evet") {
    return { hatalar: [t("onayGerekli")] };
  }

  const sebep = String(formData.get("sebep") ?? "").trim();
  const kurulum = await planiKur(
    String(formData.get("hareketId") ?? ""),
    String(formData.get("yeniMaliyet") ?? ""),
    sebep,
  );
  if (kurulum === null) return { hatalar: [t("partiBulunamadi")] };
  const { parti, plan } = kurulum;
  if (!plan.yazilabilir) return { hatalar: await redMetinleri(plan.redler) };

  const para = parti.unitCostCurrency;

  try {
    /**
     * ⛔ TAMAMI-YA-HİÇBİRİ, VE ZAMAN AŞIMI AÇIKÇA AYARLI. Varsayılan 5000 ms
     * 01.09'da bir yazımı yarıda kesmişti; küme küçük olsa da tavan ölçülebilir
     * bir yerde duruyor. _(Anayasa: toplu yazım üç şartla koşar.)_
     */
    await prisma.$transaction(
      async (tx) => {
        await tx.stockMovement.update({
          where: { id: parti.id },
          data: { unitCostAmount: plan.yeniMaliyet, unitCostCurrency: para },
        });
        for (const cikisId of plan.damgalanacakCikislar) {
          await tx.stockMovement.update({
            where: { id: cikisId },
            data: { unitCostAmount: plan.yeniMaliyet, unitCostCurrency: para },
          });
        }
        /**
         * ⛔ İZ: ESKİ VE YENİ DEĞER BİRLİKTE, SEBEBİYLE. Üç ay sonra "bu
         * maliyet niye değişmiş" sorusunun cevabı burada.
         *
         * ⚠ VE GERİ ALMA BU İZE BAĞLI DEĞİL: ölçüt "sourceMovementId = parti"
         * ve yeniden hesaplanabilir. İz TEŞHİS içindir.
         * _(Anayasa: geri alma yolu saklanan listeye dayanmaz.)_
         */
        await tx.auditLog.create({
          data: {
            action: MALIYET_DUZELTME_EYLEMI,
            targetType: "StockMovement",
            targetId: parti.id,
            detail: JSON.stringify({
              sebep,
              eskiMaliyet: plan.eskiMaliyet,
              yeniMaliyet: plan.yeniMaliyet,
              paraBirimi: para,
              etkilenenAdet: plan.etkilenenAdet,
              cikisSayisi: plan.damgalanacakCikislar.length,
              satisSayisi: plan.tazelenecekSatislar.length,
              maliyetFarkiToplam: plan.maliyetFarkiToplam,
            }),
          },
        });
      },
      { timeout: 120_000 },
    );
  } catch (e) {
    /**
     * ⛔ HATA TAM LOGLANIR, KULLANICIYA KOD DÖNER. Ham mesajı ekrana basmak
     * hem bir şey anlatmaz hem iç ayrıntı sızdırır.
     * _(Anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir.)_
     */
    console.error(
      "[parti-maliyeti] yazim dustu:",
      e instanceof Error ? (e.stack ?? e.message) : String(e),
    );
    return { hatalar: [t("yazimDustu")] };
  }

  /**
   * ⚠ KÂR TAZELEME İŞLEMİN DIŞINDA — kendi işlemleri var. Yarım kalırsa
   * zararsız: `satisKarTazele` tekrar koşulabilir ve aynı sonucu verir.
   * Tazelenemeyen satış sayısı SÖYLENİR, sessizce yutulmaz.
   */
  let dusen = 0;
  for (const saleId of plan.tazelenecekSatislar) {
    const oldu = await satisKarTazele(saleId);
    if (!oldu) dusen += 1;
    revalidatePath("/satislar/" + saleId);
  }

  revalidatePath("/satislar");
  revalidatePath("/stok");
  revalidatePath("/");

  return {
    basari:
      t("duzeltildi", {
        eski: plan.eskiMaliyet ?? "—",
        yeni: plan.yeniMaliyet,
        satis: plan.tazelenecekSatislar.length,
      }) + (dusen > 0 ? " · " + t("tazelenemeyen", { sayi: dusen }) : ""),
  };
}
