import { prisma } from "@/lib/prisma";

import {
  FINANSMAN_TURLERI,
  TUM_BIRIMLER,
  kaynakOzeti,
  tlKarsiligi,
  type FinansmanBirimi,
  type FinansmanTuru,
  type KaynakOzeti,
  type OzetHareketi,
} from "./kural";

/**
 * FİNANSMAN — VERİ (K304 · K304-②). Ekran, detay ve nakit takvimi BURADAN
 * okur; hesap `kural.ts`te. Hiçbir şey YAZMAZ.
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

/** Firma ayarı: USD ve altın birimleri açık mı (K304-② özellik anahtarı). */
export async function cokBirimAcikMi(companyId: string): Promise<boolean> {
  const f = await prisma.company.findUnique({ where: { id: companyId }, select: { finansmanCokBirim: true } });
  return f?.finansmanCokBirim ?? false;
}

export type BirimFiyati = { fiyat: number; gecerliGun: Date };

/**
 * Her birimin EN YENİ fiyatı (kullanıcının girdiği). Birim başına tek sorgu —
 * birim sayısı sabit ve küçük (5). TRY'nin fiyatı yoktur (kendisi).
 */
export async function sonFiyatlar(): Promise<Partial<Record<FinansmanBirimi, BirimFiyati>>> {
  const sonuc: Partial<Record<FinansmanBirimi, BirimFiyati>> = {};
  await Promise.all(
    TUM_BIRIMLER.filter((b) => b !== "TRY").map(async (birim) => {
      const f = await prisma.finansmanBirimFiyati.findFirst({
        where: { birim },
        orderBy: [{ gecerliGun: "desc" }, { createdAt: "desc" }],
        select: { fiyat: true, gecerliGun: true },
      });
      if (f) sonuc[birim] = { fiyat: sayi(f.fiyat), gecerliGun: f.gecerliGun };
    }),
  );
  return sonuc;
}

export type FinansmanSatiri = {
  id: string;
  tur: FinansmanTuru;
  kaynakAdi: string;
  birim: FinansmanBirimi;
  note: string | null;
  hareketSayisi: number;
  ozet: KaynakOzeti;
};

export type BirimToplami = {
  sermaye: number;
  kalanBorc: Record<Exclude<FinansmanTuru, "SERMAYE">, number>;
  odenenFaizVergi: number;
  planliGiris: number;
  planliCikis: number;
};

const bosToplam = (): BirimToplami => ({
  sermaye: 0,
  kalanBorc: { ORTAK_BORCU: 0, UCUNCU_KISI_BORCU: 0, BANKA_KREDISI: 0 },
  odenenFaizVergi: 0,
  planliGiris: 0,
  planliCikis: 0,
});

/**
 * Liste + TOPLAMLAR. Toplam SÜZGEÇLE BİRLİKTE değişir (İlke #15): ekranda ne
 * varsa onun toplamı. Birimler AYRI toplanır; kur/fiyat çevrilmez.
 * TL KARŞILIĞI ayrıca: kalan borç × son girilen fiyat. Fiyatı girilmemiş birim
 * toplama GİRMEZ ve `fiyatsizBirimler`de adıyla döner (sessizce yutulmaz).
 */
export async function finansmanListesi(g: { arama: string; tur: FinansmanTuru | null }) {
  const [kaynaklar, fiyatlar] = await Promise.all([
    prisma.finansman.findMany({
      where: {
        ...(g.tur ? { tur: g.tur } : {}),
        ...(g.arama ? { OR: [{ kaynakAdi: { contains: g.arama } }, { note: { contains: g.arama } }] } : {}),
      },
      include: {
        hareketler: { select: { tur: true, anapara: true, faiz: true, vergi: true, gerceklestiAt: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    sonFiyatlar(),
  ]);

  const satirlar: FinansmanSatiri[] = kaynaklar.map((k) => ({
    id: k.id,
    tur: k.tur,
    kaynakAdi: k.kaynakAdi,
    birim: k.birim,
    note: k.note,
    hareketSayisi: k.hareketler.length,
    ozet: kaynakOzeti(k.tur, k.hareketler.map(ozetHareketi)),
  }));

  const toplamlar = new Map<FinansmanBirimi, BirimToplami>();
  for (const s of satirlar) {
    const t = toplamlar.get(s.birim) ?? bosToplam();
    t.sermaye += s.ozet.sermayeKatkisi;
    if (s.tur !== "SERMAYE") t.kalanBorc[s.tur] += s.ozet.kalanBorc ?? 0;
    t.odenenFaizVergi += s.ozet.odenenFaizVergi;
    t.planliGiris += s.ozet.planliGiris;
    t.planliCikis += s.ozet.planliCikis;
    toplamlar.set(s.birim, t);
  }

  /** Toplam borcun TL karşılığı — yalnız fiyatı bilinen birimler. */
  let borcTl = 0;
  const fiyatsizBirimler: FinansmanBirimi[] = [];
  for (const [birim, t] of toplamlar) {
    const kalan = t.kalanBorc.ORTAK_BORCU + t.kalanBorc.UCUNCU_KISI_BORCU + t.kalanBorc.BANKA_KREDISI;
    if (kalan === 0) continue;
    const tl = tlKarsiligi(kalan, birim, fiyatlar[birim]?.fiyat ?? null);
    if (tl === null) fiyatsizBirimler.push(birim);
    else borcTl += tl;
  }

  return {
    satirlar,
    toplamlar: TUM_BIRIMLER.filter((b) => toplamlar.has(b)).map((b) => [b, toplamlar.get(b)!] as const),
    fiyatlar,
    borcTl: Math.round(borcTl * 100) / 100,
    fiyatsizBirimler,
  };
}

export async function finansmanDetayi(id: string) {
  const [k, fiyatlar] = await Promise.all([
    prisma.finansman.findUnique({
      where: { id },
      include: {
        hareketler: {
          orderBy: [{ vade: "asc" }, { createdAt: "asc" }],
          include: {
            faizGider: { select: { id: true, amount: true, currency: true, category: { select: { name: true } } } },
            reversedBy: { select: { id: true } },
          },
        },
      },
    }),
    sonFiyatlar(),
  ]);
  if (!k) return null;
  return { kaynak: k, ozet: kaynakOzeti(k.tur, k.hareketler.map(ozetHareketi)), fiyat: fiyatlar[k.birim] ?? null };
}

/**
 * NAKİT TAKVİMİ SATIRLARI — yalnız PLANLI (gerçekleşmemiş) hareketler.
 * GİRİŞ → girecek (anapara) · GERİ ÖDEME → çıkacak (anapara + faiz + vergi) ·
 * MAHSUP nakit değildir, takvime GİRMEZ. Gerçekleşmiş hareket takvimde yoktur.
 * ⚠ Birim TRY değilse takvim satırı «hesaba katılmayanlar»a düşer (takvim
 * yalnız TL konuşur; kur çevrilmez) — gizlenmez, sayısı ekranda yazar.
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
      finansman: { select: { id: true, kaynakAdi: true, birim: true } },
    },
    orderBy: { vade: "asc" },
  });
  return hareketler.map((h) => ({
    yon: h.tur === "GIRIS" ? ("GIRECEK" as const) : ("CIKACAK" as const),
    tarih: h.vade,
    tutar: h.tur === "GIRIS" ? sayi(h.anapara) : sayi(h.anapara) + sayi(h.faiz) + sayi(h.vergi),
    paraBirimi: h.finansman.birim,
    baslik: h.finansman.kaynakAdi,
    adres: `/finansman/${h.finansman.id}`,
  }));
}
