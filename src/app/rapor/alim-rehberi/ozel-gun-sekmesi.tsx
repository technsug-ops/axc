import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { ListeToplami } from "@/components/liste-toplami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_YAZISI } from "@/lib/renkler";
import { alimAra, alimToplami, kalanGun, OZEL_GUN_YOLU, TABAN_GUN, YAKLASAN_GUN, type AlimSatiri } from "@/lib/ozel-gun/ozel-gun";
import type { OzelGunDetayi, Yaklasan } from "@/lib/ozel-gun/ozel-gun-verisi";
import { eksikAdet, rehberAra, rehberToplami, type RehberSatiri } from "@/lib/rapor/alim-rehberi";
import { SECIM_AKTIF, SECIM_PASIF } from "@/lib/kutu-bicimi";

/**
 * ============================================================================
 *  ALIM REHBERİ — «ÖZEL GÜNLER» SEKMESİ (K363 Faz 2-b)
 * ----------------------------------------------------------------------------
 *  Üstte önümüzdeki 90 günün özel günleri (sürenler dahil) — biri seçili.
 *  Seçili günün GEÇEN YILKI KARŞILIĞI okunur:
 *   · SATIŞ GÜNÜ — mağaza çarpanı (o günlerde normalin kaç katı sipariş) +
 *     o günlerde satılan ve bugün rafta eksik kalan ürünler;
 *   · ALIM KAMPANYASI — geçen kampanyada alınan ürünler, bugünkü raf ve talep.
 *  Karşılığı yoksa boş liste DEĞİL «bakılamadı» yazar (anayasa: boş ≠ temiz).
 *  Hesap `lib/ozel-gun/ozel-gun.ts`te; burası yalnız çizer.
 * ============================================================================
 */

type Kimlik = { sku: string; firmaSku: string | null; barkod: string | null };

function Kodlar({ s, etiket }: { s: Kimlik; etiket: { sku: string; firmaSku: string; barkod: string } }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <KopyalanabilirKod deger={s.sku} etiket={etiket.sku} />
      {s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={etiket.firmaSku} /> : null}
      {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={etiket.barkod} /> : null}
    </div>
  );
}

function UrunAdi({ s }: { s: { urunId: string | null; urunAdi: string } }) {
  return s.urunId === null ? (
    <span className="line-clamp-2 font-medium">{s.urunAdi}</span>
  ) : (
    <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
      {s.urunAdi}
    </Link>
  );
}

export async function OzelGunSekmesi({
  yaklasan,
  secili,
  detay,
  arama,
  gunAdresi,
  donemEtiketi,
  ayarlariGorebilir,
  bugun,
}: {
  yaklasan: Yaklasan[];
  secili: Yaklasan | null;
  detay: OzelGunDetayi | null;
  arama: string | null;
  /** Her yaklaşan günün adresi (sayfa kurar — adres tek yerden). */
  gunAdresi: Record<string, string>;
  /** Rehberin seçili dönemi — alım listesinde «bugünkü talep» sütununun etiketi. */
  donemEtiketi: string;
  ayarlariGorebilir: boolean;
  /** İstanbul takvim günü (UTC gece yarısı etiketi) — «kaç gün kaldı» buna göre. */
  bugun: Date;
}) {
  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();
  const kimlikEtiketi = { sku: t("sku"), firmaSku: t("excelFirmaSku"), barkod: t("excelBarkod") };
  const aralik = (bas: Date, bit: Date) =>
    bas.getTime() === bit.getTime() ? bicim.tarih(bas) : t("ozelAralik", { bas: bicim.tarih(bas), bit: bicim.tarih(bit) });
  const ayarBaglantisi = ayarlariGorebilir ? (
    <Link href={OZEL_GUN_YOLU} className="text-sm font-medium underline underline-offset-4 hover:no-underline">
      {t("ozelAyarlarBaglantisi")}
    </Link>
  ) : null;

  if (yaklasan.length === 0 || secili === null || detay === null) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-sm font-medium">{t("ozelYaklasanYok", { gun: YAKLASAN_GUN })}</p>
          <p className="text-muted-foreground text-sm">{t("ozelYaklasanYokSebep")}</p>
          {ayarBaglantisi}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── YAKLAŞAN GÜNLER — her biri adreste seçilir ── */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {yaklasan.map((y) => {
          const aktif = y.tarih.id === secili.tarih.id;
          const kalan = kalanGun(y.tarih, bugun);
          return (
            <Link
              key={y.tarih.id}
              href={gunAdresi[y.tarih.id]}
              aria-current={aktif ? "true" : undefined}
              className={
                "inline-flex min-h-11 shrink-0 flex-col justify-center rounded-md border px-3 py-1 text-left text-sm transition-colors " +
                (aktif ? SECIM_AKTIF : SECIM_PASIF)
              }
            >
              <span className="font-medium">{y.gun.ad}</span>
              <span className={aktif ? "text-xs" : "text-muted-foreground text-xs"}>
                {aralik(y.tarih.baslangic, y.tarih.bitis)} · {kalan === 0 ? t("ozelSuruyor") : t("ozelKalan", { gun: kalan })}
              </span>
            </Link>
          );
        })}
      </div>
      {ayarBaglantisi}

      {/* ── SEÇİLİ GÜN — tür, tarih, geçen yılki karşılık, uyarılar ── */}
      <div className="space-y-1 text-sm">
        <p>
          <strong>{secili.gun.ad}</strong> · {t(`ozelTur_${secili.gun.tur}`)}
          {secili.gun.kanal ? ` · ${secili.gun.kanal.ad}` : ""} · {aralik(secili.tarih.baslangic, secili.tarih.bitis)}
        </p>
        {secili.tarih.dogrulandi ? null : <p className={DURUM_YAZISI.uyari}>{t("ozelDogrulanmadi")}</p>}
        {secili.onceki ? (
          <p className="text-muted-foreground">
            {t("ozelOnceki", { aralik: aralik(secili.onceki.baslangic, secili.onceki.bitis) })}
            {secili.onceki.dogrulandi ? "" : ` ${t("ozelOncekiDogrulanmadi")}`}
          </p>
        ) : null}
        {detay.durum !== "ONCEKI_YOK" && detay.kapsam === "KISMI" ? (
          <p className={DURUM_YAZISI.uyari}>{t("ozelKismi", { ilk: detay.ilkKayit ? bicim.tarih(detay.ilkKayit) : "—" })}</p>
        ) : null}
        <p className={DURUM_YAZISI.uyari}>{t("gecenYilUyari")}</p>
      </div>

      {detay.durum === "ONCEKI_YOK" ? (
        <Card>
          <CardContent className="space-y-1 py-8 text-center">
            <p className="text-sm font-medium">{t("ozelOncekiYok")}</p>
            <p className="text-muted-foreground text-sm">{t("ozelOncekiYokSebep")}</p>
          </CardContent>
        </Card>
      ) : detay.durum === "SATIS" ? (
        <SatisGunu detay={detay} arama={arama} kimlikEtiketi={kimlikEtiketi} />
      ) : (
        <AlimKampanyasi detay={detay} arama={arama} kimlikEtiketi={kimlikEtiketi} donemEtiketi={donemEtiketi} />
      )}
    </div>
  );
}

async function SatisGunu({
  detay,
  arama,
  kimlikEtiketi,
}: {
  detay: Extract<OzelGunDetayi, { durum: "SATIS" }>;
  arama: string | null;
  kimlikEtiketi: { sku: string; firmaSku: string; barkod: string };
}) {
  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();
  const gorunen = rehberAra(detay.satirlar, arama);
  const toplam = rehberToplami(gorunen);
  const c = detay.carpan;
  const sermaye = (s: RehberSatiri) => (s.raf <= 0 ? "—" : s.bagliSermaye === null ? t("bilinmiyor") : bicim.para(s.bagliSermaye, "TRY"));

  return (
    <>
      {/* ── MAĞAZA ÇARPANI — bu gün GERÇEKTEN sıçrama yapıyor mu, kendi rakamımızla ── */}
      <p className="text-sm">
        {c === null
          ? t("ozelCarpanTabanYok", { taban: TABAN_GUN })
          : c.carpan === null
            ? t("ozelCarpanYok", { taban: c.tabanGun })
            : t("ozelCarpan", {
                carpan: bicim.sayi(c.carpan, 1),
                siparis: c.pencereSiparis,
                gun: c.pencereGun,
                gunluk: bicim.sayi(c.pencereSiparis / c.pencereGun, 1),
                taban: c.tabanGun,
                tabanGunluk: bicim.sayi(c.tabanSiparis / c.tabanGun, 1),
              })}
      </p>
      <p className="text-sm">{t("aciklama_ozelSatis")}</p>

      <ListeToplami
        baslik={t("toplamBaslik")}
        toplamlar={[{ paraBirimi: "TRY", tutar: toplam.bagliSermaye }]}
        altMetin={t("ozelToplamUrun", { sayi: toplam.urun })}
        oncekiler={[{ etiket: t("toplamOzelAdet"), deger: String(toplam.adet) }]}
        ekler={[
          { etiket: t("toplamOzelNet2"), toplamlar: [{ paraBirimi: "TRY", tutar: toplam.net2 }] },
          {
            etiket: t("toplamRaf"),
            deger: String(toplam.raf),
            not: toplam.sermayesiBilinmeyen > 0 ? t("sermayesiBilinmeyen", { sayi: toplam.sermayesiBilinmeyen }) : undefined,
          },
          { etiket: t("toplamEksik"), deger: String(toplam.eksik) },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("ozelSatisBaslik")}</CardTitle>
          {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: detay.satirlar.length })}</p> : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">{detay.kapsam === "YOK" ? t("ozelVeriYok", { ilk: detay.ilkKayit ? bicim.tarih(detay.ilkKayit) : "—" }) : t("ozelSatisBos")}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{t("sutunOzelSatilan")}</TableHead>
                      <TableHead className="text-right">{t("sutunMarj")}</TableHead>
                      <TableHead className="text-right">{t("sutunOzelNet2")}</TableHead>
                      <TableHead className="text-right">{t("sutunRaf")}</TableHead>
                      <TableHead className="text-right">{t("sutunEksik")}</TableHead>
                      <TableHead className="text-right">{t("sutunSermaye")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => (
                      <TableRow key={s.variantId}>
                        <TableCell className="max-w-md align-top whitespace-normal">
                          <div className="min-w-0 space-y-0.5">
                            <UrunAdi s={s} />
                            <Kodlar s={s} etiket={kimlikEtiketi} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.adet}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.marj === null ? t("bilinmiyor") : bicim.yuzde(s.marj)}</TableCell>
                        <TableCell className="text-right tabular-nums">{bicim.para(s.net2, "TRY")}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.raf}</TableCell>
                        <TableCell className="text-right tabular-nums">{eksikAdet(s)}</TableCell>
                        <TableCell className="text-right tabular-nums">{sermaye(s)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => (
                  <ListeKarti
                    key={s.variantId}
                    baslik={<UrunAdi s={s} />}
                    altBaslik={<Kodlar s={s} etiket={kimlikEtiketi} />}
                    alanlar={[
                      { etiket: t("sutunOzelSatilan"), deger: String(s.adet) },
                      { etiket: t("sutunMarj"), deger: s.marj === null ? t("bilinmiyor") : bicim.yuzde(s.marj) },
                      { etiket: t("sutunOzelNet2"), deger: bicim.para(s.net2, "TRY") },
                      { etiket: t("sutunRaf"), deger: String(s.raf) },
                      { etiket: t("sutunEksik"), deger: String(eksikAdet(s)) },
                      { etiket: t("sutunSermaye"), deger: sermaye(s) },
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

async function AlimKampanyasi({
  detay,
  arama,
  kimlikEtiketi,
  donemEtiketi,
}: {
  detay: Extract<OzelGunDetayi, { durum: "ALIM" }>;
  arama: string | null;
  kimlikEtiketi: { sku: string; firmaSku: string; barkod: string };
  donemEtiketi: string;
}) {
  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();
  const gorunen: AlimSatiri[] = alimAra(detay.satirlar, arama);
  const toplam = alimToplami(gorunen);
  const talepEtiketi = t("sutunOzelTalep", { donem: donemEtiketi });

  return (
    <>
      <p className="text-sm">{t("aciklama_ozelAlim")}</p>
      {/* ── TOPLAM (İlke #15) — para yok: alım maliyeti dağıtıma bağlı, burada yeniden hesaplanmaz ── */}
      <div className="grid max-w-3xl grid-cols-2 gap-2 md:grid-cols-4">
        <IstatistikKutusu etiket={t("toplamOzelUrun")} cocuk={toplam.urun} />
        <IstatistikKutusu etiket={t("toplamOzelAlinan")} cocuk={toplam.alinan} />
        <IstatistikKutusu etiket={t("toplamRaf")} cocuk={toplam.raf} />
        <IstatistikKutusu etiket={talepEtiketi} cocuk={toplam.donemSatis} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("ozelAlimBaslik")}</CardTitle>
          {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: detay.satirlar.length })}</p> : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">{detay.kapsam === "YOK" ? t("ozelAlimVeriYok", { ilk: detay.ilkKayit ? bicim.tarih(detay.ilkKayit) : "—" }) : t("ozelAlimBos")}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{t("sutunOzelAlinan")}</TableHead>
                      <TableHead className="text-right">{t("sutunRaf")}</TableHead>
                      <TableHead className="text-right">{talepEtiketi}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => (
                      <TableRow key={s.variantId}>
                        <TableCell className="max-w-md align-top whitespace-normal">
                          <div className="min-w-0 space-y-0.5">
                            <UrunAdi s={s} />
                            <Kodlar s={s} etiket={kimlikEtiketi} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.alinan}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.raf}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.donemSatis}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => (
                  <ListeKarti
                    key={s.variantId}
                    baslik={<UrunAdi s={s} />}
                    altBaslik={<Kodlar s={s} etiket={kimlikEtiketi} />}
                    alanlar={[
                      { etiket: t("sutunOzelAlinan"), deger: String(s.alinan) },
                      { etiket: t("sutunRaf"), deger: String(s.raf) },
                      { etiket: talepEtiketi, deger: String(s.donemSatis) },
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
