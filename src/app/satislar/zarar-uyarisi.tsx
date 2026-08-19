"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { useBicim } from "@/lib/bicim-istemci";
import {
  birAltDilim,
  mesafeHukmu,
  simulasyonKur,
  yonHukmu,
  yonRengi,
} from "@/lib/fiyatlama/simulasyon";
import type { SimulasyonZemini } from "@/lib/fiyatlama/kart-verisi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  ZARARINA SATIŞ UYARISI — FORM İÇİ
 * ----------------------------------------------------------------------------
 *  K1 aday 1, mimar onayı 19.08.2026.
 *
 *  ── NİYE ÇANDA DEĞİL DE FORMDA ──────────────────────────────────────────
 *  Çan rozeti GEÇMİŞTEKİ zararı sayar; o da yazıldı. Ama asıl iş satışı
 *  KAYDETMEDEN ÖNCE görmektir — kaydedildikten sonra öğrenmek, düzeltme
 *  işi doğurur. Aynı koşul iki zamanda konuşuyor: burada önleyici,
 *  çanda geriye dönük.
 *
 *  ── HESAP KOPYALANMADI, MOTOR ÇAĞRILDI ──────────────────────────────────
 *  ⚠ NET burada YENİDEN HESAPLANMAZ; `simulasyonKur` (K5 motoru) çağrılır.
 *  Formda ikinci bir NET hesabı yazsaydık aynı satış formda bir türlü,
 *  kaydedildikten sonra başka türlü görünebilirdi — ve hangisinin doğru
 *  olduğu ancak birileri fark edince anlaşılırdı.
 *
 *  ── ENGELLEMEZ, SÖYLER ──────────────────────────────────────────────────
 *  Zararına satış bazen BİLİNÇLİ bir karardır (stok eritme, kampanya).
 *  Uyarı kaydetmeyi engellemez; kullanıcıyı bilgilendirir. Engelleseydik
 *  operasyoncu uyarıyı aşmanın yolunu arardı ve o yol bulunduğu anda
 *  uyarı bir daha okunmazdı.
 *
 *  ── TAHMİN OLDUĞU YAZILI ────────────────────────────────────────────────
 *  Maliyet AÇIK PARTİLERİN ağırlıklı ortalamasıdır; FIFO'da hangi partinin
 *  düşeceği kayıt anında belli olur. Rakam "yaklaşık"tır ve metin bunu
 *  söyler — kesin gibi sunmak, kuruş farkında güveni bitirirdi.
 * ============================================================================
 */

export function ZararUyarisi({
  fiyatMetni,
  adet,
  birimMaliyet,
  kdvOrani,
  paraBirimi,
  zemin,
  komisyonOraniMetni,
}: {
  fiyatMetni: string;
  adet: number;
  birimMaliyet: number | null;
  kdvOrani: number;
  paraBirimi: "TRY" | "EUR";
  zemin: SimulasyonZemini | null;
  /** Formda elle değiştirilebilen oran — kayda giden değer BUDUR. */
  komisyonOraniMetni: string;
}) {
  const t = useTranslations("Satis");
  const bicim = useBicim();

  /**
   * ⚠ SESSİZ KALINACAK HALLER — hepsi ayrı sebep, hepsi meşru:
   * fiyat girilmemiş · maliyet bilinmiyor · o kanalın zemini yok.
   * "Hesaplanamadı" diye kutu açmak her kalemde gri bir uyarı çıkarır ve
   * gerçek zarar uyarısı o gürültünün içinde kaybolurdu.
   */
  const fiyat = Number(fiyatMetni.replace(",", "."));
  if (!Number.isFinite(fiyat) || fiyat <= 0) return null;
  if (birimMaliyet === null || zemin === null) return null;

  /**
   * ⚠ ORAN FORMDAKİ DEĞERDEN. Zeminin kayıtlı oranı değil, kullanıcının
   * O AN yazdığı oran kullanılır — kayda giden değer odur. Zeminin oranını
   * kullansaydık, kullanıcı oranı düzelttiği hâlde uyarı eski orana göre
   * konuşurdu.
   */
  const elleOran = Number(komisyonOraniMetni.replace(",", "."));
  const oran =
    Number.isFinite(elleOran) && elleOran > 0 ? elleOran : zemin.tekOran;

  const girdi = {
    hedefFiyat: fiyat,
    adet,
    birimMaliyet,
    kdvOrani,
    paraBirimi,
    dilimler: zemin.dilimler,
    pencereBitis: zemin.pencereBitis,
    tekOran: oran,
    komisyonKdvOrani: zemin.komisyonKdvOrani,
    siparisKesintileri: zemin.siparisKesintileri,
    kargoTarifesi: null,
    bugun: new Date(),
  };

  const s = simulasyonKur(girdi);
  /** NET çözülemiyorsa susulur — beyan kartın "Fiyat dene"sinin işi. */
  if (s.net2 === null || s.net2 >= 0) return null;

  const oneri = zemin.dilimler === null ? null : birAltDilim(zemin.dilimler, fiyat);
  const oneriSonuc =
    oneri === null ? null : simulasyonKur({ ...girdi, hedefFiyat: oneri.hedefFiyat });
  /**
   * ⚠ VARIŞ NOKTASI — "kâra geçer mi" sorusunun cevabı. Yalnız "NET artar"
   * demek, hâlâ zararda olan bir hedefi kurtuluş gibi gösterirdi
   * (19.08.2026 canlı bulgusu).
   */
  const hukum =
    oneriSonuc?.net2 == null ? null : yonHukmu(s.net2, oneriSonuc.net2);

  return (
    <div className={`rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz}`}>
      <p className={`flex flex-wrap items-center gap-1 ${DURUM_YAZISI.olumsuz}`}>
        <TriangleAlert className="size-3.5 shrink-0" />
        {t("zararUyarisi", { net2: bicim.para(Math.abs(s.net2), paraBirimi) })}
      </p>
      {hukum !== null && oneri !== null ? (
        <p className={`text-xs ${DURUM_YAZISI[yonRengi(hukum)]}`}>
          {hukum.tur === "KARA_GECER"
            ? t("zararAltDilimKurtarir", {
                fiyat: bicim.para(oneri.hedefFiyat, paraBirimi),
                oran: oneri.dilim.oran,
                sonuc: bicim.para(hukum.sonuc, paraBirimi),
              })
            : t("zararAltDilimKurtarmaz", {
                fiyat: bicim.para(oneri.hedefFiyat, paraBirimi),
                oran: oneri.dilim.oran,
              })}
        </p>
      ) : null}
      {/* ---------- SINIRA MESAFE ----------
          ⚠ AYNI KURAL KARTTAKİYLE (İlke #10). Zararı kurtaran bir öneri,
          fiyatın yarısını feda ediyorsa bunu SÖYLEMEK zorundayız; yoksa
          "kâra geçer" cümlesi bedelini gizler. */}
      {oneri !== null
        ? (() => {
            const m = mesafeHukmu(fiyat, oneri.hedefFiyat);
            if (m === null) return null;
            const pay = Math.round(m.pay * 100);
            return (
              <p
                className={`text-xs ${m.uzak ? DURUM_YAZISI.uyari : "text-muted-foreground"}`}
              >
                {m.uzak ? t("zararMesafeUzak", { pay }) : t("zararMesafe", { pay })}
              </p>
            );
          })()
        : null}
      <p className="text-muted-foreground text-xs">{t("zararTahmin")}</p>
    </div>
  );
}
