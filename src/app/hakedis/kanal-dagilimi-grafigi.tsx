"use client";

import { PastaGrafik, type PastaDilimi } from "@/components/pasta-grafik";
import { useBicim } from "@/lib/bicim-istemci";

/**
 * ============================================================================
 *  SUNUCU→İSTEMCİ SINIRI — İNCE SARMALAYICI
 * ----------------------------------------------------------------------------
 *  `PastaGrafik` bir "use client" bileşenidir ve `bicimle` bir FONKSİYON
 *  prop'tur. `/hakedis` sayfası bir SUNUCU bileşenidir; sunucudan istemciye
 *  doğrudan bir kapanış (closure) GEÇİRİLEMEZ — RSC serileştirmesi
 *  fonksiyonu taşıyamaz ve ekran ÜRETİMDE ÇÖKER (canlı vaka: "Bu ekran
 *  çizilemedi"). `tsc` ve lint bunu YAKALAMAZ — fonksiyon prop'u tip olarak
 *  geçerlidir, çökme yalnız gerçek sunucu render'ında görülür.
 *
 *  Bu yüzden sayfa `PastaGrafik`i DOĞRUDAN çağırmaz; yalnız SERİLEŞTİRİLEBİLİR
 *  veriyi (dilimler + toplam + para birimi metni) buraya verir, `bicimle`
 *  burada, istemci tarafında (`useBicim`) kurulur.
 * ============================================================================
 */
export function KanalDagilimiGrafigi({
  dilimler,
  toplam,
  paraBirimi,
  bosMesaj,
}: {
  dilimler: PastaDilimi[];
  toplam: number;
  paraBirimi: string;
  bosMesaj: string;
}) {
  const bicim = useBicim();
  return (
    <PastaGrafik
      dilimler={dilimler}
      toplam={toplam}
      bicimle={(n) => bicim.para(n, paraBirimi)}
      bosMesaj={bosMesaj}
    />
  );
}
