"use client";

import { Check, TriangleAlert } from "lucide-react";
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
 *  KÂR DURUMU — FORM İÇİ (zarar kırmızı, kâr yeşil)
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
 *  ── SESSİZLİK DE BİR CEVAPTIR, AMA YANLIŞ CEVAP ─────────────────────────
 *  ⚠ Halil önerisi 20.08.2026. Önce yalnız ZARAR konuşuyordu; kâr
 *  durumunda ekran sessizdi ve sessizlik "hesap çalışıyor mu?" tereddüdü
 *  yaratıyordu. Artık her iki hâlde de bir satır var: kırmızı kutu ya da
 *  sade yeşil onay.
 *
 *  ⚠ YEŞİL SATIR DİLİM/YÖN MANTIĞINA GİRMEZ. "Daha da iyileştir" önerisi
 *  K5'in işi (kârlılık kartı); burada tek iş, formun hesabı yaptığını ve
 *  sonucun artıda olduğunu SÖYLEMEK. Yeşil satıra öneri eklemek, satış
 *  girerken fiyat optimizasyonu yaptırmak olurdu.
 *
 *  ── CÜMLE KENDİ İDDİASINI RAKAMLA KANITLAR ──────────────────────────────
 *  ⚠ Mimar düzeltmesi 20.08.2026. Kutu "tahmini: maliyet açık partilerin
 *  ORTALAMASI" diyordu — bu MEKANİZMAYI anlatıyor, RAKAMI vermiyordu.
 *  Kelime vardı, sayı yoktu; kullanıcı "hangi maliyete göre zarar?"
 *  sorusunu soramadan kutuya bakıyordu.
 *
 *  Artık iki dayanak rakamı cümlenin içinde: birim maliyet ve birim satış
 *  fiyatı. NET-2'nin nereden çıktığı, kutuya bakan kişi için görünür.
 *  _("Metin, sahip olmadığı anlamı iddia etmez" kuralının tersi hâli:
 *  iddiayı taşıyan cümle, dayanağını da taşımalı.)_
 *
 *  ⚠ RAKAMLAR BİRİM BAZINDA. Adet 2 iken toplam maliyeti birim satış
 *  fiyatının yanına koymak, iki farklı ölçeği yan yana yazmak olurdu.
 *
 *  ── TAHMİN OLDUĞU YAZILI ────────────────────────────────────────────────
 *  Maliyet AÇIK PARTİLERİN ağırlıklı ortalamasıdır; FIFO'da hangi partinin
 *  düşeceği kayıt anında belli olur. Rakam "yaklaşık"tır ve metin bunu
 *  söyler — kesin gibi sunmak, kuruş farkında güveni bitirirdi.
 * ============================================================================
 */

export function KarDurumu({
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
  if (s.net2 === null) return null;

  /**
   * ⚠ KÂR HÂLİ — SADE YEŞİL SATIR, KUTU DEĞİL.
   * Kırmızının simetriği ama aynı ağırlıkta değil: zarar bir EYLEM
   * çağrısı, kâr yalnız bir onaydır. Aynı boyutta kutu yapsaydık iyi
   * haber kötü haberle aynı dikkati çeker ve kırmızı sıradanlaşırdı.
   *
   * ⚠ TAM SIFIR YEŞİL DEĞİL: başabaş ne kâr ne zarar (aynı gün verilen
   * "sıfır kâr sayılmaz" kararı, üçüncü ekranda da aynı davranıyor).
   */
  if (s.net2 > 0) {
    return (
      <p className={`flex flex-wrap items-center gap-1 text-sm ${DURUM_YAZISI.olumlu}`}>
        <Check className="size-3.5 shrink-0" />
        {t("karDurumu", {
          net2: bicim.para(s.net2, paraBirimi),
          maliyet: bicim.para(birimMaliyet, paraBirimi),
          satis: bicim.para(fiyat, paraBirimi),
        })}
      </p>
    );
  }
  if (s.net2 === 0) {
    return (
      <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {t("karBasabas")}
      </p>
    );
  }

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
        {t("zararUyarisi", {
          net2: bicim.para(Math.abs(s.net2), paraBirimi),
          maliyet: bicim.para(birimMaliyet, paraBirimi),
          satis: bicim.para(fiyat, paraBirimi),
        })}
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
      {/* ---------- ÖNERİ NİYE YOK — SESSİZ KALINMAZ ----------
          ⚠ CANLI BULGU 19.08.2026: kırmızı zarar kutusu çıkıyor ama alt
          dilim satırı çıkmıyordu ve sebebi HİÇBİR YERDE yazmıyordu;
          "motor yarım bağlanmış" görünüyordu.

          Ölçüm: stoklu 121 varyant×kanal zemininin **86'sında dilim
          verisi YOK** — Hepsiburada ve N11'de hiç tarife yüklenmedi
          (0/54 ve 0/13), yalnız Trendyol'un 35 zemininde dilim var.
          Yani öneri yokluğu bir kusur değil, VERİ yokluğuydu.

          Kart ekranı bunu zaten beyan ediyordu (`beyanDilimYok`); form
          etmiyordu. Aynı bilgi iki ekranda aynı davranmalı (İlke #10). */}
      {oneri === null ? (
        <p className="text-muted-foreground text-xs">
          {zemin.dilimler === null || zemin.dilimler.length === 0
            ? t("zararDilimYok")
            : t("zararEnAltDilim")}
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
