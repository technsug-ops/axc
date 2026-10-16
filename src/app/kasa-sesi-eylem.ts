"use server";

import { kasaImleciKarari } from "@/lib/kasa-imleci";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  YENİ SİPARİŞ SAYACI — KASA SESİNİN VERİSİ (kullanıcı isteği 15.10.2026)
 * ----------------------------------------------------------------------------
 *  Açık her sayfa dakikada bir sorar: «verdiğin imleçten beri kaç yeni sipariş
 *  deftere düştü?». İMLEÇ SUNUCUNUN SAATİDİR — istemci saati yanlış olsa da
 *  sipariş kaçmaz, iki kez de sayılmaz (`createdAt` > imleç ≤ şimdi).
 *  · İlk soru taban kurar (geçmiş için ses ÇALMAZ) — karar saf gövdede (`kasa-imleci.ts`).
 *  · İptal edilmiş satış sayılmaz. Yalnız `satis.gor` izni olana cevap verir
 *    (izinsiz kullanıcıya sipariş akışı sızmaz) — yoksa `null`.
 *  · Hiçbir şey yazmaz. Sayım düşerse imleç İLERLEMEZ (sipariş kaçmasın).
 * ============================================================================
 */
export async function yeniSiparisOzeti(imlecIso: string | null): Promise<{ sayi: number; imlec: string } | null> {
  if (!(await izinVarMi("satis.gor"))) return null;
  const simdi = new Date();
  const karar = kasaImleciKarari(imlecIso, simdi);
  if (karar.tur === "TABAN") return { sayi: 0, imlec: simdi.toISOString() };
  try {
    const sayi = await prisma.sale.count({ where: { createdAt: { gt: karar.imlec, lte: simdi }, iptalTarihi: null } });
    return { sayi, imlec: simdi.toISOString() };
  } catch (hata) {
    console.error("[kasa-sesi] sayım düştü:", hata);
    return { sayi: 0, imlec: karar.imlec.toISOString() };
  }
}
