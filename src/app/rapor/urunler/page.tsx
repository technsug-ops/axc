/**
 * SUTUN TAVANI ISTISNASI: 9 — kaynakta 9 <TableHead> var ama EKRANDA EN COK 6
 * cizilir: sutunlar iki DISLAYAN dala bolunmus (stok ekseni 1+3, satis ekseni
 * 1+5) ve ikisi ayni anda cizilmez. Bekci statik saydigi icin toplami goruyor;
 * olcut eskimis degil, dallanmayi goremiyor. Gercek tavan 6 < 7.
 * K43 · gercek cihazda bakilacak 02.09.2026.
 */
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { ListeToplami } from "@/components/liste-toplami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import {
  PENCERE_TURLERI,
  PencereHatasi,
  pencereOlustur,
  type Pencere,
  type PencereTuru,
} from "@/lib/donem";
import { marjYuzdesi } from "@/lib/panel-listeler";
import {
  ANALIZ_EKSENLERI,
  analizAdresi,
  analizToplami,
  coklucoz,
  eksenCoz,
  kovaCoz,
  sayiCoz,
  satirSayisiCoz,
  sirala,
  siralamaCoz,
  suzgectenGecir,
  yonCoz,
  type AnalizEkseni,
  type AnalizSatiri,
  type AnalizSuzgeci,
} from "@/lib/rapor/urun-analizi";
import {
  satisEkseniVerisi,
  stokEkseniVerisi,
} from "@/lib/rapor/urun-analizi-verisi";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";

import { AnalizSuzgeci as SuzgecCubugu } from "./analiz-suzgeci";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ — TAM LİSTE
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 02.09.2026: panelin dört ekseni bir HÜKÜM veriyordu ama
 *  DÖKÜMÜ yoktu — _"kârının %70,5'i 39 üründen geliyor, burası çok önemli bir
 *  veri, süzülebilir ve listelenebilir olmalı."_
 *
 *  ⛔ PANEL BU SAYFANIN YERİNE GEÇMEZ, BU SAYFA DA PANELİN. Panel bir HÜKÜM
 *  yeridir ve orada döküm olmaz (İlke #13); döküm buraya gelir, panelde
 *  rakam + "aç" bağlantısı kalır (İlke #16).
 *
 *  ── ⚠ KÂR RAKAMLARI SNAPSHOT'TAN OKUNUR ─────────────────────────────────
 *  Burada hiçbir kâr YENİDEN HESAPLANMAZ; panelin ve raporun ilkesi aynı.
 *  Hesaplanamamış kalem NET toplamına GİRMEZ ve kaç tane olduğu EKRANDA
 *  YAZAR — sıfır sayılsaydı marj olduğundan düşük görünürdü.
 *
 *  ── ⚠ TOPLAM SÜZGECİN, SAYFANIN DEĞİL (İlke #15) ────────────────────────
 *  Satır tavanı yalnız GÖRÜNÜRLÜĞÜ kısar. `analizToplami` her zaman SÜZÜLMÜŞ
 *  kümenin TAMAMINI alır; tavana düşürülmüş liste verilseydi rakam hiçbir
 *  hata vermeden yanlış olurdu.
 * ============================================================================
 */

export async function generateMetadata() {
  const t = await getTranslations("UrunAnalizi");
  return { title: t("baslik") };
}

export default async function UrunAnaliziSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    eksen?: string;
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    kanal?: string;
    para?: string;
    /** Tekrarlı parametre — tarayıcı onay kutularından böyle gönderir. */
    marka?: string | string[];
    kategori?: string | string[];
    minAdet?: string;
    minCiro?: string;
    kova?: string;
    sirala?: string;
    yon?: string;
    satir?: string;
  }>;
}) {
  await sayfaIzni("rapor.gor");

  const p = await searchParams;
  const t = await getTranslations("UrunAnalizi");
  const tOrtak = await getTranslations("Ortak");
  /** Pencere hata metinleri `Rapor` ad alanında yaşıyor — ikinci
   *  bir kopya açmak, aynı cümlenin iki yerde ayrışmasını üretirdi. */
  const tRapor = await getTranslations("Rapor");
  const bicim = await bicimlendirici();

  /**
   * ⚠ KÂR İZNİ AYRI SORULUR. `rapor.gor` ile `satis.kar.gor` AYNI ŞEY
   * DEĞİL: raporu görüp kâr göremeyen bir rol tanımlanabilir. Panelde de
   * böyle ve taşınırken korunuyor.
   */
  const karGorunur = await izinVarMi("satis.kar.gor");

  const eksen = eksenCoz(p.eksen);
  const sira = siralamaCoz(p.sirala, eksen);
  const yon = yonCoz(p.yon);
  const satirSayisi = satirSayisiCoz(p.satir);
  const suzgec: AnalizSuzgeci = {
    markalar: coklucoz(p.marka),
    kategoriler: coklucoz(p.kategori),
    minAdet: sayiCoz(p.minAdet),
    minCiro: sayiCoz(p.minCiro),
    /** ⚠ Kova YALNIZ stok ekseninde çiziliyor; başka eksende seçilirse
     *  hiçbir satır geçmez (satış satırlarının `yasGun`u null) ve bu
     *  tanımın sonucudur — sessiz bir hata değil. */
    kova: kovaCoz(p.kova),
  };

  const istenen = (p.pencere ?? "BU_AY") as PencereTuru;
  const tur: PencereTuru = PENCERE_TURLERI.includes(istenen)
    ? istenen
    : "BU_AY";

  const an = new Date();
  let pencere: Pencere;
  let pencereHatasi: string | null = null;
  try {
    pencere = pencereOlustur(tur, an, {
      baslangic: p.baslangic ?? "",
      bitis: p.bitis ?? "",
    });
  } catch (hata) {
    /** Bozuk aralık SESSİZCE "bu ay"a düşmez; NEDEN düştüğü yazılır (İlke #5). */
    pencereHatasi =
      hata instanceof PencereHatasi && hata.kod === "TERS_ARALIK"
        ? tRapor("tersAralik")
        : tRapor("aralikGecersiz");
    pencere = pencereOlustur("BU_AY", an);
  }

  const paraBirimi: Currency = p.para === "EUR" ? "EUR" : "TRY";
  const kanalKodu = p.kanal ?? null;

  /**
   * ⛔ İKİ EKSEN İKİ AYRI KÜMEYE BAKAR — ve bu bir kusur değil, tanımın
   * kendisi. Stok ekseni "bugün rafta ne var" sorar; dönemde hiç satılmamış
   * ama aylardır bekleyen mal SATIŞ kümesinde hiç görünmez ve ölü sermaye
   * tam olarak odur. Gerekçenin tamamı `urun-analizi-verisi.ts`te.
   */
  const bugun = new Date();
  bugun.setUTCHours(0, 0, 0, 0);
  const hamSatirlar: AnalizSatiri[] =
    eksen === "stok"
      ? await stokEkseniVerisi(bugun)
      : await satisEkseniVerisi(pencere, paraBirimi, kanalKodu);

  /**
   * SÜZGEÇ SEÇENEKLERİ SÜZÜLMEMİŞ KÜMEDEN — LEGO seçilince öteki markalar
   * listeden düşmemeli, yoksa geri dönmek imkânsızlaşır.
   */
  const secenekSay = (al: (s: AnalizSatiri) => string | null) => {
    const harita = new Map<string, number>();
    for (const s of hamSatirlar) {
      const d = al(s);
      if (d === null || d === "") continue;
      harita.set(d, (harita.get(d) ?? 0) + 1);
    }
    return [...harita.entries()]
      .map(([ad, sayi]) => ({ ad, sayi }))
      .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, "tr"));
  };
  const markaSecenekleri = secenekSay((s) => s.marka);
  const kategoriSecenekleri = secenekSay((s) => s.kategori);

  /** SIRA: süzgeç → toplam (TAMAMINDAN) → sırala → tavan. */
  const suzulmus = suzgectenGecir(hamSatirlar, suzgec);
  const toplam = analizToplami(suzulmus);
  const sirali = sirala(suzulmus, sira, yon);
  const gorunen = sirali.slice(0, satirSayisi);

  /**
   * KÜMÜLATİF PAY — yalnız NET-2'ye göre AZALAN sıralamada anlamlı.
   *
   * ⛔ BAŞKA SIRADA GÖSTERİLMEZ, SIFIR YAZILMAZ. Pareto'nun tanımı "en
   * büyükten başlayarak biriken pay"; adı-alfabetik bir listede aynı sütunu
   * çizmek, matematiksel olarak anlamsız bir eğri gösterip ona Pareto
   * demek olurdu. Gösterilmediği de ekranda YAZAR (sessiz kaybolma yok).
   */
  const payGosterilir = eksen === "dagilim" && sira === "net2" && yon === "azalan";
  const payToplami = sirali.reduce((x, s) => x + Math.max(0, s.net2), 0);
  const kumulatifPay = new Map<string, number>();
  if (payGosterilir && payToplami > 0) {
    let biriken = 0;
    for (const s of sirali) {
      biriken += Math.max(0, s.net2);
      kumulatifPay.set(s.variantId, (biriken / payToplami) * 100);
    }
  }

  const tasinan = {
    eksen,
    pencere: p.pencere,
    baslangic: p.baslangic,
    bitis: p.bitis,
    kanal: p.kanal,
    para: p.para,
  };

  const eksenEtiketi: Record<AnalizEkseni, string> = {
    dagilim: t("eksenDagilim"),
    marj: t("eksenMarj"),
    hacim: t("eksenHacim"),
    stok: t("eksenStok"),
  };

  /** Stok ekseninde satış sütunları çizilmez — o eksende sorulmuyorlar. */
  const stokKipi = eksen === "stok";

  return (
    <div className="min-w-0 space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("notu")}</p>
      </div>

      {pencereHatasi ? (
        <p className="text-destructive flex items-center gap-2 text-sm">
          <TriangleAlert className="size-4" />
          {pencereHatasi}
        </p>
      ) : null}

      {/* ── EKSEN SEKMELERİ — seçim ADRESTE yaşar ── */}
      <div className="flex flex-wrap gap-2">
        {ANALIZ_EKSENLERI.map((e) => {
          const aktif = e === eksen;
          return (
            <Link
              key={e}
              /**
               * ⚠ EKSEN DEĞİŞİNCE SIRALAMA TAŞINMAZ. Taşınsaydı stok
               * sekmesine "marj" sırasıyla girilir ve bütün satırlar eşit
               * çıkardı — sıralama sessizce anlamsızlaşırdı. Süzgeçler
               * (marka/kategori/dönem) taşınır; onlar her eksende geçerli.
               */
              href={analizAdresi({
                eksen: e,
                pencere: p.pencere,
                baslangic: p.baslangic,
                bitis: p.bitis,
                kanal: p.kanal,
                para: p.para,
                markalar: suzgec.markalar,
                kategoriler: suzgec.kategoriler,
                minAdet: suzgec.minAdet,
                minCiro: suzgec.minCiro,
                /**
                 * ⛔ KOVA TAŞINMIYOR — VE BU BİR KARAR, ihmal değil.
                 * Raf yaşı yalnız stok ekseninde var; hacim sekmesine
                 * taşınsaydı satış satırlarının `yasGun`u `null` olduğu
                 * için liste BOŞ açılırdı ve kullanıcı sebebini göremezdi.
                 * Bedeli: stoka dönünce kova sıfırlanır — boş liste
                 * göstermekten iyidir.
                 */
                satir: satirSayisi,
              })}
              aria-current={aktif ? "page" : undefined}
              className={
                "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors " +
                (aktif
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted")
              }
            >
              {eksenEtiketi[e]}
            </Link>
          );
        })}
      </div>

      {/* ── KÜMENİN NE OLDUĞU YAZAR — hangi soruya bakıldığı belirsiz kalmasın ── */}
      <p className="text-muted-foreground text-sm">
        {stokKipi ? t("stokDonemUyarisi") : t("satisEkseniNotu")}
      </p>

      <SuzgecCubugu
        eksen={eksen}
        tasinan={tasinan}
        suzgec={suzgec}
        sira={sira}
        yon={yon}
        satir={satirSayisi}
        markaSecenekleri={markaSecenekleri}
        kategoriSecenekleri={kategoriSecenekleri}
        suzgecVarMi={
          suzgec.markalar.length > 0 ||
          suzgec.kategoriler.length > 0 ||
          suzgec.minAdet !== null ||
          suzgec.minCiro !== null
        }
      />

      {/* ── TOPLAM — SÜZGECİN TAMAMININ (İlke #15) ── */}
      <ListeToplami
        baslik={stokKipi ? t("sutunSermaye") : t("sutunCiro")}
        toplamlar={
          stokKipi
            ? [{ paraBirimi: "TRY" as Currency, tutar: toplam.bagliSermaye }]
            : [{ paraBirimi, tutar: toplam.ciro }]
        }
        altMetin={t("toplamUrun", { sayi: toplam.urun })}
        oncekiler={
          stokKipi
            ? []
            : [{ etiket: t("sutunAdet"), deger: String(toplam.adet) }]
        }
        ekler={
          stokKipi
            ? [
                {
                  etiket: t("sutunRafAdedi"),
                  deger: String(
                    suzulmus.reduce((x, s) => x + (s.rafAdedi ?? 0), 0),
                  ),
                },
                ...(toplam.sermayesiBilinmeyen > 0
                  ? [
                      {
                        etiket: t("sermayesizUrun"),
                        deger: String(toplam.sermayesiBilinmeyen),
                        not: t("sermayesiBilinmeyen", {
                          sayi: toplam.sermayesiBilinmeyen,
                        }),
                      },
                    ]
                  : []),
              ]
            : [
                {
                  etiket: t("sutunNet2"),
                  toplamlar: [{ paraBirimi, tutar: toplam.net2 }],
                  gorunur: karGorunur,
                  not:
                    toplam.hesaplanamayanKalem > 0
                      ? t("hesaplanamayanKalem", {
                          sayi: toplam.hesaplanamayanKalem,
                        })
                      : t("temizKalem"),
                },
                {
                  etiket: t("sutunMarj"),
                  deger:
                    toplam.marj === null ? t("bilinmiyor") : bicim.yuzde(toplam.marj),
                  gorunur: karGorunur,
                },
              ]
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{eksenEtiketi[eksen]}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {toplam.urun > gorunen.length
              ? t("toplamGosterilen", {
                  gosterilen: gorunen.length,
                  toplam: toplam.urun,
                })
              : t("hepsiGosteriliyor", { sayi: toplam.urun })}
          </p>
          {payGosterilir ? (
            <p className="text-muted-foreground text-xs">{t("paretoNotu")}</p>
          ) : eksen === "dagilim" ? (
            <p className="text-muted-foreground text-xs">
              {t("paretoSiraUyarisi")}
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">
                {t("listeBosSebep")}
              </p>
            </div>
          ) : (
            <>
              {/* ── MASAÜSTÜ: TABLO ── */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      {stokKipi ? (
                        <>
                          <TableHead className="text-right">
                            {t("sutunYas")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("sutunRafAdedi")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("sutunSermaye")}
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right">
                            {t("sutunAdet")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("sutunCiro")}
                          </TableHead>
                          {karGorunur ? (
                            <>
                              <TableHead className="text-right">
                                {t("sutunNet2")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("sutunMarj")}
                              </TableHead>
                            </>
                          ) : null}
                          {payGosterilir ? (
                            <TableHead className="text-right">
                              {t("sutunPay")}
                            </TableHead>
                          ) : null}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => {
                      const marj = marjYuzdesi(s);
                      return (
                        <TableRow key={s.variantId}>
                          <TableCell className="max-w-md">
                            <div className="min-w-0 space-y-0.5">
                              {/* Tıklanabilir tıklanabilir GÖRÜNÜR (İlke #2) */}
                              {s.urunId === null ? (
                                <span className="font-medium">{s.urunAdi}</span>
                              ) : (
                                <Link
                                  href={`/urunler/${s.urunId}`}
                                  className="font-medium underline underline-offset-2 hover:no-underline"
                                >
                                  {s.urunAdi}
                                </Link>
                              )}
                              <KimlikSatiri satir={s} />
                            </div>
                          </TableCell>

                          {stokKipi ? (
                            <>
                              <TableCell className="text-right tabular-nums">
                                {s.yasGun === null
                                  ? t("bilinmiyor")
                                  : t("gun", { sayi: s.yasGun })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {s.rafAdedi ?? t("bilinmiyor")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {/* ⚠ `null` "—" yazar, ₺0,00 DEĞİL: maliyeti
                                    bilinmeyen mal bedava değildir. */}
                                {s.bagliSermaye === null
                                  ? t("bilinmiyor")
                                  : bicim.para(s.bagliSermaye, "TRY")}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-right tabular-nums">
                                {s.adet}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {bicim.para(s.ciro, paraBirimi)}
                              </TableCell>
                              {karGorunur ? (
                                <>
                                  <TableCell className="text-right tabular-nums">
                                    {s.kalemSayisi === s.hesaplanamayanKalem
                                      ? t("bilinmiyor")
                                      : bicim.para(s.net2, paraBirimi)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {marj === null
                                      ? t("bilinmiyor")
                                      : bicim.yuzde(marj)}
                                  </TableCell>
                                </>
                              ) : null}
                              {payGosterilir ? (
                                <TableCell className="text-right tabular-nums">
                                  {bicim.yuzde(
                                    kumulatifPay.get(s.variantId) ?? 0,
                                  )}
                                </TableCell>
                              ) : null}
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── TELEFON: KART LİSTESİ (İlke #8) ── */}
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => {
                  const marj = marjYuzdesi(s);
                  return (
                    <ListeKarti
                      key={s.variantId}
                      baslik={
                        s.urunId === null ? (
                          s.urunAdi
                        ) : (
                          <Link
                            href={`/urunler/${s.urunId}`}
                            className="underline underline-offset-2"
                          >
                            {s.urunAdi}
                          </Link>
                        )
                      }
                      altBaslik={<KimlikSatiri satir={s} />}
                      alanlar={
                        stokKipi
                          ? [
                              {
                                etiket: t("sutunYas"),
                                deger:
                                  s.yasGun === null
                                    ? t("bilinmiyor")
                                    : t("gun", { sayi: s.yasGun }),
                              },
                              {
                                etiket: t("sutunRafAdedi"),
                                deger: String(s.rafAdedi ?? t("bilinmiyor")),
                              },
                              {
                                etiket: t("sutunSermaye"),
                                deger:
                                  s.bagliSermaye === null
                                    ? t("bilinmiyor")
                                    : bicim.para(s.bagliSermaye, "TRY"),
                              },
                              ...(s.marka === null
                                ? []
                                : [{ etiket: t("marka"), deger: s.marka }]),
                            ]
                          : [
                              { etiket: t("sutunAdet"), deger: String(s.adet) },
                              {
                                etiket: t("sutunCiro"),
                                deger: bicim.para(s.ciro, paraBirimi),
                              },
                              ...(karGorunur
                                ? [
                                    {
                                      etiket: t("sutunNet2"),
                                      deger:
                                        s.kalemSayisi === s.hesaplanamayanKalem
                                          ? t("bilinmiyor")
                                          : bicim.para(s.net2, paraBirimi),
                                    },
                                    {
                                      etiket: t("sutunMarj"),
                                      deger:
                                        marj === null
                                          ? t("bilinmiyor")
                                          : bicim.yuzde(marj),
                                    },
                                  ]
                                : []),
                              ...(payGosterilir
                                ? [
                                    {
                                      etiket: t("sutunPay"),
                                      deger: bicim.yuzde(
                                        kumulatifPay.get(s.variantId) ?? 0,
                                      ),
                                    },
                                  ]
                                : []),
                              ...(s.marka === null
                                ? []
                                : [{ etiket: t("marka"), deger: s.marka }]),
                            ]
                      }
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ── HESAPLANAMAYAN KÜME GİZLENMEZ (açık sıfır) ── */}
          {!stokKipi && karGorunur && toplam.hesaplanamayanUrun > 0 ? (
            <p className="text-muted-foreground mt-4 text-xs">
              {t("hesaplanamayanUrun", { sayi: toplam.hesaplanamayanUrun })}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ============================================================================
 *  KİMLİK SATIRI — ÜRÜN ADININ ALTINDAKİ KODLAR (İlke #3 + #4)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 02.09.2026: _"altına tüm bilgiler gelmez mi — barkod,
 *  TY SKU, Hepsiburada SKU?"_ Bir kaydı tanımlayan kodlar detaya girmeden
 *  LİSTEDE görünür ve her biri tek tıkla kopyalanır.
 *
 *  ── 📏 HANGİ KODLARIN GÖSTERİLECEĞİ ÖLÇÜLDÜ (1110 aktif varyant) ────────
 *  · barkod      %99,9 dolu           → gösterilir
 *  · Firma SKU   %100 dolu AMA %97,7'si SKU ile AYNI
 *                → yalnız FARKLIYSA. Aynı değeri iki kez basmak satırı
 *                  gürültüye boğar ve okuyana hiçbir şey söylemez.
 *  · kanal SKU   varyant başına ortanca 2 (HB 1092 · TY 1070 · N11 49)
 *                → kanal ADIYLA, çünkü kodun hangi pazaryerine ait olduğu
 *                  kodun kendisinden anlaşılmıyor.
 *
 *  ⚠ MASAÜSTÜ VE TELEFON AYNI BİLEŞEN (İlke #10). Tabloda ve kart
 *  listesinde iki ayrı düzen yazılsaydı biri güncellenip öteki unutulurdu.
 *  Satır SARILIR (`flex-wrap`), yeni bir sütun AÇMAZ — sütun tavanı (7)
 *  bu yüzden etkilenmiyor.
 * ============================================================================
 */
async function KimlikSatiri({ satir }: { satir: AnalizSatiri }) {
  const tOrtak = await getTranslations("Ortak");
  const t = await getTranslations("UrunAnalizi");

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <KopyalanabilirKod deger={satir.sku} etiket={tOrtak("sku")} />
      {/* ⚠ SKU ile AYNIYSA çizilmez — ölçüldü, satırların %97,7'si öyle. */}
      {satir.firmaSku === null ? null : (
        <KopyalanabilirKod
          deger={satir.firmaSku}
          etiket={tOrtak("firmaSku")}
        />
      )}
      {satir.barkod === null ? null : (
        <KopyalanabilirKod deger={satir.barkod} etiket={tOrtak("barkod")} />
      )}
      {satir.kanalKodlari.map((k) => (
        <span key={`${k.kanal}-${k.kod}`} className="inline-flex items-center gap-1">
          {/* Kanal adı kodun ÖNÜNDE: hangi pazaryerine ait olduğu koddan
              anlaşılmıyor ve etiketsiz bir kod okuyana soru bıraktırır. */}
          <span className="opacity-70">{k.kanal}</span>
          <KopyalanabilirKod
            deger={k.kod}
            etiket={t("kanalKodEtiketi", { kanal: k.kanal })}
          />
        </span>
      ))}
      {satir.marka === null ? null : <span>{satir.marka}</span>}
    </div>
  );
}
