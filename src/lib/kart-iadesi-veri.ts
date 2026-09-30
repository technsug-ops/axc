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
/**
 * TAHSİL GÜNÜ OLMAYAN KAPANMIŞ İADE (30.09.2026).
 * ⛔ ESKİDEN SESSİZCE DÜŞÜYORDU: günü yoksa `continue` — kart borcundan hiç
 * düşmüyor ve hiçbir yerde görünmüyordu (ölçüldü: 5 iadenin 4'ü, ₺12.201,70;
 * tahsilat izi K209'dan önce kapatılmışlardı). Artık ayrı döner ve kart borcu
 * ekranı bunları «tahsil günü girilmedi» diye listeler.
 * ⚠ YALNIZ KAPANMIŞ (SETTLED) talep: açık talebin günü olmaması doğrudur.
 */
export type TarihsizKartIadesi = { id: string; kartId: string; alimKodu: string; tutar: number; paraBirimi: string };

export async function kartaDonenAlimIadeleri(): Promise<KartIadesi[]> {
  return (await kartIadesiDurumu()).iadeler;
}

export async function kartIadesiDurumu(): Promise<{ iadeler: KartIadesi[]; tarihsiz: TarihsizKartIadesi[] }> {
  const talepler = await prisma.compensation.findMany({
    where: { purchaseItem: { purchase: { creditCardId: { not: null } } } },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      purchaseItem: { select: { purchase: { select: { code: true, creditCardId: true, installmentCount: true } } } },
    },
  });
  if (talepler.length === 0) return { iadeler: [], tarihsiz: [] };
  const izler = await prisma.auditLog.findMany({
    where: {
      targetId: { in: talepler.map((t) => t.id) },
      action: { in: [TAZMINAT_TAHSIL_EDILDI_EYLEMI, TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI] },
    },
    /* `detail` ŞART: tahsil günü (pazaryeri bildirimi) izin içinde durur. */
    select: { action: true, createdAt: true, targetId: true, detail: true },
  });
  const tarihler = tazminatTahsilTarihleri(izler);
  const sonuc: KartIadesi[] = [];
  const tarihsiz: TarihsizKartIadesi[] = [];
  for (const t of talepler) {
    const tarih = tarihler.get(t.id);
    const kartId = t.purchaseItem?.purchase.creditCardId;
    if (!kartId) continue;
    if (!tarih) {
      if (t.status === "SETTLED") {
        tarihsiz.push({ id: t.id, kartId, alimKodu: t.purchaseItem!.purchase.code, tutar: Number(t.amount.toString()), paraBirimi: t.currency });
      }
      continue;
    }
    sonuc.push({
      id: t.id,
      kartId,
      alimKodu: t.purchaseItem!.purchase.code,
      /* Banka iadeyi alımın taksitlerine böler (kullanıcı ekstresi 30.09: ₺799,91 → 3 taksit). */
      taksitSayisi: t.purchaseItem!.purchase.installmentCount,
      tutar: Number(t.amount.toString()),
      paraBirimi: t.currency,
      /* Kart borcu İSTANBUL takvim günüyle çalışır (anayasa: iş saat dilimi sabit). */
      tarih: gunDegeri(isTakvimGunu(tarih)),
    });
  }
  return { iadeler: sonuc, tarihsiz };
}
