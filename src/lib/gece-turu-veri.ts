import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  GECE BEKÇİ TURU — OKUMA GÖVDESİ (K290)
 * ----------------------------------------------------------------------------
 *  `scripts/gece-turu.ts` her gece `AuditLog`a `GECE_BEKCI_TURU` yazar. Panel
 *  uyarısı ve `/ayarlar/gece-turu` ekranı BURADAN okur (sayı = liste).
 *
 *  SORUN SAYISI:
 *   · son tur KIRMIZI           → kırmızı denetim sayısı
 *   · son tur koşamadı/okunamadı → 1
 *   · son iz GECİKMİŞSE          → 1 (tur KOŞMADI — kaçan gece görünür olmalı;
 *                                   «var olanı listelemek olmayanı göstermez»)
 *   · hiç iz yok                 → 0 — iz henüz DOĞMADI; ekran bunu yazar
 *                                   («yeni izin doğum tarihi beyan edilir»)
 * ============================================================================
 */

export const GECE_TURU_EYLEMI = "GECE_BEKCI_TURU";
/** Tur her gece koşar; 36 saatten eski son iz = en az bir gece kaçtı. */
export const GECIKME_SAATI = 36;

export type GeceKirmizisi = { ad: string; tur: "BEKCI" | "MUTASYON"; ilkKotu?: { sha: string; tarih: string; mesaj: string } | null };

export type GeceTuruKaydi = {
  zaman: Date;
  durum: "YESIL" | "KIRMIZI" | "HAZIRLIK_DUSTU" | "SONUC_OKUNAMADI" | "HATA" | "BILINMIYOR";
  sha: string | null;
  yesil: number | null;
  toplam: number | null;
  kirmizilar: GeceKirmizisi[];
  sebep: string | null;
  sureSn: number | null;
};

function coz(zaman: Date, detay: string | null): GeceTuruKaydi {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(detay ?? "{}") as Record<string, unknown>;
  } catch {
    /* Çözülemeyen iz «bilinmiyor» — yeşil SAYILMAZ. */
  }
  const durumlar = ["YESIL", "KIRMIZI", "HAZIRLIK_DUSTU", "SONUC_OKUNAMADI", "HATA"] as const;
  const durum = durumlar.find((x) => x === d.durum) ?? "BILINMIYOR";
  return {
    zaman,
    durum,
    sha: typeof d.sha === "string" ? d.sha : null,
    yesil: typeof d.yesil === "number" ? d.yesil : null,
    toplam: typeof d.toplam === "number" ? d.toplam : null,
    kirmizilar: Array.isArray(d.kirmizilar) ? (d.kirmizilar as GeceKirmizisi[]) : [],
    sebep: typeof d.sebep === "string" ? d.sebep : null,
    sureSn: typeof d.sureSn === "number" ? d.sureSn : null,
  };
}

export async function geceTuruKayitlari(adet = 14): Promise<GeceTuruKaydi[]> {
  const izler = await prisma.auditLog.findMany({
    where: { action: GECE_TURU_EYLEMI },
    orderBy: { createdAt: "desc" },
    take: adet,
    select: { createdAt: true, detail: true },
  });
  return izler.map((i) => coz(i.createdAt, i.detail));
}

/** Saf: son kayıt + şimdiki an → sorun sayısı. */
export function geceTuruSorunu(son: GeceTuruKaydi | null, simdi: Date): { sayi: number; gecikti: boolean } {
  if (!son) return { sayi: 0, gecikti: false };
  const gecikti = simdi.getTime() - son.zaman.getTime() > GECIKME_SAATI * 3600_000;
  if (gecikti) return { sayi: 1, gecikti: true };
  if (son.durum === "YESIL") return { sayi: 0, gecikti: false };
  if (son.durum === "KIRMIZI") return { sayi: Math.max(1, son.kirmizilar.length), gecikti: false };
  return { sayi: 1, gecikti: false };
}

export async function geceTuruSorunSayisi(simdi = new Date()): Promise<number> {
  const [son] = await geceTuruKayitlari(1);
  return geceTuruSorunu(son ?? null, simdi).sayi;
}
