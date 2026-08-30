"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";

/**
 * Stok araması. Barkod okutulduğunda (USB Enter veya kamera) doğrudan
 * o koda göre filtreler — ayrıca elle de yazılabilir.
 */
export function StokArama({ baslangic }: { baslangic: string }) {
  const router = useRouter();
  const parametreler = useSearchParams();
  const t = useTranslations("Stok");
  const ortak = useTranslations("Ortak");
  /**
   * TASLAK DEGER YEREL DURUMDA — VE BU KALDIRILAMAZ.
   * Deger dogrudan adresten okunsaydi kutu DOLDURULAMAZDI: kullanici yazar,
   * arama henuz tetiklenmedigi icin adres degismez, React her tusta eski
   * degeri geri yazar ve ekranda hicbir hata cikmaz.
   * (Anayasa: "kontrollu girdi, durumu olmadan yazilamaz" — 26.08 arizasi.)
   * Adres yalniz TAMAMLANMIS sonucu tasir; okunan kod ise `onOkundu` ile
   * DOGRUDAN parametre olarak geciyor, ara durumdan okunmuyor.
   */
  const [sorgu, setSorgu] = useState(baslangic);

  /**
   * ADRESI SIFIRDAN KURMAZ — MEVCUT PARAMETRELERI KORUR (K104).
   *
   * Eski hali `/stok?q=X` yaziyordu ve arama yapmak siralama ile sifir
   * suzgecini SESSIZCE siliyordu: kullanici "Anker" arayip listeyi adete
   * gore siralayinca, ikinci aramada sira kayboluyordu.
   *
   * `sayfa` BILEREK dusuruluyor: yeni bir arama bambaska bir liste uretir,
   * 5. sayfada kalmak kullaniciyi bos ekrana dusururdu.
   */
  function adresKur(yeniSorgu: string): string {
    const p = new URLSearchParams(parametreler.toString());
    const temiz = yeniSorgu.trim();
    if (temiz) p.set("q", temiz);
    else p.delete("q");
    p.delete("sayfa");
    const qs = p.toString();
    return qs ? `/stok?${qs}` : "/stok";
  }

  function ara(deger: string) {
    router.push(adresKur(deger));
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <BarkodGirisi
        className="max-w-sm min-w-48 flex-1"
        value={sorgu}
        onChange={setSorgu}
        onOkundu={ara}
        placeholder={t("aramaIpucu")}
        kameraBasligi={t("kameraBasligi")}
      />
      <Button type="button" variant="secondary" onClick={() => ara(sorgu)}>
        {ortak("ara")}
      </Button>
      {baslangic ? (
        <Button type="button" variant="ghost" asChild>
          {/* ⚠ YALNIZ ARAMAYI TEMIZLER. Duz `/stok` yazsaydi siralamayi ve
              sifir suzgecini de supururdu — kullanici yalnizca arama
              kutusunu bosaltmak istemisti. */}
          <Link href={adresKur("")}>{ortak("temizle")}</Link>
        </Button>
      ) : null}
    </div>
  );
}
