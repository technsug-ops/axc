import { gunDegeri, isTakvimGunu, pencereOlustur } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { gecenYilKapsami, rehberKur, type GecenYilKapsami, type RehberSatiri } from "@/lib/rapor/alim-rehberi";
import { rehberStoku } from "@/lib/rapor/alim-rehberi-verisi";
import type { AnalizSatiri } from "@/lib/rapor/urun-analizi";
import { satisEkseniVerisi } from "@/lib/rapor/urun-analizi-verisi";

import {
  alimKampanyasiListesi,
  aralikGunu,
  canAdaylari,
  carpan,
  gunMetni,
  kalanGun,
  ozelGunRehberAdresi,
  yaklasanlar,
  satisGunuListesi,
  tabanPenceresi,
  TABAN_GUN,
  type AlimSatiri,
  type OzelGunTuru,
  type TarihSatiri,
  type YaklasanGun,
} from "./ozel-gun";

/**
 * ÖZEL GÜN TAKVİMİ — OKUMA (SUNUCU). Hesap `ozel-gun.ts`te (saf).
 * Satış tarafı Alım rehberiyle AYNI gövdelerden (`satisEkseniVerisi` +
 * `rehberKur`) — iki sekme aynı ürüne aynı adedi yazar.
 */

export type GunKaydi = {
  id: string;
  ad: string;
  tur: OzelGunTuru;
  aktif: boolean;
  aciklama: string | null;
  kanal: { id: string; ad: string; kod: string } | null;
  tarihler: (TarihSatiri & { kaynak: string | null })[];
};

/** Ayarlar ekranı + rehber: bütün özel günler, tarihleri eskiden yeniye. */
export async function ozelGunKayitlari(): Promise<GunKaydi[]> {
  const satirlar = await prisma.ozelGun.findMany({
    orderBy: { ad: "asc" },
    select: {
      id: true,
      ad: true,
      tur: true,
      aktif: true,
      aciklama: true,
      channel: { select: { id: true, name: true, code: true } },
      tarihler: { orderBy: { baslangic: "asc" }, select: { id: true, ozelGunId: true, baslangic: true, bitis: true, dogrulandi: true, kaynak: true } },
    },
  });
  return satirlar.map((s) => ({
    id: s.id,
    ad: s.ad,
    tur: s.tur,
    aktif: s.aktif,
    aciklama: s.aciklama,
    kanal: s.channel ? { id: s.channel.id, ad: s.channel.name, kod: s.channel.code } : null,
    tarihler: s.tarihler,
  }));
}

export type Yaklasan = YaklasanGun<GunKaydi>;

export type CarpanVerisi = { carpan: number | null; pencereSiparis: number; pencereGun: number; tabanSiparis: number; tabanGun: number };

export type OzelGunDetayi =
  | { durum: "ONCEKI_YOK" }
  | {
      durum: "SATIS";
      kapsam: GecenYilKapsami;
      ilkKayit: Date | null;
      carpan: CarpanVerisi | null;
      satirlar: RehberSatiri[];
    }
  | {
      durum: "ALIM";
      kapsam: GecenYilKapsami;
      ilkKayit: Date | null;
      satirlar: AlimSatiri[];
    };

async function siparisSayisi(baslangic: Date, bitisHaric: Date, kanalId: string | null): Promise<number> {
  return prisma.sale.count({
    where: {
      iptalTarihi: null,
      soldAt: { gte: baslangic, lt: bitisHaric },
      ...(kanalId === null ? {} : { channelAccount: { channelId: kanalId } }),
    },
  });
}

/**
 * Seçili yaklaşan günün ayrıntısı — geçen yılki karşılığının penceresi.
 * `stok` bugünkü stok ekseni (rehber bir kez okur, buraya verir);
 * `donemSatirlari` rehberin seçili dönemi (alım listesinde «bugünkü talep»).
 */
export async function ozelGunDetayi(
  y: Yaklasan,
  an: Date,
  stok: AnalizSatiri[],
  donemSatirlari: RehberSatiri[],
): Promise<OzelGunDetayi> {
  if (y.onceki === null) return { durum: "ONCEKI_YOK" };
  const p = pencereOlustur("OZEL", an, { baslangic: gunMetni(y.onceki.baslangic), bitis: gunMetni(y.onceki.bitis) });
  const pencereGun = aralikGunu(y.onceki.baslangic, y.onceki.bitis);
  const kanalId = y.gun.kanal?.id ?? null;

  if (y.gun.tur === "ALIM_KAMPANYASI") {
    const [kalemler, ilk] = await Promise.all([
      prisma.purchaseItem.findMany({
        where: { purchase: { purchasedAt: { gte: p.baslangic, lt: p.bitisHaric }, status: { notIn: ["DRAFT", "CANCELLED"] } } },
        select: {
          variantId: true,
          quantity: true,
          variant: { select: { sku: true, barcode: true, companySku: true, product: { select: { id: true, name: true } } } },
        },
      }),
      prisma.purchase.findFirst({
        where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
        orderBy: { purchasedAt: "asc" },
        select: { purchasedAt: true },
      }),
    ]);
    const rafHaritasi = new Map(stok.map((s) => [s.variantId, s.rafAdedi ?? 0]));
    const satisHaritasi = new Map(donemSatirlari.map((s) => [s.variantId, s.adet]));
    const birlesik = new Map<string, AlimSatiri>();
    for (const k of kalemler) {
      const mevcut = birlesik.get(k.variantId);
      if (mevcut) {
        mevcut.alinan += k.quantity;
        continue;
      }
      birlesik.set(k.variantId, {
        variantId: k.variantId,
        urunId: k.variant.product?.id ?? null,
        urunAdi: k.variant.product?.name ?? k.variant.sku,
        sku: k.variant.sku,
        barkod: k.variant.barcode,
        firmaSku: k.variant.companySku,
        alinan: k.quantity,
        raf: rafHaritasi.get(k.variantId) ?? 0,
        donemSatis: satisHaritasi.get(k.variantId) ?? 0,
      });
    }
    const ilkKayit = ilk?.purchasedAt ?? null;
    return { durum: "ALIM", kapsam: gecenYilKapsami(ilkKayit, p.baslangic, p.bitisHaric), ilkKayit, satirlar: alimKampanyasiListesi([...birlesik.values()]) };
  }

  const tabanMetni = tabanPenceresi(y.onceki.baslangic);
  const taban = pencereOlustur("OZEL", an, tabanMetni);
  const [satis, pencereSiparis, tabanSiparis, ilk] = await Promise.all([
    satisEkseniVerisi(p, "TRY", y.gun.kanal?.kod ?? null),
    siparisSayisi(p.baslangic, p.bitisHaric, kanalId),
    siparisSayisi(taban.baslangic, taban.bitisHaric, kanalId),
    prisma.sale.findFirst({ where: { iptalTarihi: null }, orderBy: { soldAt: "asc" }, select: { soldAt: true } }),
  ]);
  const ilkKayit = ilk?.soldAt ?? null;
  /* Taban penceresi defterin başlangıcından önceye taşıyorsa çarpan KURULMAZ — yarım taban çarpanı şişirirdi. */
  const tabanTam = ilkKayit !== null && ilkKayit.getTime() <= taban.baslangic.getTime();
  return {
    durum: "SATIS",
    kapsam: gecenYilKapsami(ilkKayit, p.baslangic, p.bitisHaric),
    ilkKayit,
    carpan: tabanTam
      ? {
          carpan: carpan({ siparis: pencereSiparis, gun: pencereGun }, { siparis: tabanSiparis, gun: TABAN_GUN }),
          pencereSiparis,
          pencereGun,
          tabanSiparis,
          tabanGun: TABAN_GUN,
        }
      : null,
    satirlar: satisGunuListesi(rehberKur(satis, stok, pencereGun)),
  };
}

export type OzelGunCanOlcumu = {
  /** Seçilen günün listesindeki ürün sayısı — rehberde açılan listeyle AYNI gövde (`ozelGunDetayi`). 0 = uyarı yok. */
  sayi: number;
  adres?: string;
  /** Başlık metnine gider (`baslik_ozelGunYaklasiyor`); eylem metni parametresizdir (uyari:dogrula sözleşmesi). */
  degiskenler?: { ad: string; tur: OzelGunTuru; kalan: number; diger: number };
};

/**
 * ÇAN — ÖNCEDEN HABER (K363 Faz 2-c). Aday yoksa hiçbir ağır okuma yapılmaz
 * (stok ekseni yalnız 30 gün içinde gün varken okunur — ölçüldü 24.10.2026:
 * ~0,7 sn, soğuk 1,3 sn; çan sayfayı bekletmez).
 * Seçim: başlangıç sırasıyla listesi DOLU ilk aday. Listesi boş aday (geçen yıl
 * satılanların hepsi rafta yeterli) atlanır ama `diger` sayısında yer alır.
 * ⚠ SAYI = LİSTE: rehber aynı `ozelGunDetayi`ni aynı `rehberStoku` ile çağırır;
 * alım listesinde `donemSatirlari` yalnız sütun doldurur, süzmez — [] verilir.
 */
export async function ozelGunCanOlcumu(an: Date): Promise<OzelGunCanOlcumu> {
  const bugun = gunDegeri(isTakvimGunu(an));
  const adaylar = canAdaylari(yaklasanlar(await ozelGunKayitlari(), bugun), bugun);
  if (adaylar.length === 0) return { sayi: 0 };
  const stok = adaylar.some((a) => a.gun.tur === "SATIS_GUNU") ? await rehberStoku(an) : [];
  for (const a of adaylar) {
    const d = await ozelGunDetayi(a, an, stok, []);
    const sayi = d.durum === "ONCEKI_YOK" ? 0 : d.satirlar.length;
    if (sayi === 0) continue;
    return {
      sayi,
      adres: ozelGunRehberAdresi(a.tarih.id),
      degiskenler: { ad: a.gun.ad, tur: a.gun.tur, kalan: kalanGun(a.tarih, bugun), diger: adaylar.length - 1 },
    };
  }
  return { sayi: 0 };
}
