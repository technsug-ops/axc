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
import { oturumToplamAdedi } from "@/lib/depo/yerlestirme";
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
    { sku: string; ad: string; onceki: string | null; ayni: boolean; stok: number }[]
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
            /** K379 — defterdeki adet: "kaç tane koymalıyım"ın cevabı. */
            stok: cevap.stokAdedi,
          },
          ...o,
        ]);
        setRaf((r) =>
          r
            ? { ...r, urunSayisi: cevap.rafUrunSayisi, toplamAdet: cevap.rafToplamAdedi }
            : r,
        );
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
      /*
       * ⛔ "BULUNAMADI" DEĞİL — TERSİ. Bu kod BİRDEN ÇOK ürüne uyuyor.
       * İkisi aynı mesaja indirilseydi depocu var olan ürünü yeniden
       * tanımlamaya kalkardı; yani mesaj, arızayı besleyen bir iş üretirdi.
       */
      case "COK_ESLESME":
        setUrunNotu(t("cokEslesme", { kod: cevap.kod, adet: cevap.adet }));
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
    /* K330-④ — form beyaz kartta (kullanıcı 10.10.2026: gri zemine dizilmiş form eski görünüm). */
    <div className="space-y-6 rounded-lg border p-4 sm:p-6">
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
            {/*
              ⭐ İKİ RAKAM BİRLİKTE (K379): "2 ürün" kaç KALEM olduğunu,
              "7 adet" rafta kaç PARÇA olması gerektiğini söyler. Operatör
              fiziksel rafı ikincisiyle karşılaştırır.
            */}
            <p className="text-muted-foreground mt-1 text-xs">
              {t("rafDoluluk", { adet: raf.urunSayisi, toplam: raf.toplamAdet })}
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
          {/*
            ⚠ TOPLAM SAF GÖVDEDEN (`oturumToplamAdedi`) — aynı ürün iki kez
            okutulduğunda adedi İKİ KEZ saymaz; bkz. gövdenin başlığı.
          */}
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <PackagePlus className="size-4" aria-hidden />
            {t("gecmisBasligi", {
              adet: gecmis.length,
              toplam: oturumToplamAdedi(gecmis),
            })}
          </h2>
          <ul className="divide-y rounded-md border text-sm">
            {gecmis.map((g, i) => (
              <li key={`${g.sku}-${i}`} className="flex flex-col gap-1 p-2">
                <span className="flex flex-wrap items-center gap-2">
                  <KopyalanabilirKod deger={g.sku} etiket={t("skuEtiketi")} />
                  {/*
                    ⭐ STOK ADEDİ SATIRDA (K379, kullanıcı 15.11.2026):
                    "doğru sayıda yerleştirdim mi" sorusunu cevaplamak için
                    /stok ekranına çıkmak gerekiyordu — rakam sistemde vardı,
                    söylenmiyordu.

                    ⛔ SIFIR VE EKSİ GİZLENMEZ, UYARI RENGİYLE YAZAR: elinde
                    ürün varken defter 0 diyorsa bu bir bulgudur (İlke #5 ·
                    "sıfır satır gizlenmez"). Yerleştirme yine yapıldı —
                    bu ekran stok yazmaz, yalnız söyler.
                  */}
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      g.stok > 0 ? DURUM_YAZISI.olumlu : DURUM_YAZISI.uyari
                    }`}
                  >
                    {t("stokAdedi", { adet: g.stok })}
                  </span>
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
