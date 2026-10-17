import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * K347 — ALIM KALEMİ KAPSAMI. Proje stoku ayrı bir stok değildir: FIFO girişinin
 * bağlı olduğu alım kalemine proje damgası vurulur, ikinci stok/satış kaydı açılmaz.
 *
 * Firma alanı YOK (kullanıcı kararı 17.10.2026): tek firmalı canlıda firma alanı
 * açılmaz; çok-firma K303 deneme dalında kendi sürümünü taşır (şema notuyla aynı).
 */
export async function kapsamKurallariniOnizle() {
  const kurallar = await prisma.ortaklikKapsamKurali.findMany({ include: { proje: true } });
  return kurallar.map(k => ({ variantId: k.variantId, projeAd: k.proje.ad, baslangic: k.proje.baslangic.toISOString().slice(0, 10), currency: k.proje.currency }));
}

type Istemci = Pick<Prisma.TransactionClient, "ortaklikProjesi" | "ortaklikKapsamKurali" | "purchaseItem">;

/** Varyant kimliği çağırandan gelir; kod → varyant çözümü `kodlaVaryantCoz`un işidir (tek gövde). */
export async function kapsamKuraliEkle(tx: Istemci, projeId: string, variantId: string) {
  const proje = await tx.ortaklikProjesi.findUnique({ where: { id: projeId } });
  if (!proje) throw new Error("KAPSAM_KAYIT_YOK");
  return tx.ortaklikKapsamKurali.create({ data: { projeId, variantId } });
}

export type OtomatikKapsam = {
  /** variantId → projeId: damga vurulacak kalemler. */
  kapsam: Map<string, string>;
  /**
   * Kuralı olduğu hâlde para birimi tutmadığı için proje DIŞI bırakılan kalemler.
   * Alım ENGELLENMEZ (kullanıcı kararı 17.10.2026: asıl iş olan alım girişi yan
   * modül yüzünden kilitlenmez) — ama atlama sessiz de geçmez: ize yazılır.
   */
  atlananlar: { variantId: string; projeId: string; neden: "BIRIM" }[];
};

/** Yalnız yeni kalemlere uygulanır; kurallar geçmiş kalemleri yeniden etiketlemez. */
export async function otomatikKapsamlar(tx: Istemci, tarih: Date, kalemler: { variantId: string; unitCostCurrency: string }[]): Promise<OtomatikKapsam> {
  const kurallar = await tx.ortaklikKapsamKurali.findMany({
    where: { variantId: { in: kalemler.map(k => k.variantId) }, proje: { baslangic: { lte: tarih } } },
    include: { proje: true },
  });
  const sonuc: OtomatikKapsam = { kapsam: new Map(), atlananlar: [] };
  for (const k of kalemler) {
    const kural = kurallar.find(r => r.variantId === k.variantId);
    if (!kural) continue;
    if (kural.proje.currency !== k.unitCostCurrency) {
      sonuc.atlananlar.push({ variantId: k.variantId, projeId: kural.projeId, neden: "BIRIM" });
      continue;
    }
    sonuc.kapsam.set(k.variantId, kural.projeId);
  }
  return sonuc;
}

/** Mal kabulden önce kapsam değişebilir; deftere girmiş partinin geçmişi değişmez. */
export async function alimKapsaminiDegistir(tx: Istemci, kalemId: string, projeId: string | null) {
  const kalem = await tx.purchaseItem.findUnique({ where: { id: kalemId }, include: { purchase: true } });
  if (!kalem || kalem.purchase.status === "CANCELLED") throw new Error("KAPSAM_KAYIT_YOK");
  const proje = projeId ? await tx.ortaklikProjesi.findUnique({ where: { id: projeId } }) : null;
  if (projeId && !proje) throw new Error("KAPSAM_KAYIT_YOK");
  if (proje && kalem.purchase.purchasedAt < proje.baslangic) throw new Error("KAPSAM_ESKI_STOK");
  // Elle seçimde para birimi kapısı DURUR: kullanıcı açıkça bu projeyi seçti,
  // sessizce proje dışı bırakmak seçtiğinin tersini yapmak olurdu.
  if (proje && kalem.unitCostCurrency !== proje.currency) throw new Error("KAPSAM_BIRIM");
  const sonuc = await tx.purchaseItem.updateMany({
    where: { id: kalemId, ortaklikProjesiId: kalem.ortaklikProjesiId, stockMovements: { none: {} }, damagedQuantity: 0 },
    data: { ortaklikProjesiId: projeId },
  });
  if (sonuc.count !== 1) throw new Error("KAPSAM_KILITLI");
  return { alimId: kalem.purchaseId, eskiProjeId: kalem.ortaklikProjesiId, projeId };
}

/** Alım düzenlemesi kapsamın tarihini/para birimini geçersiz kılamaz. */
export async function alimKapsaminiDogrula(tx: Istemci, alimId: string) {
  const kalemler = await tx.purchaseItem.findMany({ where: { purchaseId: alimId, ortaklikProjesiId: { not: null } }, include: { purchase: true, ortaklikProjesi: true } });
  for (const k of kalemler) {
    if (k.purchase.purchasedAt < k.ortaklikProjesi!.baslangic) throw new Error("KAPSAM_ESKI_STOK");
    if (k.unitCostCurrency !== k.ortaklikProjesi!.currency) throw new Error("KAPSAM_BIRIM");
  }
}
