import { getTranslations } from "next-intl/server";

import { DurumRozeti } from "@/components/durum-rozeti";
import type { GostergeSonucu } from "@/lib/marj-gosterge";

/**
 * ============================================================================
 *  MARJ ROZETİ — KENDİ SÜTUNUNDA, BELİRGİN
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ DÜZELTME (kullanıcı 17.08.2026):
 *
 *  1. ÖNCE NET ROZETİNİN İÇİNDEYDİ ve `opacity-75` ile soluktu — rakamın
 *     yanına sıkışınca okunmuyordu. Artık KENDİ SÜTUNUNDA ve tam opaklıkta.
 *
 *  2. HANGİ ÖLÇÜ OLDUĞU SÜTUN BAŞLIĞINDA yazar ("Ciro marjı" / "Sermaye
 *     verimi"), rozette tekrar etmez. Böylece hücrede yalnız rakam kalır ve
 *     liste aşağı tarandığında göz tek bir sayı sütunu okur.
 *
 *  ── RENK: NET İLE AYNI DİL ──────────────────────────────────────────────
 *  Zarar kırmızı, kâr yeşil — NET rozetiyle aynı palet. İki sütun aynı satır
 *  hakkında aynı hükmü verir; farklı renklendirme "acaba biri diğerini mi
 *  yalanlıyor" sorusunu doğururdu.
 * ============================================================================
 */
export async function MarjRozeti({ gosterge }: { gosterge: GostergeSonucu }) {
  const t = await getTranslations("MarjGosterge");

  /** Gösterge yoksa hücre BOŞ kalır — iptalli satır ya da NET hesaplanamamış. */
  if (gosterge.tur === "YOK") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  /**
   * BİLİNMİYOR "?" İLE — sıfır DEĞİL. Maliyeti bilinmeyen bir satışın
   * sermaye verimi "0" değil, bilinmiyordur (sessiz varsayım yasağı).
   */
  if (gosterge.tur === "BILINMIYOR") {
    return (
      <span
        className="text-muted-foreground font-medium tabular-nums"
        title={t("bilinmiyorIpucu")}
      >
        ?
      </span>
    );
  }

  const renk = gosterge.zararMi ? "olumsuz" : "olumlu";

  /**
   * ⚠ KENDİ ÇİPİMİ YAZMIYORUM (kullanıcı 17.08.2026): ilk denemede
   * `text-sm` ile elle bir rozet çizilmişti ve NET sütunundakinden BÜYÜK
   * duruyordu. `DurumRozeti` zaten sistemin rozet dili — punto (11px),
   * dolgu ve zemin oradan gelir. Aynı işi iki yerde çizmek, ikisinin bir
   * gün ayrışması demekti.
   *
   * SABİT TABAN GENİŞLİK: "%5" ile "%61" farklı yer kaplıyordu ve sütun
   * aşağı doğru tarandığında çipler kayıyordu. Taban genişlik en uzun
   * makul değere göre; kısa değer ortalanır, çip aynı boyutta kalır.
   */
  return (
    <DurumRozeti durum={renk} isaretsiz>
      <span className="inline-block min-w-[2.5rem] text-center tabular-nums">
        {gosterge.metin}
      </span>
    </DurumRozeti>
  );
}
