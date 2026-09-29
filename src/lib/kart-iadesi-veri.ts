import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { TAZMINAT_TAHSIL_EDILDI_EYLEMI, TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI, tazminatTahsilTarihleri } from "@/lib/tazminat";

import type { KartIadesi } from "./kart-iadesi";

/**
 * KARTA DÖNEN ALIM İADELERİ — VERİ (K305). Alım kalemine bağlı, kartla ödenmiş
 * alımın TAHSİL EDİLMİŞ tazminatları. Tahsil günü iz kaydından, rapor ile AYNI
 * kural (`tazminatTahsilTarihleri` — en yeni iz kazanır; tahsili geri alınan
 * talep düşer). Hiçbir şey YAZMAZ.
 */
export async function kartaDonenAlimIadeleri(): Promise<KartIadesi[]> {
  const talepler = await prisma.compensation.findMany({
    where: { purchaseItem: { purchase: { creditCardId: { not: null } } } },
    select: {
      id: true,
      amount: true,
      currency: true,
      purchaseItem: { select: { purchase: { select: { code: true, creditCardId: true } } } },
    },
  });
  if (talepler.length === 0) return [];
  const izler = await prisma.auditLog.findMany({
    where: {
      targetId: { in: talepler.map((t) => t.id) },
      action: { in: [TAZMINAT_TAHSIL_EDILDI_EYLEMI, TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI] },
    },
    select: { action: true, createdAt: true, targetId: true },
  });
  const tarihler = tazminatTahsilTarihleri(izler);
  const sonuc: KartIadesi[] = [];
  for (const t of talepler) {
    const tarih = tarihler.get(t.id);
    const kartId = t.purchaseItem?.purchase.creditCardId;
    if (!tarih || !kartId) continue;
    sonuc.push({
      id: t.id,
      kartId,
      alimKodu: t.purchaseItem!.purchase.code,
      tutar: Number(t.amount.toString()),
      paraBirimi: t.currency,
      /* Kart borcu İSTANBUL takvim günüyle çalışır (anayasa: iş saat dilimi sabit). */
      tarih: gunDegeri(isTakvimGunu(tarih)),
    });
  }
  return sonuc;
}
