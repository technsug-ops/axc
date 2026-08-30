import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Warehouse } from "lucide-react";

import { DepoFormu } from "@/app/ayarlar/depo/depo-formu";
import { kodSablonaUyuyorMu } from "@/lib/depo/sablon";
import { prisma } from "@/lib/prisma";
import { DURUM_YAZISI } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  DEPO KURULUMU (K50 ①)
 * ----------------------------------------------------------------------------
 *  ⚠ ŞEMA DEĞİŞMEDİ — VE NİYE GEREKMEDİĞİ ÖLÇÜLDÜ. Bölüm/ünite/göz yapısı
 *  SAKLANMIYOR çünkü üretilen kodun kendisi (`RAF-SLN1-3`) o yapıyı zaten
 *  taşıyor. Ayrı bir "depo düzeni" tablosu, aynı gerçeği iki yere yazmak ve
 *  birinin gün gelip ötekinden ayrışmasını beklemek olurdu.
 *
 *  Bu yüzden ekran bir KAYIT ekranı değil, bir ÜRETEÇ: düzeni tarif
 *  edersiniz, kodları üretir, onaylarsanız raflar açılır.
 *
 *  ⚠ İZİN `ayar.yaz` — raf konumları ekranıyla aynı; yeni izin açılmadı.
 * ============================================================================
 */
export default async function DepoSayfasi() {
  await sayfaIzni("ayar.yaz");

  const t = await getTranslations("Depo");

  const konumlar = await prisma.location.findMany({
    select: { code: true, bolumId: true },
    orderBy: { code: "asc" },
  });
  const uymayan = konumlar.filter((k) => !kodSablonaUyuyorMu(k.code));

  /**
   * ⭐ İKİ HÂL BİR ARADA DURUYOR — VE EKRAN BUNU SÖYLÜYOR.
   *
   * `DepoBolumu` 30.08.2026'da açıldı; yeni kurulan raflar bölüme KİMLİKLE
   * bağlanıyor. Mevcut 41 rafın `bolumId`si BOŞ ve bu bilinçli — göç
   * onaylanana kadar onlara dokunulmuyor (K50: "onaysız tek ad değişmez").
   *
   * ⚠ SÖYLENMESEYDİ KARIŞIRDI: iki hâl aynı listede yan yana duruyor.
   * Ekran ayırmazsa bakan kişi ya "bölüm neden bazılarında yok" diye arar,
   * ya da daha kötüsü hepsinin bağlı olduğunu sanır.
   * _(Anayasa: "bir sayı etiketiyle taşınır" — etiket burada KAPSAM.)_
   */
  const bolumluRaf = konumlar.filter((k) => k.bolumId !== null).length;
  const bolumsuzRaf = konumlar.length - bolumluRaf;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Warehouse className="text-muted-foreground size-5" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>

      <DepoFormu />

      {/*
        MEVCUT DURUM — ŞABLONA UYMAYANLAR SESSİZ KALMAZ.

        ⚠ AMA "DÜZELT" DENMİYOR. Bu raflar bugün çalışıyor, üstlerinde ürün
        var ve etiketleri basılmış olabilir. Göç ancak ölçüldükten ve
        ONAYLANDIKTAN sonra yapılır (K50 ⑦) — ekran yalnız SAYIYOR.
      */}
      <section className="max-w-3xl space-y-2">
        <h2 className="text-sm font-medium">{t("mevcutBaslik")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="bg-muted/40 rounded-md px-2.5 py-2">
            <p className="text-muted-foreground text-xs">{t("tanimliRaf")}</p>
            <p className="text-base font-semibold tabular-nums">{konumlar.length}</p>
          </div>
          <div className="bg-muted/40 rounded-md px-2.5 py-2">
            <p className="text-muted-foreground text-xs">{t("sablonaUyan")}</p>
            <p className="text-base font-semibold tabular-nums">
              {konumlar.length - uymayan.length}
            </p>
          </div>
          <div className="bg-muted/40 rounded-md px-2.5 py-2">
            <p className="text-muted-foreground text-xs">{t("sablonaUymayan")}</p>
            <p className="text-base font-semibold tabular-nums">{uymayan.length}</p>
          </div>
          {/*
            ⭐ BÖLÜME BAĞLI / BAĞLI DEĞİL — iki hâl AYRI kutuda.
            Tek sayıya indirilseydi hangi rafların bölümü olduğu görünmez,
            göçün ne kadar ilerlediği de ölçülemezdi.
          */}
          <div className="bg-muted/40 rounded-md px-2.5 py-2">
            <p className="text-muted-foreground text-xs">{t("bolumeBagli")}</p>
            <p className="text-base font-semibold tabular-nums">{bolumluRaf}</p>
          </div>
          <div className="bg-muted/40 rounded-md px-2.5 py-2">
            <p className="text-muted-foreground text-xs">{t("bolumsuz")}</p>
            <p className="text-base font-semibold tabular-nums">{bolumsuzRaf}</p>
          </div>
        </div>
        {/*
          ⚠ SIFIRSA HİÇ ÇIKMAZ — sönmeyen bir not okunmaz olur ve
          yanındaki gerçek uyarıların güvenini götürür.
        */}
        {bolumsuzRaf > 0 ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {t("bolumsuzNotu", { adet: bolumsuzRaf })}
          </p>
        ) : null}

        {uymayan.length > 0 ? (
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
            {t("uymayanNotu", { adet: uymayan.length })}
          </p>
        ) : null}

        <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/ayarlar/konumlar" className="underline underline-offset-4">
            {t("konumlaraGit")}
          </Link>
          {/*
            ⚠ GÖÇ MENÜYE AYRI SATIR OLARAK EKLENMEDİ: bir KERELİK iştir,
            kalıcı bir menü satırı hak etmiyor. Buradan girilir — ve yalnız
            şablona uymayan raf VARSA anlamlı, o yüzden koşullu.
          */}
          {uymayan.length > 0 ? (
            <Link href="/ayarlar/depo/goc" className="underline underline-offset-4">
              {t("goceGit", { adet: uymayan.length })}
            </Link>
          ) : null}
        </p>
      </section>
    </div>
  );
}
