import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Search, TriangleAlert } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UzunAd } from "@/components/uzun-ad";
import { bicimlendirici } from "@/lib/bicim";
import { envanterVerisi } from "@/lib/envanter-veri";
import {
  ENVANTER_SIRALARI,
  envanterAra,
  envanterSirala,
  siralamaCoz,
} from "@/lib/envanter";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  ENVANTER DEĞERİ
 * ----------------------------------------------------------------------------
 *  Değer stok ledger'ından türer; ayrı bir "envanter değeri" kaydı YOKTUR.
 *  Hesabın kendisi ve gerekçeleri `src/lib/envanter.ts` başlığındadır.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("envanterDegeri") };
}

export default async function EnvanterDegeriSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sira?: string }>;
}) {
  await sayfaIzni("envanter.gor");
  const parametreler = await searchParams;

  const t = await getTranslations("Envanter");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const { sonuc, kimlikler } = await envanterVerisi();

  /**
   * ── ARAMA VE SIRALAMA (kullanıcı isteği 21.08.2026) ────────────────────
   * ⚠ İKİSİ DE SAF İŞLEVDE (`lib/envanter.ts`), burada değil: Excel de aynı
   * sırayı göstermeli. İki yerde iki sıralama olsaydı indirilen dosya
   * ekrandakinden farklı sırada çıkardı (İlke #10).
   *
   * ⚠ ARANACAK METİN BURADA KURULUYOR: saf işlev veritabanı bilmez, kimlik
   * haritasını çağıran verir. Ad · SKU · firma SKU · barkod birlikte
   * aranıyor — kullanıcı hangisini hatırlıyorsa onu yazsın (İlke #3).
   */
  const arama = (parametreler.q ?? "").trim();
  const sira = siralamaCoz(parametreler.sira);
  const aranacakMetin = (variantId: string) => {
    const k = kimlikler.get(variantId);
    if (!k) return "";
    return [k.urunAdi, k.marka, k.varyantAdi, k.sku, k.firmaSku, k.barkod]
      .filter(Boolean)
      .join(" ");
  };
  const suzulmusBloklar = sonuc.bloklar.map((blok) => ({
    ...blok,
    satirlar: envanterSirala(
      envanterAra(blok.satirlar, arama, aranacakMetin),
      sira,
    ),
  }));
  /** ⚠ ARAMA SONUCU BOŞSA SEBEBİ YAZILIR — sessiz boş tablo yok (İlke #5). */
  const aramaBos =
    arama !== "" && suzulmusBloklar.every((b) => b.satirlar.length === 0);

  const bosMu = sonuc.bloklar.length === 0 && sonuc.bilinmeyenler.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t("aciklama")}
          </p>
        </div>
        <ExcelIndir liste="envanter-degeri" />
      </div>

      {/* ══════════ ARAMA VE SIRALAMA (kullanıcı isteği 21.08.2026) ══════════
          ⚠ FORM, İSTEMCİ BİLEŞENİ DEĞİL: `method="get"` ile arama adrese
          yazılıyor. Böylece sonuç paylaşılabilir/yer imine eklenebilir ve
          sayfa sunucuda çizilmeye devam ediyor.
          ⚠ SIRA DA ADRESTE: aramayı bozmadan sıra değişebilsin diye gizli
          alanla taşınıyor (İlke #10 — süzgeçler birbirini silmez). */}
      <div className="flex flex-wrap items-end gap-3">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="sira" value={sira} />
          <div className="space-y-1">
            <Label htmlFor="envanter-ara">{ortak("ara")}</Label>
            <Input
              id="envanter-ara"
              name="q"
              defaultValue={arama}
              placeholder={t("aramaIpucu")}
              className="w-full sm:w-80"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 md:h-10">
            <Search />
            {ortak("ara")}
          </Button>
          {arama !== "" ? (
            <Button asChild variant="ghost" className="h-11 md:h-10">
              <Link href={`/envanter-degeri?sira=${sira}`}>
                {ortak("temizle")}
              </Link>
            </Button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">{t("siralama")}</span>
          {ENVANTER_SIRALARI.map((sr) => (
            <Button
              key={sr}
              asChild
              size="sm"
              variant={sira === sr ? "default" : "outline"}
              className="h-11 md:h-8"
            >
              <Link
                href={`/envanter-degeri?sira=${sr}${arama ? `&q=${encodeURIComponent(arama)}` : ""}`}
              >
                {t(`sira_${sr}`)}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* ⚠ ARAMA BOŞ DÖNDÜYSE SEBEBİ YAZAR — sessiz boş tablo yok (#5).
          "Kayıt yok" ile "aramanız eşleşmedi" farklı şeylerdir. */}
      {aramaBos ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("aramaBos", { arama })}
          </CardContent>
        </Card>
      ) : null}

      {bosMu ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("bos")}
          </CardContent>
        </Card>
      ) : null}

      {suzulmusBloklar.map((blok) => (
        <Card key={blok.paraBirimi}>
          <CardHeader>
            <CardTitle>
              {t("toplamBaslik")} · {blok.paraBirimi}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* --- üç büyük rakam --- */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">{t("adet")}</div>
                <div className="text-2xl font-semibold">{blok.toplamAdet}</div>
              </div>
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("odenen")}
                </div>
                <div className="text-2xl font-semibold">
                  {bicim.para(blok.toplamOdenen, blok.paraBirimi)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("odenenAciklama")}
                </div>
              </div>
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("malBedeli")}
                </div>
                <div className="text-2xl font-semibold">
                  {bicim.para(blok.toplamMalBedeli, blok.paraBirimi)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("malBedeliAciklama")}
                </div>
              </div>
            </div>

            {/* --- KDV oranı çözülemeyenler: toplamdan DÜŞTÜĞÜ söylenir --- */}
            {blok.kdvCozulemeyenSatir > 0 ? (
              <div
                className={`flex flex-wrap items-center gap-3 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}
              >
                <p
                  className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}
                >
                  <TriangleAlert className="size-4 shrink-0" />
                  {t("kdvCozulemedi", { sayi: blok.kdvCozulemeyenSatir })}
                </p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-11 md:h-8"
                >
                  <Link href="/ayarlar/kategoriler">
                    {t("kategoriAta")}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            ) : null}

            {/* --- masaüstü tablo --- */}
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("urun")}</TableHead>
                    <TableHead>{ortak("sku")}</TableHead>
                    {/* ⚠ GİRİŞ TARİHİ — "bu para ne zamandır depoda".
                        En ESKİ açık partinin tarihi; birden çok parti varsa
                        parayı en uzun bekleten odur. */}
                    <TableHead className="whitespace-nowrap">
                      {t("girisTarihi")}
                    </TableHead>
                    <TableHead className="text-right">{t("adet")}</TableHead>
                    <TableHead className="text-right">
                      {t("birimOrtalama")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("kdvOrani")}
                    </TableHead>
                    <TableHead className="text-right">{t("odenen")}</TableHead>
                    <TableHead className="text-right">
                      {t("malBedeli")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blok.satirlar.map((satir) => {
                    const k = kimlikler.get(satir.variantId);
                    return (
                      <TableRow key={satir.variantId}>
                        <TableCell>
                          <UzunAd
                            metin={
                              k
                                ? [k.urunAdi, k.varyantAdi]
                                    .filter(Boolean)
                                    .join(" · ")
                                : satir.variantId
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <KopyalanabilirKod
                            deger={k?.sku}
                            etiket={ortak("sku")}
                          />
                        </TableCell>
                        {/* ⚠ AÇIK SIFIR: tarihi olmayan satır BOŞ değil "—"
                            yazar. Boş hücre "veri yok mu ekran mı bozuk"
                            sorusunu doğurur. */}
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {satir.girisTarihi
                            ? bicim.tarih(satir.girisTarihi)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {satir.adet}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(
                            satir.odenen / satir.adet,
                            satir.paraBirimi,
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {satir.kdvOrani === null ? "—" : `%${satir.kdvOrani}`}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(satir.odenen, satir.paraBirimi)}
                        </TableCell>
                        {/* Oran çözülemediyse SAYI YAZILMAZ; neden yazılır. */}
                        <TableCell className="text-right whitespace-nowrap">
                          {satir.malBedeli === null ? (
                            <span className="text-muted-foreground">
                              {t("hesaplanamadi")}
                            </span>
                          ) : (
                            bicim.para(satir.malBedeli, satir.paraBirimi)
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* --- telefon kartı --- */}
            <div className="space-y-3 md:hidden">
              {blok.satirlar.map((satir) => {
                const k = kimlikler.get(satir.variantId);
                return (
                  <ListeKarti
                    key={satir.variantId}
                    baslik={
                      k
                        ? [k.urunAdi, k.varyantAdi].filter(Boolean).join(" · ")
                        : satir.variantId
                    }
                    altBaslik={
                      <KopyalanabilirKod deger={k?.sku} etiket={ortak("sku")} />
                    }
                    alanlar={[
                      { etiket: t("adet"), deger: String(satir.adet) },
                      {
                        etiket: t("kdvOrani"),
                        deger:
                          satir.kdvOrani === null ? "—" : `%${satir.kdvOrani}`,
                      },
                      {
                        etiket: t("odenen"),
                        deger: bicim.para(satir.odenen, satir.paraBirimi),
                      },
                      {
                        etiket: t("malBedeli"),
                        deger:
                          satir.malBedeli === null
                            ? t("hesaplanamadi")
                            : bicim.para(satir.malBedeli, satir.paraBirimi),
                      },
                    ]}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ================= DEĞERİ BİLİNMEYEN STOK ================= */}
      {sonuc.bilinmeyenler.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("bilinmeyenBaslik")} ·{" "}
              {t("bilinmeyenAdet", { sayi: sonuc.bilinmeyenToplamAdet })}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t("bilinmeyenAciklama")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("urun")}</TableHead>
                    <TableHead>{ortak("sku")}</TableHead>
                    <TableHead className="text-right">{t("adet")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sonuc.bilinmeyenler.map((satir) => {
                    const k = kimlikler.get(satir.variantId);
                    return (
                      <TableRow key={satir.variantId}>
                        <TableCell>
                          <UzunAd
                            metin={
                              k
                                ? [k.urunAdi, k.varyantAdi]
                                    .filter(Boolean)
                                    .join(" · ")
                                : satir.variantId
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <KopyalanabilirKod
                            deger={k?.sku}
                            etiket={ortak("sku")}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {satir.adet}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
