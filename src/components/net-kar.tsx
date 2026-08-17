import { getTranslations } from "next-intl/server";

import { DurumRozeti } from "@/components/durum-rozeti";
import { bicimlendirici } from "@/lib/bicim";
import { karDurumu } from "@/lib/renkler";

import type { Currency, ProfitStatus } from "@/generated/prisma/enums";
import type { GostergeSonucu } from "@/lib/marj-gosterge";

/**
 * ============================================================================
 *  NET KÂR GÖSTERİMİ — LİSTE VE DETAY ORTAK
 * ----------------------------------------------------------------------------
 *  Hesaplanamayan kâr BOŞ ya da SIFIR gösterilmez; NEDENİ kısa bir rozetle
 *  yazılır (Kullanıcı Kolaylığı #5 — sessiz başarısızlık yasak). Böylece
 *  listede "0,00" görüp "bu satış kârsız mı?" diye düşünmek imkânsız olur.
 * ============================================================================
 */
export async function NetKar({
  tutar,
  paraBirimi,
  durum,
  gosterge,
}: {
  tutar: { toString(): string } | null;
  paraBirimi: Currency | null;
  durum: ProfitStatus | null;
  /**
   * MARJ GÖSTERGESİ — rakamın YANINDA, aynı çipte (kullanıcı isteği
   * 17.08.2026). Hesap çağıran tarafta (`lib/marj-gosterge.ts`); bu bileşen
   * yalnız çizer. Verilmezse gösterge çıkmaz — eski çağrılar bozulmaz.
   */
  gosterge?: GostergeSonucu;
}) {
  const t = await getTranslations("Satis");
  const bicim = await bicimlendirici();

  // Hiç hesaplanmamış (eski kayıt veya kâr yazılmadan oluşmuş).
  if (durum === null) {
    return (
      <span className="text-muted-foreground text-xs">
        {t("karHesaplanmadi")}
      </span>
    );
  }

  if (durum !== "CALCULATED" || tutar === null) {
    const kisa =
      durum === "NO_COST"
        ? t("durumKisaNoCost")
        : durum === "CURRENCY_MISMATCH"
          ? t("durumKisaCurrency")
          : t("durumKisaRule");
    // Hesaplanamayan kâr UYARI'dır: eksik bir şey var, ele alınmalı.
    return <DurumRozeti durum="uyari">{kisa}</DurumRozeti>;
  }

  const sayi = Number(tutar.toString());
  const renk = karDurumu(sayi);

  /**
   * RAKAM VE KELİME TEK PARÇA, PASTEL ZEMİN ÜSTÜNDE (15.08.2026 düzeltmesi).
   *
   * İlk denemede rakam yalnız KOYU YAZI ile renklendirilmişti ve kullanıcı
   * "inanılmaz zayıf bir renk uygulaması" dedi — haklıydı: paletin koyu
   * yeşili 13 px'te siyahtan ayırt edilmiyor. Spesifikasyonun kendisi
   * "pastel ZEMİN + koyu rakam" diyordu; zemini atlayınca renk kayboluyor.
   *
   * Rakam ile kelime AYNI çip içinde: iki ayrı öğe gibi durunca göz ikisini
   * ilişkilendirmiyordu. Sıfırda çip YOK — nötr, ne müjde ne alarm.
   */
  if (renk === "notr") {
    return (
      <span className="font-medium tabular-nums">
        {bicim.para(sayi, paraBirimi ?? "TRY")}
        {gosterge && gosterge.tur === "DEGER" ? (
          <span className="text-muted-foreground ml-1">{gosterge.metin}</span>
        ) : null}
      </span>
    );
  }

  return (
    <DurumRozeti durum={renk} isaretsiz>
      <span className="font-semibold tabular-nums">
        {bicim.para(sayi, paraBirimi ?? "TRY")}
      </span>
      {/* ÖLÇÜ RAKAMIN YANINDA: "₺881,22 · %61". İki yüzde yan yana
          gelmesin diye tek ölçü gösterilir (bkz. lib/marj-gosterge.ts). */}
      {gosterge && gosterge.tur !== "YOK" ? (
        <span className="opacity-75 tabular-nums">
          {gosterge.tur === "BILINMIYOR" ? "?" : gosterge.metin}
        </span>
      ) : (
        <span className="opacity-75">
          {renk === "olumlu" ? t("karda") : t("zararda")}
        </span>
      )}
    </DurumRozeti>
  );
}
