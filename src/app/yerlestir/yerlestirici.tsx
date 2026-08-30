"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PackagePlus } from "lucide-react";

import {
  koduIsle,
  rafiSec,
  type OkumaCevabi,
  type SeciliRaf,
} from "@/app/yerlestir/actions";
import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  YERLEŞTİRME EKRANI (K50 ④)
 * ----------------------------------------------------------------------------
 *  Akış: RAFI okut → ÜRÜNLERİ peş peşe okut. Raf SEÇİLİ KALIR.
 *
 *  ⚠ OKUNAN DEĞER PARAMETRE OLARAK GEÇER — DURUMDAN OKUNMAZ. Fiyat
 *  denemesinde tam bu tuzağa düşülmüştü: kamera `setKod` çağırıp hemen
 *  işlemi tetikleyince React durumu senkron güncellenmediği için işlem
 *  HÂLÂ ESKİ kodu kullanıyordu. Kamera yeni kodu okur, sistem bir öncekini
 *  işlerdi — ekranda hata yok, yalnız yanlış ürün yanlış rafa gider.
 *
 *  ⚠ SEÇİLİ RAF DA AYNI KURALA TABİ: yazımdan önce raf kimliği YAKALANIR
 *  ve sunucuya o değer gider; ardışık okumada durumun güncellenmiş olmasına
 *  bel bağlanmaz.
 * ============================================================================
 */
export function Yerlestirici() {
  const t = useTranslations("Yerlestir");

  const rafKutusu = useRef<HTMLInputElement>(null);
  const urunKutusu = useRef<HTMLInputElement>(null);

  const [rafKodu, setRafKodu] = useState("");
  const [raf, setRaf] = useState<SeciliRaf | null>(null);
  const [rafNotu, setRafNotu] = useState<string | null>(null);

  const [urunKodu, setUrunKodu] = useState("");
  /** Bu oturumda yapılan yerleştirmeler — en yenisi üstte. */
  const [gecmis, setGecmis] = useState<
    { sku: string; ad: string; onceki: string | null; ayni: boolean }[]
  >([]);
  const [urunNotu, setUrunNotu] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  /** Cevabı tek yerde yorumla — iki çağrı yeri aynı kuralı iki kez yazmasın. */
  const cevabiIsle = (cevap: OkumaCevabi) => {
    switch (cevap.durum) {
      case "YERLESTI":
        setGecmis((o) => [
          {
            sku: cevap.sku,
            ad: cevap.urunAdi,
            onceki: cevap.oncekiKod,
            ayni: cevap.ayniRaf,
          },
          ...o,
        ]);
        setRaf((r) => (r ? { ...r, urunSayisi: cevap.rafUrunSayisi } : r));
        setUrunNotu(null);
        break;
      case "RAF_DEGISTI":
        setRaf(cevap.raf);
        setRafKodu(cevap.raf.kod);
        setRafNotu(null);
        setUrunNotu(t("rafDegisti", { kod: cevap.raf.kod }));
        break;
      /* ⛔ SESSİZ BAŞARISIZLIK YASAK (İlke #5) — her dal NİYE olmadığını yazar. */
      case "RAF_SECILMEDI":
        setUrunNotu(t("onceRafOkut"));
        break;
      case "PASIF_RAF":
        setUrunNotu(t("rafPasif", { kod: cevap.kod }));
        break;
      case "BULUNAMADI":
        setUrunNotu(t("bulunamadi", { kod: cevap.kod }));
        break;
    }
  };

  const rafOkut = (okunan?: string) => {
    const aranacak = (okunan ?? rafKodu).trim();
    if (!aranacak) return;
    basla(async () => {
      const cevap = await rafiSec(aranacak);
      if (cevap.durum === "RAF") {
        setRaf(cevap.raf);
        setRafKodu(cevap.raf.kod);
        setRafNotu(null);
        /** ⭐ ODAK ÜRÜNE GEÇER — operatör elini klavyeye götürmesin (İlke #9). */
        urunKutusu.current?.focus();
        return;
      }
      setRaf(null);
      setRafNotu(
        cevap.durum === "PASIF"
          ? t("rafPasif", { kod: cevap.kod })
          : t("rafYok", { kod: cevap.kod }),
      );
    });
  };

  /**
   * ⚠ RAF KİMLİĞİ DE PARAMETRE OLARAK GEÇER — yazımdan ÖNCE yakalanıyor.
   */
  const urunOkut = (okunan?: string) => {
    const aranacak = (okunan ?? urunKodu).trim();
    if (!aranacak) return;
    const hedefId = raf?.id ?? null;
    basla(async () => {
      const cevap = await koduIsle(aranacak, hedefId);
      cevabiIsle(cevap);
      /** ⭐ KUTU TEMİZLENİR — sıradaki ürün doğrudan okutulur. */
      setUrunKodu("");
      urunKutusu.current?.focus();
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* ═══ ADIM 1 — RAF ═══════════════════════════════════════════════ */}
      <section className="space-y-2">
        <label htmlFor="raf-kutusu" className="text-sm font-medium">
          {t("rafAdimi")}
        </label>
        <div className="flex gap-2">
          <BarkodGirisi
            id="raf-kutusu"
            value={rafKodu}
            onChange={setRafKodu}
            onOkundu={(k) => rafOkut(k)}
            inputRef={rafKutusu}
            placeholder={t("rafYerTutucu")}
            kameraBasligi={t("rafKamera")}
            autoFocus
            disabled={bekliyor}
          />
          {/* ⚠ Mobilde 44px — dokunulabilir öğe kuralı (İlke #8). */}
          <Button
            type="button"
            onClick={() => rafOkut()}
            disabled={bekliyor}
            className="h-11 shrink-0"
          >
            {t("rafSec")}
          </Button>
        </div>
        {rafNotu ? (
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{rafNotu}</p>
        ) : null}

        {raf ? (
          <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>
            <p className="flex flex-wrap items-center gap-2 font-medium">
              <KopyalanabilirKod deger={raf.kod} etiket={t("rafKoduEtiketi")} />
              {raf.ad ? (
                <span className="text-muted-foreground">{raf.ad}</span>
              ) : null}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("rafDoluluk", { adet: raf.urunSayisi })}
            </p>
          </div>
        ) : null}
      </section>

      {/* ═══ ADIM 2 — ÜRÜNLER ═══════════════════════════════════════════ */}
      <section className="space-y-2">
        <label htmlFor="urun-kutusu" className="text-sm font-medium">
          {t("urunAdimi")}
        </label>
        <div className="flex gap-2">
          <BarkodGirisi
            id="urun-kutusu"
            value={urunKodu}
            onChange={setUrunKodu}
            onOkundu={(k) => urunOkut(k)}
            inputRef={urunKutusu}
            placeholder={t("urunYerTutucu")}
            kameraBasligi={t("urunKamera")}
            disabled={bekliyor}
          />
          <Button
            type="button"
            onClick={() => urunOkut()}
            disabled={bekliyor}
            className="h-11 shrink-0"
          >
            {t("yerlestir")}
          </Button>
        </div>
        {/*
          ⚠ RAF SEÇİLMEDEN NE BEKLENDİĞİ YAZAR (İlke #5). Kutu kilitlenmiyor:
          operatör raf etiketini BURAYA da okutabilir ve seçili raf değişir.
        */}
        {!raf ? (
          <p className="text-muted-foreground text-sm">{t("rafBekleniyor")}</p>
        ) : null}
        {urunNotu ? (
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{urunNotu}</p>
        ) : null}
      </section>

      {/* ═══ BU OTURUMDA YERLEŞTİRİLENLER ═══════════════════════════════ */}
      {gecmis.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <PackagePlus className="size-4" aria-hidden />
            {t("gecmisBasligi", { adet: gecmis.length })}
          </h2>
          <ul className="divide-y rounded-md border text-sm">
            {gecmis.map((g, i) => (
              <li key={`${g.sku}-${i}`} className="flex flex-col gap-1 p-2">
                <span className="flex flex-wrap items-center gap-2">
                  <KopyalanabilirKod deger={g.sku} etiket={t("skuEtiketi")} />
                  <span>{g.ad}</span>
                </span>
                {/*
                  ⭐ ESKİ YER DE YAZAR: "nereden geldi" bilgisi olmadan
                  operatör yanlış rafa okuttuğunu fark edemez.
                */}
                <span className="text-muted-foreground text-xs">
                  {g.ayni
                    ? t("zatenBuRafta")
                    : g.onceki
                      ? t("tasindi", { onceki: g.onceki })
                      : t("ilkKez")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
