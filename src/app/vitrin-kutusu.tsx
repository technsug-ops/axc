import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Store } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_YAZISI } from "@/lib/renkler";
import { vitrinAdresi, type VitrinSatiri } from "@/lib/vitrin-kutusu";
import type { VitrinKutusu as Veri } from "@/lib/panel/vitrin-verisi";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" KUTUSU (K121③, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: elimizde malı olan ürünler pazaryerinde satılamıyor ve sistem
 *  bunu bilmiyordu. Ölçüldü (TY, 01.09.2026): 23 ürün · ₺249.636,58 — rafta
 *  yatan sermaye + kaçan satış.
 *
 *  ── ⛔ DÖRDÜNCÜ SATIR TOPLAMA GİRMEZ ─────────────────────────────────
 *  "Kanal kaydı yok" bir KUSUR değil BOŞLUKTUR: ürün kanalda olabilir de
 *  olmayabilir de, defter bilmiyor. Ölçüldü — 9 varyantın 4'ü aslında
 *  kanalda VAR. Toplama katılsaydı kutu ₺33.857 fazla gösterirdi ve dördü
 *  haksız yere suçlanırdı. _(Kullanıcı şartı: BILINMIYOR ayrı satır.)_
 *
 *  ── ⚠ SATIRLAR ₺'YE GÖRE SIRALI ──────────────────────────────────────
 *  Sıralama `vitrinKutusunuTopla` içinde yapılıyor; kutu onu bozmaz.
 *  13 ucuz ürün 5 pahalı üründen önce gelmemeli.
 *
 *  ── ⚠ ÖLÇÜM DAMGASI HER ZAMAN GÖRÜNÜR ───────────────────────────────
 *  Hiç ölçülmediyse "—" değil **"henüz karşılaştırılmadı"**. Bir tire,
 *  okuyana "veri yok" mu "sıfır" mı olduğunu söylemez.
 *  ⚠ VE 48 SAATTEN ESKİYSE TURUNCU: bayat bir rakam taze sanılmasın.
 *  Kaçırılan bir gece koşumu ekranda görünür — üçüncü kaçış birinin fark
 *  etmesine kalmaz. _(Anayasa: "kaçışın kendisi görünür kılınır".)_
 * ============================================================================
 */

/** Damganın bayatlama eşiği. Gece koşumu günlük; 48 saat = iki koşum kaçtı. */
const BAYAT_SAAT = 48;

export async function VitrinKutusu({ veri }: { veri: Veri }) {
  const t = await getTranslations("Vitrin");
  const bicim = await bicimlendirici();

  /**
   * ⛔ HESAP YOKSA KUTU HİÇ ÇİZİLMEZ. Boş bir kutu "her şey yolunda" der;
   * oysa ölçülmemiş demektir. _(Anayasa: boş sonuç ile temiz sonuç ayrılır.)_
   */
  if (veri.hesapId === null) return null;

  const bosMu =
    veri.satirlar.length === 0 && veri.kaydiYokAdet === 0;

  const yasSaat =
    veri.olcumAt === null
      ? null
      : (Date.now() - veri.olcumAt.getTime()) / 3_600_000;
  const bayat = yasSaat !== null && yasSaat > BAYAT_SAAT;

  const etiket: Record<VitrinSatiri, string> = {
    LISTELENMEMIS: t("listelenmemis"),
    PASIF: t("pasif"),
    STOK_KAPALI: t("stokKapali"),
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Store className="size-4 shrink-0" />
          {t("baslik")}
          {!bosMu ? (
            <span className="text-muted-foreground text-sm font-normal">
              {t("ozet", {
                adet: veri.toplamAdet,
                tutar: bicim.para(veri.toplamTutar, "TRY"),
              })}
            </span>
          ) : null}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t("notu")}</p>
        {/* ⚠ DAMGA HER ZAMAN GÖRÜNÜR — ölçüm yoksa da. */}
        <p
          className={
            /**
             * ⚠ HAM TAILWIND RENGİ YASAK — `panel:dogrula` yakaladı ve haklıydı.
             * Renk `DURUM_YAZISI.uyari` belirtecinden geliyor; elle yazılan
             * bir ton, karanlık temada ve ileride palet değişince ayrışırdı.
             */
            bayat
              ? `text-sm font-medium ${DURUM_YAZISI.uyari}`
              : "text-muted-foreground text-sm"
          }
        >
          {veri.olcumAt === null
            ? t("hicOlculmedi")
            : t("sonKarsilastirma", { tarih: bicim.tarih(veri.olcumAt) })}
          {bayat ? " · " + t("bayat", { saat: BAYAT_SAAT }) : ""}
        </p>
      </CardHeader>

      <CardContent className="min-w-0 space-y-2">
        {bosMu ? (
          <p className="text-muted-foreground text-sm">{t("bos")}</p>
        ) : null}

        {/* ── SAYIYA GİREN ÜÇ SATIR ── */}
        {veri.satirlar.map((s) => (
          <Link
            key={s.satir}
            href={vitrinAdresi(s.satir)}
            className="hover:bg-muted/50 flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span className="font-medium">{etiket[s.satir]}</span>
            <span className="tabular-nums">
              {t("satirOzeti", {
                adet: s.adet,
                tutar: bicim.para(s.tutar, "TRY"),
              })}
            </span>
          </Link>
        ))}

        {/* ── DÖRDÜNCÜ SATIR — TOPLAMA GİRMEZ ── */}
        {veri.kaydiYokAdet > 0 ? (
          <Link
            href={vitrinAdresi("KAYIT_YOK")}
            className="hover:bg-muted/50 flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">
              {t("kaydiYok")}
              {/* ⚠ "TOPLAMA GİRMEZ" EKRANDA YAZAR — okuyan çıkarmak zorunda
                  kalmasın; yoksa toplam ile satırlar çelişiyor sanılır. */}
              <span className="ml-2 text-xs">{t("toplamaGirmez")}</span>
            </span>
            <span className="text-muted-foreground tabular-nums">
              {t("satirOzeti", {
                adet: veri.kaydiYokAdet,
                tutar: bicim.para(veri.kaydiYokTutar, "TRY"),
              })}
            </span>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
