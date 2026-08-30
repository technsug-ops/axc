import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Warehouse } from "lucide-react";

import { DepoFormu } from "@/app/ayarlar/depo/depo-formu";
import {
  KOVA_KODU,
  kodSablonaUyuyorMu,
  yeriBilinmeyenOzeti,
} from "@/lib/depo/sablon";
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

  /**
   * ═══ YERİ BİLİNMEYEN ÜRÜNLER — TUTANAK (K50 ③) ═════════════════════════
   *
   * ⛔ CANLI 30.08.2026: aktif 1103 varyantın 969'u `DEPO` kovasında, 1'i
   * hiç konumsuz. Yani katalogun yaklaşık **%88'inin rafı bilinmiyor** ve
   * bu bugüne kadar HİÇBİR EKRANDA yazmıyordu — `DEPO` öteki 41 rafla aynı
   * görünüyor, bakan kişi yerin BİLİNDİĞİNİ sanıyordu.
   *
   * ⭐ SAYI CANLI ÖLÇÜLÜR, SABİT YAZILMAZ (kullanıcı şartı). `/yerlestir`
   * ile raflara koydukça kendiliğinden azalır; sabit bir "969" yazsaydık
   * ilerleme görünmez ve tutanak ilk yerleştirmede YALAN söylerdi.
   *
   * ⚠ VE BU BİR GÖREV DEĞİL, TUTANAK: 969 maddelik bir uyarı kutusu
   * kapatılamaz görünür ve kutunun tamamına olan güveni eritirdi (K49).
   * Burada duruyor çünkü depo düzenini kuran kişi tam burada.
   */
  const kova = await prisma.location.findFirst({
    where: { code: KOVA_KODU },
    select: { id: true },
  });
  const [aktifVaryant, kovadaki, konumsuzVaryant] = await Promise.all([
    prisma.productVariant.count({ where: { isActive: true } }),
    /**
     * ⚠ KOVA YOKSA 0 — ve bu bir HÜKÜM değil. Kova hiç kurulmamış bir
     * depoda "yeri bilinmeyen yok" demek yanlış olmaz: o ürünler gerçek
     * raflarda duruyordur. Uydurma bir sayı yazmaktan iyidir.
     */
    kova
      ? prisma.productVariant.count({
          where: { isActive: true, locationId: kova.id },
        })
      : Promise.resolve(0),
    prisma.productVariant.count({
      where: { isActive: true, locationId: null },
    }),
  ]);
  const yerSiz = yeriBilinmeyenOzeti(kovadaki, konumsuzVaryant, aktifVaryant);

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

        {/*
          ═══ TUTANAK — YERİ BİLİNMEYEN ÜRÜNLER ═══════════════════════════
          ⚠ GÖREV DEĞİL, KAYIT. Bugün 970 madde; uyarı kutusuna konsaydı
          kapatılamaz görünür ve kutunun tamamına olan güveni eritirdi (K49).

          ⭐ SAYI CANLI: yerleştirdikçe kendiliğinden azalır.
          ⚠ SIFIRSA HİÇ ÇIKMAZ — sönmeyen bir tutanak okunmaz olur.
        */}
        {yerSiz.bilinmeyen > 0 ? (
          <div className="mt-2 rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">
              {t("yeriBilinmeyen", {
                adet: yerSiz.bilinmeyen,
                yuzde: yerSiz.yuzde,
              })}
            </p>
            {/*
              ⚠ BİLEŞİM DE YAZAR: kovada duran ürün YERLEŞTİRİLİR, konumsuz
              ürün bir VERİ EKSİĞİDİR ve düzeltilir. Tek rakama indirilseydi
              bugünkü tek konumsuz kayıt kimsenin bakmadığı yerde kalırdı.
              _(Anayasa: "bir sayı etiketiyle taşınır".)_
            */}
            <p className="text-muted-foreground mt-1 text-xs">
              {t("yeriBilinmeyenBilesim", {
                kova: KOVA_KODU,
                kovada: yerSiz.kovada,
                konumsuz: yerSiz.konumsuz,
              })}
            </p>
          </div>
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
