import type { PrismaClient } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  TY ÇEKİM YAŞI — "SON ÇEKİM NE ZAMANDI" ROZETİ
 * ----------------------------------------------------------------------------
 *  Halil kararı 04.09.2026 ("TY'de devam edelim"): TY sipariş çekimi
 *  Windows Görev Zamanlayıcı ile GÜNLÜK koşuyor (scripts/ty-gunluk-cekim.cmd).
 *
 *  ⛔ ZAMANLAYICI DA KAÇIRABİLİR — Vercel Cron 18-19.08'de iki gün üst üste
 *  hiç tetiklenmedi ve Hobby planında logu olmadığı için sebebi
 *  ÖĞRENİLEMEDİ. Anayasa dersi: _"kaçışın kendisi görünür kılınır —
 *  eksik günler ekranda kırmızı yazmalı ki üçüncü kaçış birinin fark
 *  etmesine kalmasın."_ Bu rozet o dersin TY tarafı.
 *
 *  EŞİK — 26 SAAT, GEREKÇESİ: rutin GÜNLÜKTÜR (24 saat) + 2 saat koşum/
 *  saat payı. 26'yı aşan yaş "bir koşum kaçtı" demektir; bu, uydurulmuş
 *  bir sınır değil rutinin kendi periyodundan türetilmiş sınırdır
 *  _(anayasa: "eşik fiziksel eylemin kendisine konur")_.
 * ============================================================================
 */

export const TY_CEKIM_ESIK_SAAT = 26;

export type TyCekimDurumu =
  | { durum: "YOK"; saat: null }
  | { durum: "TAZE"; saat: number }
  | { durum: "ESKI"; saat: number };

/**
 * SAF: son çekim anından rozet durumuna. Saatini kendisi okumaz.
 * `null` = hiç çekim izi yok — bu da AYRI söylenir; "0 saat önce" diye
 * gösterilseydi yokluk tazelik sanılırdı (boş ≠ temiz).
 */
export function tyCekimDurumu(sonCekim: Date | null, an: Date): TyCekimDurumu {
  if (sonCekim === null) return { durum: "YOK", saat: null };
  const saat = (an.getTime() - sonCekim.getTime()) / 3_600_000;
  return saat > TY_CEKIM_ESIK_SAAT
    ? { durum: "ESKI", saat }
    : { durum: "TAZE", saat };
}

/** Son TY çekiminin anı — iz `AuditLog`daki koşum kaydı. */
export async function sonTyCekimi(
  db: Pick<PrismaClient, "auditLog">,
): Promise<Date | null> {
  const iz = await db.auditLog.findFirst({
    where: { action: "TY_SIPARIS_ICE_AKTARMA" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return iz?.createdAt ?? null;
}
