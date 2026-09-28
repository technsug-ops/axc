import { prisma } from "@/lib/prisma";

import {
  FINANSMAN_TURLERI,
  kaynakOzeti,
  type FinansmanTuru,
  type KaynakOzeti,
  type OzetHareketi,
} from "./kural";

/**
 * FİNANSMAN — VERİ (K304). Ekran, detay ve nakit takvimi BURADAN okur;
 * hesap `kural.ts`te. Hiçbir şey YAZMAZ.
 */

const sayi = (d: { toString(): string }) => Number(d.toString());

type HamHareket = {
  tur: "GIRIS" | "GERI_ODEME" | "SERMAYEYE_MAHSUP";
  anapara: { toString(): string };
  faiz: { toString(): string };
  vergi: { toString(): string };
  gerceklestiAt: Date | null;
};

export function ozetHareketi(h: HamHareket): OzetHareketi {
  return {
    tur: h.tur,
    anapara: sayi(h.anapara),
    faiz: sayi(h.faiz),
    vergi: sayi(h.vergi),
    gerceklesti: h.gerceklestiAt !== null,
  };
}

export function turCoz(ham: string | undefined): FinansmanTuru | null {
  return FINANSMAN_TURLERI.find((t) => t === ham) ?? null;
}

export type FinansmanSatiri = {
  id: string;
  tur: FinansmanTuru;
  kaynakAdi: string;
  currency: "TRY" | "EUR";
  note: string | null;
  hareketSayisi: number;
  ozet: KaynakOzeti;
};

export type ParaToplami = {
  sermaye: number;
  kalanBorc: Record<Exclude<FinansmanTuru, "SERMAYE">, number>;
  odenenFaizVergi: number;
  planliGiris: number;
  planliCikis: number;
};

const bosToplam = (): ParaToplami => ({
  sermaye: 0,
  kalanBorc: { ORTAK_BORCU: 0, UCUNCU_KISI_BORCU: 0, BANKA_KREDISI: 0 },
  odenenFaizVergi: 0,
  planliGiris: 0,
  planliCikis: 0,
});

/**
 * Liste + TOPLAMLAR. Toplam SÜZGEÇLE BİRLİKTE değişir (İlke #15): ekranda ne
 * varsa onun toplamı. Para birimleri AYRI toplanır; kur çevrilmez.
 */
export async function finansmanListesi(g: { arama: string; tur: FinansmanTuru | null }) {
  const kaynaklar = await prisma.finansman.findMany({
    where: {
      ...(g.tur ? { tur: g.tur } : {}),
      ...(g.arama
        ? { OR: [{ kaynakAdi: { contains: g.arama } }, { note: { contains: g.arama } }] }
        : {}),
    },
    include: {
      hareketler: { select: { tur: true, anapara: true, faiz: true, vergi: true, gerceklestiAt: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const satirlar: FinansmanSatiri[] = kaynaklar.map((k) => ({
    id: k.id,
    tur: k.tur,
    kaynakAdi: k.kaynakAdi,
    currency: k.currency,
    note: k.note,
    hareketSayisi: k.hareketler.length,
    ozet: kaynakOzeti(k.tur, k.hareketler.map(ozetHareketi)),
  }));

  const toplamlar = new Map<"TRY" | "EUR", ParaToplami>();
  for (const s of satirlar) {
    const t = toplamlar.get(s.currency) ?? bosToplam();
    t.sermaye += s.ozet.sermayeKatkisi;
    if (s.tur !== "SERMAYE") t.kalanBorc[s.tur] += s.ozet.kalanBorc ?? 0;
    t.odenenFaizVergi += s.ozet.odenenFaizVergi;
    t.planliGiris += s.ozet.planliGiris;
    t.planliCikis += s.ozet.planliCikis;
    toplamlar.set(s.currency, t);
  }
  return { satirlar, toplamlar: [...toplamlar.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
}

export async function finansmanDetayi(id: string) {
  const k = await prisma.finansman.findUnique({
    where: { id },
    include: {
      hareketler: {
        orderBy: [{ vade: "asc" }, { createdAt: "asc" }],
        include: { faizGider: { select: { id: true, category: { select: { name: true } } } }, reversedBy: { select: { id: true } } },
      },
    },
  });
  if (!k) return null;
  return { kaynak: k, ozet: kaynakOzeti(k.tur, k.hareketler.map(ozetHareketi)) };
}

/**
 * NAKİT TAKVİMİ SATIRLARI — yalnız PLANLI (gerçekleşmemiş) hareketler.
 * GİRİŞ → girecek (anapara) · GERİ ÖDEME → çıkacak (anapara + faiz + vergi) ·
 * MAHSUP nakit değildir, takvime GİRMEZ. Gerçekleşmiş hareket takvimde yoktur:
 * olmuş para artık bir beklenti değildir.
 */
export async function finansmanTakvimHareketleri() {
  const hareketler = await prisma.finansmanHareketi.findMany({
    where: { gerceklestiAt: null, isReversal: false, tur: { in: ["GIRIS", "GERI_ODEME"] } },
    select: {
      id: true,
      tur: true,
      vade: true,
      anapara: true,
      faiz: true,
      vergi: true,
      finansman: { select: { id: true, kaynakAdi: true, currency: true } },
    },
    orderBy: { vade: "asc" },
  });
  return hareketler.map((h) => ({
    yon: h.tur === "GIRIS" ? ("GIRECEK" as const) : ("CIKACAK" as const),
    tarih: h.vade,
    tutar: h.tur === "GIRIS" ? sayi(h.anapara) : sayi(h.anapara) + sayi(h.faiz) + sayi(h.vergi),
    paraBirimi: h.finansman.currency,
    baslik: h.finansman.kaynakAdi,
    adres: `/finansman/${h.finansman.id}`,
  }));
}
