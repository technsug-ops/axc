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
import type { UyariSeviyesi } from "@/lib/uyari/turler";
import { IZ_DOGUM_TARIHI } from "@/lib/uyari/veri-dogrulama";

/**
 * OKUMA SIRASI = ÖNCELİK SIRASI. Göz yukarıdan aşağı okur; kırmızıyı
 * amberin altına koymak, aciliyeti gizlemek olurdu.
 */
const SEVIYE_SIRASI: UyariSeviyesi[] = ["kirmizi", "amber", "notr"];

/**
 * ⚠ SEVİYE → RENK EŞLEMESİ TÜKETİCİ. Önceden `seviye === "kirmizi" ?
 * olumsuz : uyari` yazıyordu; nötr katman gelince nötr satırlar SARI
 * çizilirdi — "bilgi" satırı uyarı gibi görünürdü.
 */
const SEVIYE_RENGI: Record<UyariSeviyesi, "olumsuz" | "uyari" | "notr"> = {
  kirmizi: "olumsuz",
  amber: "uyari",
  /**
   * ⚠ "bilgi" (MAVİ) DEĞİL, "notr" (GRİ/SOLUK) — mimar bulgusu
   * 19.08.2026, canlı tur. Nötr kutular amber'la aynı görünüyordu:
   * SAYIM ayrışmıştı (rozete girmiyorlar) ama GÖRÜNÜM ayrışmamıştı.
   *
   * Mavi de yeterli değildi: renkli bir kutu hiyerarşide amberle aynı
   * ağırlıkta okunur. Hiyerarşi RENKTEN okunmalı — nötr, göz kaydırınca
   * geçilebilen katmandır.
   *
   * _Ders 3'ün ("varış noktası beyansız") renk hâli: durum doğru
   * hesaplanıyordu, kullanıcıya doğru GÖSTERİLMİYORDU._
   */
  notr: "notr",
};
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
            /* ═══════════════ ÜÇ SEVİYE, TEK EKRAN ═══════════════
               Mimar kararı 19.08.2026. Kırmızı önce, amber sonra, nötr
               en altta — göz yukarıdan aşağı okuduğu için sıralama
               önceliğin kendisidir.

               ⚠ BAŞLIK YALNIZ O SEVİYE DOLUYSA ÇIZILIR. Boş bir
               "Bilgi" başlığı her açılışta yer kaplar ve üç boş başlık
               ekranı bölüm bölüm gösterip hiçbir şey söylemez.

               ⚠ NÖTR KATMANIN SESSİZ AÇIKLAMASI: nötr satırlar rozete
               girmiyor (rozet EYLEM çağrısıdır). Kullanıcı rozette 2
               görüp ekranda 4 satır sayınca "eksik mi sayıyor" diye
               düşünebilir; başlık bunu SÖYLÜYOR. Sayının neden
               tutmadığını açıklamayan bir ekran, yanlış sayan bir
               ekranla aynı güveni kaybettirir. */
            SEVIYE_SIRASI.map((sv) => {
              const grup = uyarilar.filter((u) => u.seviye === sv);
              if (grup.length === 0) return null;
              return (
                <div key={sv} className="space-y-2">
                  <p className="text-muted-foreground pt-2 text-xs font-medium">
                    {t(`grup_${sv}`)}
                  </p>
                  {grup.map((u) => (
                    <Baglanti
                      key={u.anahtar}
                      href={u.adres}
                      onClick={() => setAcik(false)}
                      className={`flex min-w-0 items-start gap-3 rounded-lg p-3 no-underline ${
                        DURUM_KUTUSU[SEVIYE_RENGI[u.seviye]]
                      }`}
                    >
                      <TriangleAlert
                        className={`mt-0.5 size-4 shrink-0 ${
                          DURUM_YAZISI[SEVIYE_RENGI[u.seviye]]
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
                        {/* ---------- İZ DOĞUM BEYANI ----------
                            ⚠ 18.08.2026 kuralı: yeni bir iz yayına
                            girdiğinde onu gösteren ekran DOĞUM TARİHİNİ
                            yazar. Doğrulama mekanizması bu uyarıdan SONRA
                            açıldı; ondan öncesi için "doğrulanmamış" bir
                            hüküm DEĞİLDİR — mekanizma yoktu.

                            Kutunun DİP SATIRINDA (mimar kararı): bağlam
                            neredeyse beyan orada. Liste başlığına konsa
                            hangi uyarıya ait olduğu belirsiz kalırdı. */}
                        {u.anahtar === "veriSupheli" ? (
                          <span className="text-muted-foreground/70 mt-1 block text-[11px]">
                            {t("izDogumu", { tarih: IZ_DOGUM_TARIHI })}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-60" />
                    </Baglanti>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
