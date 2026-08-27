"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { okutulmayanlariCevapla } from "./sayim-actions";
import { sayimFarkiniYaz } from "./sayim-yazim-actions";

/**
 * ============================================================================
 *  SAYIM KAPANIŞI (K57 ②) — HÜKÜM EKRANI
 * ----------------------------------------------------------------------------
 *  ⛔ TEK BİR "FARK" TABLOSU YOK ve olmayacak. 3 eksik + 3 fazla net sıfır
 *  eder ve "her şey yolunda" der; oysa ortada bir SATIŞ ve bir ALIM kaydı
 *  eksiktir, ikisi de para taşır ve ikisi ayrı iş açar.
 *
 *  ⛔ BEŞ SAYI — dördü kapsam ölçüsü, beşincisi AYRI:
 *    kapsam · sayıldı · sapan · SAYILMADI   +   belirsiz
 *  `belirsiz` dörtlüye KARIŞMAZ: o bir kapsam eksikliği değil, HÜKÜM
 *  verilemeyen bir satır.
 *
 *  ⛔ FAZLADA BELGE YOLU ÜSTTE — ve bu bir tavsiye değil, SIRA KURALI:
 *  önce fark yazılıp sonra fatura girilirse stok İKİ KEZ artar. Ölçüldü:
 *  elle girilen alımların ortanca gecikmesi **31 gün** (p75 82), yani
 *  çıkacak fazlanın büyük kısmı "maliyeti bilinmeyen mal" değil, faturası
 *  daha girilmemiş alım.
 * ============================================================================
 */

type Satir = {
  variantId: string;
  sku: string;
  urunAdi: string;
  sayilanAdet: number | null;
  sistemAdedi: number;
  fark: number;
  belirsiz: boolean;
  kilitli: boolean;
  yenidenAcildi: boolean;
  kapsamDisi: boolean;
  hareketsizSatis: number;
};

export function SayimKapanis({
  sayimId,
  kod,
  ozet,
  belirsiz,
  bosKapandi,
  fazla,
  eksik,
  okutulmayanlar,
  yazildiMi,
}: {
  sayimId: string;
  kod: string;
  ozet: { kapsam: number; sayildi: number; sapan: number; sayilmadi: number };
  belirsiz: number;
  bosKapandi: boolean;
  fazla: Satir[];
  eksik: Satir[];
  okutulmayanlar: { variantId: string; sku: string; urunAdi: string }[];
  yazildiMi: boolean;
}) {
  const t = useTranslations("Sayim");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [maliyetler, setMaliyetler] = useState<Record<string, string>>({});

  const hataMetni = (k: string) =>
    k === "STOK_YETMIYOR"
      ? t("hataStokYetmiyor")
      : k === "ZATEN_YAZILDI"
        ? t("hataZatenYazildi")
        : k === "YAZILAMAZ"
          ? t("hataYazilamaz")
          : k === "NEDEN_YOK"
            ? t("hataNedenYok")
            : t("hataYazilamadi");

  const yaz = (s: Satir, maliyet: number | null) => {
    setMesaj(null);
    basla(async () => {
      const sonuc = await sayimFarkiniYaz(sayimId, s.variantId, maliyet);
      if (sonuc.hata) {
        setMesaj(hataMetni(sonuc.hata));
        return;
      }
      router.refresh();
    });
  };

  /** ⛔ VARSAYILAN YOK: kullanıcı AÇIKÇA seçmeden ilerlenmez. */
  const okutulmayanCevap = (karar: "sifirla" | "dokunma") => {
    setMesaj(null);
    basla(async () => {
      await okutulmayanlariCevapla(
        sayimId,
        okutulmayanlar.map((o) => o.variantId),
        karar,
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-xs">{t("kodEtiketi", { kod })}</p>

      {bosKapandi ? (
        <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>
          {t("bosKapandi")}
        </div>
      ) : null}

      {/* ═══ BEŞ SAYI — dördü kapsam, beşincisi AYRI ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/*
          ⛔ ETİKETLER SABİT ÇAĞRIYLA — anahtar çalışma anında birleştirilirse
          `i18n:kontrol` onu göremez ve eksik anahtar ancak kullanıcının
          karşısında patlar. (Aynı gerekçe `stok/duzeltme-actions`ta da var.)
        */}
        {(
          [
            [t("sayi_kapsam"), ozet.kapsam],
            [t("sayi_sayildi"), ozet.sayildi],
            [t("sayi_sapan"), ozet.sapan],
            [t("sayi_sayilmadi"), ozet.sayilmadi],
          ] as const
        ).map(([etiket, deger]) => (
          <div key={etiket} className="rounded-lg border p-3">
            <div className="text-xl font-semibold tabular-nums">{deger}</div>
            <div className="text-muted-foreground text-xs">{etiket}</div>
          </div>
        ))}
      </div>
      {/* ⛔ BEŞİNCİ SAYI DÖRTLÜNÜN DIŞINDA — kapsam ölçüsü değil. */}
      {belirsiz > 0 ? (
        <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          {t("belirsizSayisi", { sayi: belirsiz })}
        </div>
      ) : null}

      {mesaj ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{mesaj}</p> : null}

      {/* ═══ ① OKUTULMAYANLAR — VARSAYILAN YOK ═══ */}
      {okutulmayanlar.length > 0 ? (
        <section className={`space-y-3 rounded-lg border p-4 ${DURUM_KUTUSU.uyari}`}>
          <h3 className="font-medium">
            {t("okutulmayanBaslik", { sayi: okutulmayanlar.length })}
          </h3>
          <p className="text-sm">{t("okutulmayanAciklama")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={bekliyor}
              onClick={() => okutulmayanCevap("sifirla")}
            >
              {t("okutulmayanSifirla")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={bekliyor}
              onClick={() => okutulmayanCevap("dokunma")}
            >
              {t("okutulmayanDokunma")}
            </Button>
          </div>
        </section>
      ) : null}

      {/* ═══ ② EKSİK — AYRI liste ═══ */}
      <section className="space-y-2">
        <h3 className="font-medium">{t("eksikBaslik", { sayi: eksik.length })}</h3>
        <p className="text-muted-foreground text-sm">{t("eksikAciklama")}</p>
        {/* ⛔ ASİMETRİ YAZILI — tavsiye satırı, KAPI DEĞİL. */}
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>{t("suphedeIseniz")}</p>
        {eksik.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("kovaBos")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {eksik.map((s) => (
              <li key={s.variantId} className="space-y-2 p-3">
                <SatirBasligi s={s} t={t} />
                {/* ⛔ ÜÇÜNCÜ BİLGİ — N=0 ise SATIR ÇİZİLMEZ (boş uyarı gürültüdür). */}
                {s.hareketsizSatis > 0 ? (
                  <p className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari}`}>
                    {t("hareketsizSatisUyarisi", { sayi: s.hareketsizSatis })}
                  </p>
                ) : null}
                {s.kilitli ? (
                  <KilitliNot s={s} t={t} />
                ) : s.belirsiz ? (
                  <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("belirsizNot")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-11" disabled>
                      {t("yolBelgeGirEksik")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11"
                      disabled={bekliyor || yazildiMi}
                      onClick={() => yaz(s, null)}
                    >
                      {t("yolFifodanDus")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ═══ ③ FAZLA — AYRI liste, BELGE YOLU ÜSTTE ═══ */}
      <section className="space-y-2">
        <h3 className="font-medium">{t("fazlaBaslik", { sayi: fazla.length })}</h3>
        <p className="text-muted-foreground text-sm">{t("fazlaAciklama")}</p>
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>{t("fazlaSiraKurali")}</p>
        {fazla.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("kovaBos")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {fazla.map((s) => (
              <li key={s.variantId} className="space-y-2 p-3">
                <SatirBasligi s={s} t={t} />
                {s.kilitli ? (
                  <KilitliNot s={s} t={t} />
                ) : s.belirsiz ? (
                  <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("belirsizNot")}</p>
                ) : (
                  <div className="space-y-2">
                    {/* ⛔ İLK YOL: BELGE. Sıra kuralı — çift sayım olmasın. */}
                    <Button type="button" variant="outline" className="h-11 w-full" disabled>
                      {t("yolBelgeGirFazla")}
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        className="h-11 w-36"
                        placeholder={t("maliyetYerTutucu")}
                        value={maliyetler[s.variantId] ?? ""}
                        onChange={(e) =>
                          setMaliyetler((m) => ({ ...m, [s.variantId]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11"
                        disabled={bekliyor || yazildiMi || !(maliyetler[s.variantId] ?? "").trim()}
                        onClick={() => yaz(s, Number(maliyetler[s.variantId]))}
                      >
                        {t("yolMaliyetleYaz")}
                      </Button>
                    </div>
                    {/* ⛔ EN SON: maliyeti bilinmeyen parti. Sıfır VARSAYILMAZ. */}
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11"
                      disabled={bekliyor || yazildiMi}
                      onClick={() => yaz(s, null)}
                    >
                      {t("yolMaliyetsizYaz")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-muted-foreground text-xs">{t("gercekNetNotu")}</p>
      <p className="text-muted-foreground text-xs">{ortak("kayitSayisi", { sayi: ozet.sapan })}</p>
    </div>
  );
}

function SatirBasligi({
  s,
  t,
}: {
  s: Satir;
  t: ReturnType<typeof useTranslations<"Sayim">>;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{s.urunAdi}</p>
      <p className="text-muted-foreground truncate font-mono text-xs">
        {s.sku}
        {s.kapsamDisi ? " · " + t("kapsamDisiRozet") : ""}
      </p>
      {/*
        ⛔ CÜMLE DEFTERİN TARAFINDAN KURULUR: "sistem 2 fazla gösteriyor",
        asla "sayımda 2 eksik". İkinci cümle sayımı sanık yapar; oysa
        RAF GERÇEK, DEFTER İDDİADIR.
      */}
      <p className="mt-1 text-sm">
        {s.fark < 0
          ? t("sistemFazlaGosteriyor", {
              sistem: s.sistemAdedi,
              raf: s.sayilanAdet ?? 0,
              adet: Math.abs(s.fark),
            })
          : t("sistemAzGosteriyor", {
              sistem: s.sistemAdedi,
              raf: s.sayilanAdet ?? 0,
              adet: s.fark,
            })}
      </p>
    </div>
  );
}

function KilitliNot({
  s,
  t,
}: {
  s: Satir;
  t: ReturnType<typeof useTranslations<"Sayim">>;
}) {
  return (
    <p className={`flex items-center gap-2 text-xs ${DURUM_YAZISI.notr}`}>
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {s.yenidenAcildi ? t("yenidenAcildiNot") : t("kilitliNot")}
      {s.yenidenAcildi ? (
        <TriangleAlert className={`size-3.5 shrink-0 ${DURUM_YAZISI.uyari}`} aria-hidden />
      ) : null}
    </p>
  );
}
