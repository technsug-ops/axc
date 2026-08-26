import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";
import { ArrowRight, TriangleAlert } from "lucide-react";

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

import { UzunAd } from "@/components/uzun-ad";
import { bicimlendirici } from "@/lib/bicim";
import { envanterVerisi } from "@/lib/envanter-veri";
import { aralikCoz, enGecGun } from "@/lib/envanter-tarih";
import { envanterAraligi } from "@/lib/envanter-aralik";
import {
  ENVANTER_SIRALARI,
  envanterAra,
  envanterSirala,
  siralamaCoz,
} from "@/lib/envanter";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { AralikGorunumu } from "./aralik-gorunumu";
import { TarihSecici } from "./tarih-secici";

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
  searchParams: Promise<{
    q?: string;
    sira?: string;
    tarih?: string;
    bas?: string;
    bit?: string;
  }>;
}) {
  await sayfaIzni("envanter.gor");
  const parametreler = await searchParams;

  const t = await getTranslations("Envanter");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  /**
   * ── TARİHLİ FOTOĞRAF (K53, 25.08.2026) ───────────────────────────────
   * Kullanıcı bir tarih seçer; ekran O ANA KADARKİ defteri kurar.
   *
   * ⚠ AYNI MOTOR PARAMETRELENDİ — ikinci bir hesap yolu AÇILMADI. İki ayrı
   * FIFO tanımı bir gün ayrışır ve o gün hangisinin doğru olduğu anlaşılmaz.
   *
   * ⚠ GEÇERSİZ TARİH SESSİZCE BUGÜNE DÜŞMEZ: kullanıcı yanlış yazdığı bir
   * tarihin sonucunu DOĞRU sanırdı.
   */
  const an = new Date();
  /**
   * ⚠ TEK GÖVDE ÜÇ KİPİ DE ÇÖZÜYOR: bugün · tek tarih · aralık. Ayrı ayrı
   * çözülseydi ekran bir sınır, Excel başka sınır kullanabilirdi.
   */
  const kip = aralikCoz(
    {
      tarih: parametreler.tarih,
      bas: parametreler.bas,
      bit: parametreler.bit,
    },
    an,
  );
  const gecersizTarih = kip.tur === "GECERSIZ";
  const sinir = kip.tur === "TEK" ? kip.sinir : undefined;
  const seciliTarih = kip.tur === "TEK" ? kip.metin : "";
  const seciliBas = kip.tur === "ARALIK" ? kip.basMetin : "";
  const seciliBit = kip.tur === "ARALIK" ? kip.bitMetin : "";

  /**
   * ⚠ ARALIK KİPİNDE TEK FOTOĞRAF SORGUSU KOŞMAZ. Koşsaydı boşuna bir
   * üçüncü okuma yapılır ve o okuma ekranda hiç görünmezdi — ama sayfayı
   * yavaşlatırdı.
   */
  const aralik =
    kip.tur === "ARALIK"
      ? await envanterAraligi(kip.acilisSiniri, kip.kapanisSiniri)
      : null;

  const { sonuc, kimlikler } =
    kip.tur === "ARALIK"
      ? { sonuc: { bloklar: [], bilinmeyenler: [], bilinmeyenToplamAdet: 0 }, kimlikler: new Map() }
      : await envanterVerisi(sinir);

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
        {/*
          ⚠ İNDİRİLEN DOSYA EKRANDAKİ TARİHİ TAŞIR. Taşımasaydı muhasebeciye
          "1 Haziran envanteri" diye BUGÜNÜN dosyası gönderilirdi — doğru
          sayı, yanlış etiket ve kimse fark etmez.
        */}
        <ExcelIndir
          liste="envanter-degeri"
          parametreler={{
            tarih: seciliTarih,
            bas: seciliBas,
            bit: seciliBit,
          }}
        />
      </div>

      {/*
        ═══ KALICI ŞERH — BU BİR SAYIM DEĞİL ═════════════════════════════
        ⚠ Kullanıcı şartı 25.08.2026. Ekran kayıtlardan kurulmuş bir DEFTER
        FOTOĞRAFIDIR; rafta ne olduğunu söylemez, deftere ne yazıldığını
        söyler. "Sayım" demek yapılmamış bir işi yapılmış göstermek olurdu
        ve bu ekran muhasebeye giden bir belgeye dönüşüyor.
        ⚠ ŞERH KOŞULLU DEĞİL — tarih seçilmese de yazar: bugünün rakamı da
        bir defter fotoğrafıdır.
      */}
      <p className="text-muted-foreground text-sm">{t("fotografSerhi")}</p>

      {/* ⚠ TARİH SEÇİCİ — arama ve sıra korunarak (İlke #10). */}
      <TarihSecici
        baslangic={seciliTarih}
        aralikBas={seciliBas}
        aralikBit={seciliBit}
        enGec={enGecGun(an)}
        tasinanlar={{ q: parametreler.q ?? "", sira: parametreler.sira ?? "" }}
      />

      {/*
        ⚠ GEÇERSİZ/GELECEK TARİH SESSİZ GEÇMEZ. Sessizce bugüne düşseydi
        kullanıcı yanlış bir tarihin sonucunu doğru sanırdı.
      */}
      {gecersizTarih ? (
        <p className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {/*
            ⚠ SEBEP AYRI AYRI SÖYLENİR. Tek bir "tarih geçersiz" mesajı,
            kullanıcının NE yanlış yaptığını gizlerdi: eksik uç mu, ters
            sıra mı, gelecek mi? Sessiz başarısızlığın kardeşi, sebepsiz
            başarısızlıktır (İlke #5).
          */}
          <span>
            {kip.tur === "GECERSIZ" ? t(`tarihHata_${kip.sebep}`) : ""}
          </span>
        </p>
      ) : null}

      {/*
        ═══ PİRİNÇ ŞERH — KAPSAM DOĞRULANMADI ════════════════════════════
        ⚠ Kullanıcı şartı: girilmemiş satış, stoğu olduğundan YÜKSEK
        gösterir. Ağustos için %48 ÖLÇÜLDÜ (döküm 147 adet, defterde 71);
        öteki aylar ölçülmedi, o yüzden **ay adı verilmeden** genel yazılıyor.
        Ölçülmemiş bir aya rakam yakıştırmak, ölçüleni de şüpheli yapardı.
      */}
      {sinir ? (
        <p className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {t("kapsamSerhi")}{" "}
            <strong>{t("sinirAciklamasi", { tarih: seciliTarih })}</strong>
          </span>
        </p>
      ) : null}

      {/* ══════════ ARAMA VE SIRALAMA (kullanıcı isteği 21.08.2026) ══════════
          ⚠ FORM, İSTEMCİ BİLEŞENİ DEĞİL: `method="get"` ile arama adrese
          yazılıyor. Böylece sonuç paylaşılabilir/yer imine eklenebilir ve
          sayfa sunucuda çizilmeye devam ediyor.
          ⚠ SIRA DA ADRESTE: aramayı bozmadan sıra değişebilsin diye gizli
          alanla taşınıyor (İlke #10 — süzgeçler birbirini silmez). */}
      <div className="flex flex-wrap items-end gap-3">
        {/* ⚠ ARAMA ORTAK BİLEŞENDEN — kamera dahil (İlke #7). Sıra
            `tasinanlar` ile korunuyor: arama sırayı silmez. */}
        <KodAramaKutusu
          temelAdres="/envanter-degeri"
          baslangic={arama}
          tasinanlar={{ sira }}
          ipucu={t("aramaIpucu")}
        />

        {/*
          ⚠ ARALIK KİPİNDE SIRALAMA DÜĞMELERİ ÇİZİLMEZ — CANLI BULGU
          26.08.2026. Düğmeler duruyordu ama aralık görünümüne HİÇ
          etki etmiyordu: tıklanınca iş yapmayan düğme sessiz
          başarısızlıktır (İlke #5). Aralıkta sıra sabittir (en çok
          hareket eden üstte) ve bu ekranda YAZILI.
        */}
        <div
          className={`flex flex-wrap items-center gap-2 ${aralik ? "hidden" : ""}`}
        >
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

      {/*
        ═══ ARALIK KİPİ — AÇILIŞ · KAPANIŞ · FARK ══════════════════════════
        ⚠ AYRI GÖRÜNÜM, AYRI SORU. Tek fotoğraf "şu an ne var" der; aralık
        "dönemde ne değişti" der. İkisini aynı tabloya sıkıştırmak, iki
        farklı soruyu tek cevapla geçiştirmek olurdu.
      */}
      {aralik ? (
        <>
          {/* ⚠ SINIR ÖRNEKLE — metin ve süzgeç AYNI gövdeden (İlke #5). */}
          <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>
            {t("aralikSiniri", { bas: seciliBas, bit: seciliBit })}
          </p>
          <AralikGorunumu
            sonuc={aralik}
            basMetin={seciliBas}
            bitMetin={seciliBit}
          />
        </>
      ) : null}

      {/* ⚠ ARAMA BOŞ DÖNDÜYSE SEBEBİ YAZAR — sessiz boş tablo yok (#5).
          "Kayıt yok" ile "aramanız eşleşmedi" farklı şeylerdir. */}
      {aralik === null && aramaBos ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("aramaBos", { arama })}
          </CardContent>
        </Card>
      ) : null}

      {aralik === null && bosMu ? (
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
