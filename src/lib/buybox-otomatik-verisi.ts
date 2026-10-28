import { prisma } from "@/lib/prisma";

import type { BuyboxKanali } from "./buybox";
import type { KuralModu } from "./buybox-kural";

/**
 * ============================================================================
 *  BUYBOX OTOMATİK FİYAT — EKRAN OKUMASI (K366 adım 3). HİÇBİR ŞEY YAZMAZ.
 * ----------------------------------------------------------------------------
 *  ① Satırların geçerli modu (rozet: «Otomatik»).
 *  ② «Son otomatik değişiklikler»: zamanlanmış işin `BUYBOX_OTOMATIK_FIYAT`
 *    izleri (en yeni 20, bu kanal) — sayı sabit, liste veriyle büyümez.
 *  ③ «Son kontrol»: `BUYBOX_OTOMATIK_KOSUM` izi. Otomatik ürün varken iş
 *    KONTROL_ARALIGI'nın üç katı boyunca koşmadıysa ekran kırmızı yazar —
 *    kaçan zamanlayıcı birinin fark etmesine kalmasın (anayasa: «kaçışın
 *    kendisi görünür kılınır»). Üç tur: tek kaçış GitHub yedeğinin bilinen
 *    gecikmesiyle olağan; üst üste üçü değil. (Seçim — ölçülmüş bir eşik değil;
 *    gerçek kaçış görülünce ölçümle değiştirilir.)
 *  ⚠ İz adları burada SABİT dize: `buybox-otomatik.ts` gönderim gövdesini içe
 *  alıyor, ekran o dosyayı içe almasın diye (bekçi iki adın aynı olduğunu sınar).
 * ============================================================================
 */

/** Zamanlayıcı aralığı — cron-job.org 2 dakikada bir (kullanıcı kararı 28.10.2026;
 *  önce 15 dakikaydı). Aralık değişirse bu sabit AYNI teslimde değişir: ekrandaki
 *  «N dakikada bir» ve kaçırma eşiği buradan okunur. */
export const KONTROL_ARALIGI_DK = 2;
export const KACIRMA_ESIGI_DK = 3 * KONTROL_ARALIGI_DK;
const FIYAT_IZI = "BUYBOX_OTOMATIK_FIYAT";
const KOSUM_IZI = "BUYBOX_OTOMATIK_KOSUM";
const LISTE_ADEDI = 20;

/** Verilen ürünlerin geçerli modu (ayrı mod, yoksa genel). */
export async function satirModlari(variantIds: readonly string[], genelMod: KuralModu): Promise<Map<string, KuralModu>> {
  const ayrilar = variantIds.length === 0 ? [] : await prisma.buyboxKurali.findMany({ where: { variantId: { in: [...variantIds] }, mod: { not: null } }, select: { variantId: true, mod: true } });
  const ayri = new Map(ayrilar.map((a) => [a.variantId, a.mod]));
  return new Map(variantIds.map((id) => [id, ayri.get(id) ?? genelMod]));
}

export type OtomatikKayit = {
  id: string;
  an: Date;
  variantId: string;
  urunAdi: string;
  urunId: string | null;
  sku: string;
  gonderildi: boolean;
  kanalSonucu: string;
  neden: string;
  eski: number | null;
  yeni: number;
  musteri: number | null;
  rakipFiyati: number | null;
  net2: number | null;
  marj: number | null;
};

export type OtomatikGecmis = {
  /** Genel ya da en az bir ürünün modu otomatik. */
  otomatikVar: boolean;
  sonKontrol: Date | null;
  kacti: boolean;
  kayitlar: OtomatikKayit[];
};

const sayi = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

export async function otomatikGecmisi(kanal: BuyboxKanali, genelMod: KuralModu, simdi: Date): Promise<OtomatikGecmis> {
  const [ayriOtomatik, kosum, izler] = await Promise.all([
    prisma.buyboxKurali.count({ where: { mod: "OTOMATIK" } }),
    prisma.auditLog.findFirst({ where: { action: KOSUM_IZI }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.auditLog.findMany({
      where: { action: FIYAT_IZI, targetType: "ProductVariant", detail: { contains: `"kanal":"${kanal}"` } },
      orderBy: { createdAt: "desc" },
      take: LISTE_ADEDI,
      select: { id: true, targetId: true, detail: true, createdAt: true },
    }),
  ]);
  const otomatikVar = genelMod === "OTOMATIK" || ayriOtomatik > 0;
  const sonKontrol = kosum?.createdAt ?? null;
  const kacti = otomatikVar && (sonKontrol === null || simdi.getTime() - sonKontrol.getTime() > KACIRMA_ESIGI_DK * 60_000);

  const ids = [...new Set(izler.flatMap((i) => (i.targetId ? [i.targetId] : [])))];
  const varyantlar = ids.length === 0 ? [] : await prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true, sku: true, product: { select: { id: true, name: true } } } });
  const vHarita = new Map(varyantlar.map((v) => [v.id, v]));
  const kayitlar: OtomatikKayit[] = [];
  for (const iz of izler) {
    let d: Record<string, unknown>;
    try {
      d = JSON.parse(iz.detail ?? "{}") as Record<string, unknown>;
    } catch {
      /* Çözülemeyen iz SATIR OLARAK kalır — yokmuş gibi atlanmaz. */
      d = {};
    }
    const v = iz.targetId ? vHarita.get(iz.targetId) : undefined;
    kayitlar.push({
      id: iz.id,
      an: iz.createdAt,
      variantId: iz.targetId ?? "",
      urunAdi: v?.product?.name ?? v?.sku ?? "—",
      urunId: v?.product?.id ?? null,
      sku: v?.sku ?? "",
      gonderildi: d.sonuc === "GONDERILDI",
      kanalSonucu: typeof d.kanalSonucu === "string" ? d.kanalSonucu : "?",
      neden: typeof d.neden === "string" ? d.neden : "?",
      eski: sayi(d.eski),
      yeni: sayi(d.yeni) ?? Number.NaN,
      musteri: sayi(d.musteri),
      rakipFiyati: d.neden === "BUYBOX_AL" ? sayi(d.buyboxFiyati) : sayi(d.ikinciFiyat),
      net2: sayi(d.net2),
      marj: sayi(d.marj),
    });
  }
  return { otomatikVar, sonKontrol, kacti, kayitlar };
}
