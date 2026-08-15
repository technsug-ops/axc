import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";

import { GeriBaglanti } from "@/components/baglanti";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { gunMetninden } from "@/lib/donem";
import {
  nakitTakvimiKur,
  TAKVIM_PARA_BIRIMI,
  TAKVIM_PENCERELERI,
  type TakvimPenceresi,
} from "@/lib/panel/nakit-takvimi";
import { gunuDokumle } from "@/lib/panel/takvim-gruplama";
import { takvimBugunu, takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { sayfaIzni } from "@/lib/yetki";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  NAKİT TAKVİMİ — AYRINTI SAYFASI
 * ----------------------------------------------------------------------------
 *  Panelde ÜÇ RAKAM durur (hüküm), döküm burada yaşar. 14.08.2026'da tersi
 *  yapılmıştı ve panel isimsiz rakam duvarına döndü.
 *
 *  İSİMSİZ SATIR TEK TEK YAZILMAZ: adı olmayan kalemler yön+kaynak bazında
 *  toplanıp "N kalem" olarak görünür (bkz. `takvim-gruplama.ts`). Rakam
 *  kaybolmaz, okunabilir olur.
 *
 *  YETKİ: bu bir PARA ekranıdır — `satis.kar.gor`. Operasyon göremez.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("NakitTakvimi");
  return { title: t("sayfaBasligi") };
}

export default async function NakitTakvimiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ takvim?: string }>;
}) {
  await sayfaIzni("satis.kar.gor");

  const p = await searchParams;
  const t = await getTranslations("NakitTakvimi");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const pencere: TakvimPenceresi = p.takvim === "30" ? 30 : 14;
  const bugun = takvimBugunu();
  const takvim = nakitTakvimiKur({
    satirlar: await takvimSatirlariniTopla(bugun),
    bugun,
    pencereGun: pencere,
  });

  const para = (n: number) => bicim.para(n, TAKVIM_PARA_BIRIMI);
  const acikMi = takvim.netPozisyon < 0;
  const doluGunler = takvim.gunler.filter((g) => g.satirlar.length > 0);

  /** Öbek satırının metni: "Hakediş (rapor) · 23 kalem". */
  const obekAdi = (kaynak: string, adet: number) =>
    `${t(`kaynak_${kaynak}`)} · ${t("kalemSayisi", { sayi: adet })}`;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <GeriBaglanti href="/">{ortak("panel")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">
          {t("baslik", { gun: pencere })}
        </h1>
        <p className="text-muted-foreground text-sm">{t("donemBagimsiz")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TAKVIM_PENCERELERI.map((gun) => (
          <Link
            key={gun}
            href={`/nakit-takvimi?takvim=${gun}`}
            className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm md:min-h-9 ${
              gun === pencere
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
          >
            {t("pencereDugmesi", { gun })}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kutu etiket={t("cikacak")} deger={para(takvim.cikacakToplam)} />
        <Kutu etiket={t("girecek")} deger={para(takvim.girecekToplam)} />
        {/* NET POZİSYON — açıkta paletin OLUMSUZ kutusu (sol şerit + pastel
            zemin). Önceden ham `destructive` sınıflarıyla yazılmıştı; renk
            sistemi tek kapıdan geçtiği için burası da paletten besleniyor. */}
        <div
          className={`bg-card flex min-w-0 flex-col gap-1.5 rounded-lg border p-4 ${
            acikMi ? DURUM_KUTUSU.olumsuz : ""
          }`}
        >
          <span className={acikMi ? "text-xs" : "text-muted-foreground text-xs"}>
            {t("netPozisyon")}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {para(takvim.netPozisyon)}
          </span>
          <span className={acikMi ? "text-xs" : "text-muted-foreground text-xs"}>
            {acikMi ? t("acikVar") : t("acikYok")}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t("kartSiniriNotu")}</p>

      {/* --------------------------- GECİKMİŞ --------------------------- */}
      {takvim.gecikmis.length > 0 ? (
        <Card className={`${DURUM_YAZISI.uyari} border-current/40`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" />
              {t("gecikmisBaslik", { sayi: takvim.gecikmis.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dokum
              satirlar={takvim.gecikmis}
              para={para}
              obekAdi={obekAdi}
              tahminEtiketi={t("tahminRozeti")}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------------------- GÜNLER ---------------------------- */}
      {doluGunler.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {t("hareketYok", { gun: pencere })}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {doluGunler.map((g) => {
            const tarih = gunMetninden(g.gun);
            return (
              <Card key={g.gun}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>{tarih ? bicim.tarih(tarih) : g.gun}</span>
                    <span className="text-muted-foreground flex flex-wrap gap-3 text-xs font-normal">
                      {g.cikacak > 0 ? (
                        <span>
                          {t("cikacak")}: {para(g.cikacak)}
                        </span>
                      ) : null}
                      {g.girecek > 0 ? (
                        <span>
                          {t("girecek")}: {para(g.girecek)}
                        </span>
                      ) : null}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Dokum
                    satirlar={g.satirlar}
                    para={para}
                    obekAdi={obekAdi}
                    tahminEtiketi={t("tahminRozeti")}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* --------------------------- VADESİZLER --------------------------- */}
      {takvim.vadesizler.length > 0 ? (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("vadesizBaslik", { sayi: takvim.vadesizler.length })}
            </CardTitle>
            <p className="text-muted-foreground text-xs">{t("vadesizNotu")}</p>
          </CardHeader>
          <CardContent>
            <Dokum
              satirlar={takvim.vadesizler}
              para={para}
              obekAdi={obekAdi}
              tahminEtiketi={t("tahminRozeti")}
              tutarGizle
            />
          </CardContent>
        </Card>
      ) : null}

      {takvim.disaridaKalanlar.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("disaridaNotu", { sayi: takvim.disaridaKalanlar.length })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Rakam kutusu — panelin `IstatistikKutusu`suyla AYNI anatomi: gri etiket
 * üstte, iri rakam altta, beyaz kart zemini. Aynı bilgi iki ekranda iki
 * farklı kutuda görünmesin (İlke #10).
 */
function Kutu({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="bg-card flex min-w-0 flex-col gap-1.5 rounded-lg border p-4">
      <span className="text-muted-foreground text-xs">{etiket}</span>
      <span className="text-2xl font-semibold tabular-nums">{deger}</span>
    </div>
  );
}

/**
 * Adı olanlar tek tek, adsızlar "N kalem" olarak.
 *
 * ── GENİŞLİK SINIRI (İlke #12) ──────────────────────────────────────────
 * Satırlar `max-w-3xl` içinde durur. Sınırsız genişlikte "etiket solda,
 * tutar en sağda" yasak kalıptır: göz aradaki yüzlerce pikseli kat etmek
 * zorunda kalır ve iki satırı karşılaştırmak zorlaşır.
 */
function Dokum({
  satirlar,
  para,
  obekAdi,
  tahminEtiketi,
  tutarGizle,
}: {
  satirlar: Parameters<typeof gunuDokumle>[0];
  para: (n: number) => string;
  obekAdi: (kaynak: string, adet: number) => string;
  tahminEtiketi: string;
  tutarGizle?: boolean;
}) {
  const dokum = gunuDokumle(satirlar);

  /**
   * TUTARI BİLİNMEYEN LİSTE IZGARAYA DÖNER (15.08.2026 düzeltmesi).
   *
   * Ekran görüntüsünde 16 satır vardı ve her satırın en sağında yalnız bir
   * "?" duruyordu; aradaki bütün genişlik boştu. Üstelik "?" hiçbir şey
   * söylemiyordu — başlığın altındaki not zaten "tutarı bilinmiyor" diyor.
   * Aynı şekilde 16 satırın 16'sında da aynı "tahmin" rozeti vardı: bütün
   * satırlarda AYNI olan bir rozet bilgi taşımaz, gürültü olur.
   *
   * Doğrusu kompakt kutucuk ızgarası: kodlar yan yana akar, ekranın
   * tamamı 16 kod için harcanmaz.
   */
  if (tutarGizle) {
    const tumuTahmin = dokum.tekil.every((s) => s.kaynak === "HAKEDIS_TAHMIN");
    return (
      <div className="space-y-2">
        {/* Rozet satır satır tekrarlanmıyor; hepsi aynıysa BİR KEZ yazılıyor. */}
        {tumuTahmin && dokum.tekil.length > 0 ? (
          <Badge variant="outline" className="text-[10px]">
            {tahminEtiketi}
          </Badge>
        ) : null}
        <ul className="flex flex-wrap gap-1.5">
          {dokum.tekil.map((s, i) => (
            <li key={`t-${i}`}>
              <Link
                href={s.adres}
                className="bg-muted/60 hover:bg-muted inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
              >
                <span className="truncate underline underline-offset-2">
                  {s.baslik}
                </span>
                {!tumuTahmin && s.kaynak === "HAKEDIS_TAHMIN" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {tahminEtiketi}
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
          {dokum.obekler.map((o, i) => (
            <li key={`o-${i}`}>
              <Link
                href={o.adres}
                className="bg-muted/60 hover:bg-muted inline-flex items-center rounded-md px-2 py-1 text-xs underline underline-offset-2 transition-colors"
              >
                {obekAdi(o.kaynak, o.adet)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="max-w-3xl space-y-1">
      {dokum.tekil.map((s, i) => (
        <li
          key={`t-${i}`}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Link href={s.adres} className="truncate underline underline-offset-2">
              {s.baslik}
            </Link>
            {s.kaynak === "HAKEDIS_TAHMIN" ? (
              <Badge variant="outline" className="text-[10px]">
                {tahminEtiketi}
              </Badge>
            ) : null}
          </span>
          <Tutar yon={s.yon} tutar={s.tutar} para={para} />
        </li>
      ))}

      {dokum.obekler.map((o, i) => (
        <li
          key={`o-${i}`}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <Link href={o.adres} className="underline underline-offset-2">
            {obekAdi(o.kaynak, o.adet)}
          </Link>
          <Tutar yon={o.yon} tutar={o.tutar} para={para} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Tutar sütunu. "Bilinmiyor" hâli BURADA YOK: tutarı bilinmeyen liste
 * ızgaraya dönüyor ve sütun hiç çizilmiyor. Önceden her satırın sağında
 * yalnız bir "?" duruyordu — başlığın altındaki not zaten aynı şeyi
 * söylüyordu, yani 16 kez tekrarlanan boş bir işaretti.
 */
function Tutar({
  yon,
  tutar,
  para,
}: {
  yon: "CIKACAK" | "GIRECEK";
  tutar: number;
  para: (n: number) => string;
}) {
  const cikis = yon === "CIKACAK";
  return (
    <span
      className={`shrink-0 tabular-nums ${cikis ? "text-destructive" : `${DURUM_YAZISI.olumlu}`}`}
    >
      {cikis ? "−" : "+"}
      {para(tutar)}
    </span>
  );
}
