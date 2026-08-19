"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronRight, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Baglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useBicim } from "@/lib/bicim-istemci";
import { uyarilariGetir } from "@/lib/uyari/eylem";
import { canSayisi, canSeviyesi, notrVarMi } from "@/lib/uyari/kurallar";
import { DURUM_CIPI, DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import type { Uyari } from "@/lib/uyari/turler";

/**
 * ============================================================================
 *  UYARI ÇANI — ÜST ÇUBUK
 * ----------------------------------------------------------------------------
 *  Mimar sözleşmesi 15.08.2026, Faz 1: dört kırmızı uyarı.
 *
 *  ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 *  Uyarı yoksa çan GİZLENMEZ: nötr durur ve panel açılınca "temiz ✓" yazar.
 *  Bir şeyin YOKLUĞUNDAN "sorun yok" sonucu çıkarılamaz; kullanıcı onu
 *  "ekran bozuk" ya da "çan çalışmıyor" diye okur.
 *
 *  ── HER UYARI EYLEME GÖTÜRÜR ────────────────────────────────────────────
 *  Satırın tamamı tıklanabilir ve süzülü ekrana gider. Sayıyı görüp "nerede
 *  bunlar?" diye aramak zorunda kalmak, sayının işe yaramaması demektir
 *  (İlke #9). Gösterdiğimiz her adresin VAR OLAN bir ekrana gittiği
 *  `uyari:dogrula` ile ayrıca sınanıyor.
 *
 *  ── SAYFA ÇİZİMİNİ BEKLETMEZ ────────────────────────────────────────────
 *  Veri bağlandıktan sonra çekiliyor (bkz. `uyari/eylem.ts`). Yükleme
 *  sırasında rozet YOK — "0 uyarı" diye yanlış bir güvence vermemek için
 *  boş rozet de çizilmiyor.
 * ============================================================================
 */

export function UyariCani() {
  const t = useTranslations("Uyari");
  const bicim = useBicim();
  const [uyarilar, setUyarilar] = useState<Uyari[] | null>(null);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    let iptal = false;
    uyarilariGetir()
      .then((liste) => {
        if (!iptal) setUyarilar(liste);
      })
      /**
       * Hata YUTULMAZ ama çan da çökmez: boş liste yerine `null` kalır ve
       * rozet çizilmez. "Sıfır uyarı" ile "bilinmiyor" aynı şey değildir;
       * ikisini birleştirmek sessiz güvence olurdu.
       */
      .catch(() => {
        if (!iptal) setUyarilar(null);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const seviye = uyarilar === null ? null : canSeviyesi(uyarilar);
  const sayi = uyarilar === null ? 0 : canSayisi(uyarilar);
  /**
   * NÖTR VARLIK NOKTASI — rakamsız.
   *
   * Nötr katman rozete girmiyor (rozet EYLEM çağrısıdır, bilgi sayacı
   * değil). Ama hiçbir işaret bırakmasaydık o katman görünmez olurdu ve
   * kimse oraya bakmazdı — yazmakla yazmamak arasında fark kalmazdı.
   *
   * Nokta RAKAM TAŞIMAZ: taşısaydı rozetin işini yapar ve tam kaçındığımız
   * şeye, eylemsiz sayı enflasyonuna dönerdi. Nokta bir davettir, çağrı
   * değil. Rozet varken çizilmez — iki işaret üst üste gürültüdür.
   */
  const notrNokta = uyarilar !== null && sayi === 0 && notrVarMi(uyarilar);

  return (
    <Sheet open={acik} onOpenChange={setAcik}>
      <SheetTrigger asChild>
        {/* 44px mobil dokunma hedefi (İlke #8) — masaüstünde küçülüyor. */}
        <Button
          variant="outline"
          size="icon"
          className="relative size-11 shrink-0 md:size-8"
          aria-label={
            sayi > 0
              ? t("canEtiketiVar", { sayi })
              : notrNokta
                ? t("canEtiketiBilgi")
                : t("canEtiketiTemiz")
          }
        >
          <Bell className="size-4" />
          {sayi > 0 ? (
            <span
              className={`absolute -end-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-5 font-semibold ${
                seviye === "kirmizi" ? DURUM_CIPI.olumsuz : DURUM_CIPI.uyari
              }`}
            >
              {sayi}
            </span>
          ) : notrNokta ? (
            /* Sayısız nokta — "burada bakılacak bir şey var" der, çağırmaz.
               Dokunma hedefi düğmenin kendisi; nokta yalnız işaret. */
            <span
              aria-hidden
              className={`absolute -end-0.5 -top-0.5 size-2 rounded-full ${DURUM_CIPI.bilgi}`}
            />
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("baslik")}</SheetTitle>
          <SheetDescription>{t("aciklama")}</SheetDescription>
        </SheetHeader>

        <div className="min-w-0 space-y-2 overflow-y-auto px-4 pb-4">
          {uyarilar === null ? (
            <p className="text-muted-foreground text-sm">{t("yukleniyor")}</p>
          ) : uyarilar.length === 0 ? (
            /* AÇIK SIFIR: "hiçbir şey yok" da bir cevaptır ve yazılır. */
            <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>{t("temiz")}</p>
          ) : (
            uyarilar.map((u) => (
              <Baglanti
                key={u.anahtar}
                href={u.adres}
                onClick={() => setAcik(false)}
                className={`flex min-w-0 items-start gap-3 rounded-lg p-3 no-underline ${
                  DURUM_KUTUSU[u.seviye === "kirmizi" ? "olumsuz" : "uyari"]
                }`}
              >
                <TriangleAlert
                  className={`mt-0.5 size-4 shrink-0 ${
                    DURUM_YAZISI[u.seviye === "kirmizi" ? "olumsuz" : "uyari"]
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {t(`baslik_${u.anahtar}`, { sayi: u.sayi })}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {u.tutar !== null && u.paraBirimi !== null
                      ? bicim.para(u.tutar, u.paraBirimi) + " · "
                      : ""}
                    {t(`eylem_${u.anahtar}`)}
                  </span>
                </span>
                <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-60" />
              </Baglanti>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
