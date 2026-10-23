import { isTakvimGunu, pencereOlustur } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import {
  donemGunu,
  gecenYilKapsami,
  gecenYilPenceresi,
  rehberKur,
  type GecenYilKapsami,
  type IleriGun,
  type RehberDonemi,
  type RehberSatiri,
} from "./alim-rehberi";
import { satisEkseniVerisi, stokEkseniVerisi } from "./urun-analizi-verisi";

/**
 * ALIM REHBERİ — VERİ (SUNUCU). Hesap `alim-rehberi.ts`te (saf); burası yalnız
 * Ürün analizinin İKİ gövdesini çağırır. Para birimi TRY, kanal TÜMÜ:
 * alım kararı kanaldan bağımsız verilir (raftaki mal hangi kanala gideceğini bilmez).
 * Faz 2-a: geçen yılın penceresi de AYNI satış gövdesinden (iptal/kaldırılan
 * kalem kuralı ortak); stok BİR KEZ okunur, iki kümeye de o verilir.
 */
export type GecenYilVerisi = {
  satirlar: RehberSatiri[];
  kapsam: GecenYilKapsami;
  /** Etiket çapaları (UTC gece yarısı) — ekranda yazılan ilk ve son gün. */
  ilkGun: Date;
  sonGun: Date;
  /** Defterin ilk (iptal edilmemiş) satışı; kapsam notunda yazılır. */
  ilkSatis: Date | null;
};

export async function rehberVerisi(donem: RehberDonemi, ileri: IleriGun, an: Date): Promise<{
  satirlar: RehberSatiri[];
  gun: number;
  baslangic: Date;
  bitisHaric: Date;
  gecenYil: GecenYilVerisi;
}> {
  const pencere = pencereOlustur(donem, an);
  const gun = donemGunu(pencere.baslangic, pencere.bitisHaric, an);
  const gy = pencereOlustur("OZEL", an, gecenYilPenceresi(isTakvimGunu(an), ileri));
  const bugun = new Date(an);
  bugun.setUTCHours(0, 0, 0, 0);
  const [satis, gecenYilSatis, stok, ilk] = await Promise.all([
    satisEkseniVerisi(pencere, "TRY", null),
    satisEkseniVerisi(gy, "TRY", null),
    stokEkseniVerisi(bugun),
    prisma.sale.findFirst({ where: { iptalTarihi: null }, orderBy: { soldAt: "asc" }, select: { soldAt: true } }),
  ]);
  const ilkSatis = ilk?.soldAt ?? null;
  return {
    satirlar: rehberKur(satis, stok, gun),
    gun,
    baslangic: pencere.baslangic,
    bitisHaric: pencere.bitisHaric,
    gecenYil: {
      satirlar: rehberKur(gecenYilSatis, stok, ileri),
      kapsam: gecenYilKapsami(ilkSatis, gy.baslangic, gy.bitisHaric),
      ilkGun: gy.ilkGun,
      sonGun: gy.sonGun,
      ilkSatis,
    },
  };
}
