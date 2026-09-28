import { paraBirimiMi, type FinansmanBirimi } from "./kural";

/**
 * FİNANSMAN MİKTAR GÖSTERİMİ (K304-②) — sunucu ve istemci AYNI gövdeyi
 * çağırır (İlke #10). Para birimi ₺/€/$ ile biçimlenir; altın para DEĞİLDİR,
 * `Intl` ona para kodu gibi davranırsa hata verir — gram olarak yazılır.
 * Metin sözlükten gelir (`birimMiktar.*`), burada kurulmaz.
 */
export type MiktarBicimi = {
  para(tutar: number, paraBirimi: string): string;
  sayi(deger: number, basamak?: number): string;
};

export function miktarMetni(
  n: number,
  birim: FinansmanBirimi,
  bicim: MiktarBicimi,
  gramMetni: (birim: FinansmanBirimi, miktar: string) => string,
): string {
  if (paraBirimiMi(birim)) return bicim.para(n, birim);
  return gramMetni(birim, bicim.sayi(n, 2));
}
