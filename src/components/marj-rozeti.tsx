import { getTranslations } from "next-intl/server";

import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
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
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${DURUM_KUTUSU[renk]} ${DURUM_YAZISI[renk]}`}
    >
      {gosterge.metin}
    </span>
  );
}
