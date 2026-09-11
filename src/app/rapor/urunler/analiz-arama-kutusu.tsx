"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { analizAdresi, type AnalizParametreleri } from "@/lib/rapor/urun-analizi";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ ARAMASI — KAMERA + USB OKUYUCU (İlke #7)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AYRI DOSYA/BİLEŞEN: `AnalizSuzgeci` sunucu bileşeni (JavaScript'siz
 *  çalışan bir `<form method="get">`); kamera istemci tarafı gerektirir
 *  (`BarkodGirisi`), o yüzden arama kutusu KENDİ istemci adacığına ayrıldı.
 *
 *  ⛔ ORTAK `KodAramaKutusu` DEĞİL, ORTAK `BarkodGirisi` KULLANILDI. Bulgu
 *  (11.09.2026, kullanıcı ekran görüntüsü): bu ekranın arama kutusu düz bir
 *  `<Input name="arama">` idi ve `kamera:dogrula`nın desen yasağı
 *  (`name="q"`/`"bq"`) bunu YAKALAMADI — desen tek bir literal isme kilitli.
 *  `KodAramaKutusu` (öteki liste ekranlarının ortak bileşeni) `suzgecAdresi`
 *  ile DÜZ bir `Record<string,string>` kuruyor; bu sayfanın süzgeçleri
 *  TEKRARLI parametre taşıyor (`marka=LEGO&marka=Karaca`, `analizAdresi`nin
 *  `q.append`iyle). O yüzden burada `analizAdresi` — sayfanın KENDİ saf URL
 *  kurucusu — doğrudan çağrılıyor; ikinci bir URL kurma ölçütü YAZILMADI,
 *  var olanı istemciden de çağrılabilir (saf fonksiyon, sunucuya bağlı değil).
 *
 *  ⚠ DİĞER SÜZGEÇLERLE AYNI DAVRANIŞ: bu kutu, sayfadaki `favori`/
 *  `incelenecek`/`sezon` çipleriyle AYNI şekilde `taban`ı kullanıp anında
 *  yönlendirir — "Uygula" düğmesini beklemez (İlke #9). Ana formda o an
 *  YAZILMIŞ ama gönderilmemiş bir değişiklik varsa (ör. elle girilen
 *  minAdet), o değişiklik korunmaz; bu, aynı `taban`ı kullanan öteki
 *  çiplerin de zaten kabul ettiği bir sınırdır — burada YENİ bir davranış
 *  değil.
 * ============================================================================
 */
export function AnalizAramaKutusu({
  taban,
  baslangic,
  ipucu,
}: {
  /** Süzgeç TABANI — arama HARİÇ tüm o anki süzgeçler (K212'nin `taban`ı). */
  taban: AnalizParametreleri;
  /** Adreste duran mevcut arama. */
  baslangic: string;
  ipucu: string;
}) {
  const router = useRouter();
  const ortak = useTranslations("Ortak");
  const [sorgu, setSorgu] = useState(baslangic);

  const ara = (deger: string) => {
    const temiz = deger.trim();
    router.push(analizAdresi({ ...taban, arama: temiz === "" ? undefined : temiz }));
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <BarkodGirisi
        id="analiz-arama"
        className="max-w-xs min-w-44 flex-1"
        value={sorgu}
        onChange={setSorgu}
        /* Enter (USB okuyucu) ve kamera aynı yola çıkar (İlke #9). */
        onOkundu={ara}
        placeholder={ipucu}
      />
      <Button type="button" variant="secondary" onClick={() => ara(sorgu)}>
        {ortak("ara")}
      </Button>
      {baslangic || sorgu ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSorgu("");
            ara("");
          }}
        >
          {ortak("temizle")}
        </Button>
      ) : null}
    </div>
  );
}
