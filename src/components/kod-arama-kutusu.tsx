"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { suzgecAdresi } from "@/lib/suzgec";

/**
 * ============================================================================
 *  KOD ARAMA KUTUSU — LİSTE EKRANLARININ ORTAK ARAMASI
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"ürün araması yapılacak her yerde mutlaka kamera
 *  ile barkod veya QR kod okuyabilecek sistemi ekle."_
 *
 *  ⚠ BU YENİ BİR KURAL DEĞİL, TESLİM EDİLMEMİŞ BİR KURALDI. Anayasa
 *  (İlke #7) şunu diyor: _"Kod girilebilen her alan USB okuyucu (Enter) ve
 *  kamera okumayı destekler; manuel giriş yedek kalır."_ Kamera FORMLARDA
 *  vardı (ürün, alım, satış, mal kabul, kârlılık kartı, stok, raf) ama
 *  LİSTE ARAMALARINDA yoktu — oysa depoda en sık yapılan şey elinde ürünle
 *  "bu neydi" diye aramak.
 *
 *  ⚠ NİYE ORTAK BİLEŞEN, NİYE HER EKRANA AYRI KOD DEĞİL:
 *  Aynı arama kutusu ALTI ekranda kopyalanmıştı (`<form>` + gizli alanlar +
 *  `<Input name="q">` + Ara + Temizle). Yedincisi eklendiğinde kamera yine
 *  unutulurdu — nitekim altısında da unutulmuştu. Tek gövde olunca yeni bir
 *  liste ekranı kamerayı BEDAVA alır.
 *
 *  ⚠ FORM GÖNDERİMİ YERİNE YÖNLENDİRME: kamera okuduğunda kullanıcının
 *  ayrıca "Ara"ya basması gerekmemeli (İlke #9). Okuma anında sonuç gelir.
 *  Bunun için istemci bileşeni ve `router.push` gerekiyor — sunucu formu
 *  Enter beklerdi.
 *
 *  ⚠ SÜZGEÇLER KAYBOLMAZ: açık süzgeçler `tasinanlar` ile adrese yeniden
 *  yazılır. Eskiden bunu her ekran gizli `<input>`larla yapıyordu; burada
 *  tek yerde ve `suzgecAdresi` ile — sayfa numarası da kendiliğinden
 *  sıfırlanıyor (yeni aramada 3. sayfada kalmak boş liste demek).
 * ============================================================================
 */
export function KodAramaKutusu({
  temelAdres,
  baslangic,
  tasinanlar,
  ipucu,
  parametre = "q",
  kameraBasligi,
}: {
  /** `/satislar`, `/alimlar`… */
  temelAdres: string;
  /** Adreste duran mevcut arama. */
  baslangic: string;
  /** Açık süzgeçler — aramada kaybolmasınlar. */
  tasinanlar: Record<string, string | undefined>;
  ipucu: string;
  /** Arama parametresinin adı. İade bildirimlerinde `bq`. */
  parametre?: string;
  /** Kamera penceresinin başlığı; verilmezse ortak metin. */
  kameraBasligi?: string;
}) {
  const router = useRouter();
  const ortak = useTranslations("Ortak");
  const [sorgu, setSorgu] = useState(baslangic);

  const ara = (deger: string) => {
    router.push(
      suzgecAdresi(temelAdres, tasinanlar, { [parametre]: deger.trim() }),
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <BarkodGirisi
        className="max-w-xs min-w-44 flex-1"
        value={sorgu}
        onChange={setSorgu}
        /* Enter (USB okuyucu) ve kamera aynı yola çıkar. */
        onOkundu={ara}
        placeholder={ipucu}
        kameraBasligi={kameraBasligi ?? ortak("barkodKamera")}
      />
      <Button type="button" variant="secondary" onClick={() => ara(sorgu)}>
        {ortak("ara")}
      </Button>
      {baslangic ? (
        <Button type="button" variant="ghost" asChild>
          <Link href={suzgecAdresi(temelAdres, tasinanlar, { [parametre]: "" })}>
            {ortak("temizle")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
