/**
 * ============================================================================
 *  HB GERÇEK KESİNTİ — TAZELEME KÜMESİ (K325-⑦)
 * ----------------------------------------------------------------------------
 *  Kâr hesabı gerçek kesintiyi her seferinde hakediş satırlarından TÜRETİR
 *  (`karOnizle` → `hakedisGercekKesintileri`). Kayıtlı NET ise bir fotoğraftır:
 *  yeni hakediş satırı geldiğinde ya da 31 gün eşiği geçildiğinde bayatlar.
 *
 *  Küme HÂLDEN kurulur (anayasa: «ölçüt olaya değil hâle bağlanır»): kayıtlı
 *  kesinti dökümü gerçekle kuruşuna uyuşmayan satış adaydır. Tazelenince susar;
 *  cron bir gün kaçırsa ertesi gün yine bulur.
 *
 *  ⚠ PENCERE: `sonGun` verilirse yalnız sipariş satırı son N günde gelen satışlar
 *  taranır. Cron 40 günle koşar (31 gün eşiği + kaçırma payı) — eski geçmiş
 *  kullanıcı onayıyla ayrı betikle yazılır (`canli-hb-gercek-kesinti-kosum.ts`).
 * ============================================================================
 */

import type { PrismaClient } from "@/generated/prisma/client";
import { hakedisGercekKesintileri, kesintiFarki, type GercekKesintiler } from "@/lib/hakedis/gercek-kesinti";

export type GercekKesintiAdayi = {
  saleId: string;
  code: string | null;
  farkliKodlar: (keyof GercekKesintiler)[];
};

const GUN_MS = 24 * 60 * 60 * 1000;

export async function hbGercekKesintiAdaylari(
  db: PrismaClient,
  ayar: { simdi: Date; sonGun: number | null },
): Promise<GercekKesintiAdayi[]> {
  const satislar = await db.sale.findMany({
    where: {
      iptalTarihi: null,
      channelAccount: { channel: { code: "HEPSIBURADA" } },
      settlementItems: {
        some: {
          code: "SIPARIS_TUTARI",
          ...(ayar.sonGun === null ? {} : { createdAt: { gte: new Date(ayar.simdi.getTime() - ayar.sonGun * GUN_MS) } }),
        },
      },
    },
    select: {
      id: true,
      code: true,
      settlementItems: { select: { code: true, amount: true, externalId: true, createdAt: true } },
      fees: { select: { code: true, amount: true } },
    },
  });

  const adaylar: GercekKesintiAdayi[] = [];
  for (const s of satislar) {
    const gercek = hakedisGercekKesintileri(
      s.settlementItems.map((x) => ({ code: x.code, amount: Number(x.amount.toString()), externalId: x.externalId, createdAt: x.createdAt })),
      ayar.simdi,
    );
    const farkliKodlar = kesintiFarki(
      s.fees.map((f) => ({ code: f.code, amount: Number(f.amount.toString()) })),
      gercek,
    );
    if (farkliKodlar.length > 0) adaylar.push({ saleId: s.id, code: s.code, farkliKodlar });
  }
  return adaylar;
}
