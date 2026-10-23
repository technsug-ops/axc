import { pencereOlustur } from "@/lib/donem";

import { donemGunu, rehberKur, type RehberDonemi, type RehberSatiri } from "./alim-rehberi";
import { satisEkseniVerisi, stokEkseniVerisi } from "./urun-analizi-verisi";

/**
 * ALIM REHBERİ — VERİ (SUNUCU). Hesap `alim-rehberi.ts`te (saf); burası yalnız
 * Ürün analizinin İKİ gövdesini aynı anda çağırır. Para birimi TRY, kanal TÜMÜ:
 * alım kararı kanaldan bağımsız verilir (raftaki mal hangi kanala gideceğini bilmez).
 */
export async function rehberVerisi(donem: RehberDonemi, an: Date): Promise<{
  satirlar: RehberSatiri[];
  gun: number;
  baslangic: Date;
  bitisHaric: Date;
}> {
  const pencere = pencereOlustur(donem, an);
  const gun = donemGunu(pencere.baslangic, pencere.bitisHaric, an);
  const bugun = new Date(an);
  bugun.setUTCHours(0, 0, 0, 0);
  const [satis, stok] = await Promise.all([
    satisEkseniVerisi(pencere, "TRY", null),
    stokEkseniVerisi(bugun),
  ]);
  return { satirlar: rehberKur(satis, stok, gun), gun, baslangic: pencere.baslangic, bitisHaric: pencere.bitisHaric };
}
