import { getTranslations } from "next-intl/server";

import type { Currency } from "@/generated/prisma/enums";
import { bicimlendirici } from "@/lib/bicim";
import type { TakvimGunu } from "@/lib/donem";
import Link from "next/link";
import { CiroSunumu } from "@/components/ciro-sunumu";
import { CizgiGrafik, type GrafikNoktasi } from "@/components/cizgi-grafik";
import { KatlanirBolum } from "@/components/katlanir-bolum";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { IsiHaritasi, type IsiSatiri } from "@/components/isi-haritasi";
import { OranTablosu, oran, type OranSatiri } from "@/components/oran-tablosu";
import { KarsilastirmaGrafigi, type KarsilastirmaSerisi } from "@/components/karsilastirma-grafigi";
import { TekSeriliGrafik, type TekNokta } from "@/components/tek-serili-grafik";
import { envanterSerisi } from "@/lib/panel/envanter-serisi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gunDegeri } from "@/lib/donem";
import { karEksikAyAdresi } from "@/lib/liste-suzgeci";
import { aylikMarj, aylikSeri, type AyNoktasi, type PanelIadesi, type PanelSatisi } from "@/lib/panel";
import { suzgecAdresi } from "@/lib/suzgec";
import { sureIsareti, sureIziniYaz } from "@/lib/sure-izi";

/** Aylık grafiğin kaç ay geriye baktığı — panel okuma aralığını da bu kurar. */
export const GRAFIK_AY_SAYISI = 12;

/**
 * ============================================================================
 *  PANEL — 12 AYLIK GRAFİK BÖLÜMÜ, ARKADAN DOLAR (K332, kullanıcı fikri 11.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «açıldıktan sonra çekse son 12 ay verilerini». Eskiden panelin
 *  TAMAMI 12 aylık satış okumasını bekliyordu — telefonda bu bölüm hiç
 *  gösterilmediği hâlde (K270). Artık üst kısım kendi dar okumasıyla hemen
 *  çizilir; bu bölüm kendi okumasını (`veriSozu`) bekler ve `Suspense` ile
 *  ARKADAN dolar. Hesap ve görünüm `page.tsx`ten BİREBİR taşındı — yalnız
 *  bileşen kabuğu eklendi; satır dönüştürmesi ortak (`panel-satir.ts`).
 * ============================================================================
 */
export async function PanelAylikGrafik({
  veriSozu,
  bugun,
  seciliKanal,
  seciliPara,
  kanalSecenekleri,
  karGorunur,
  parametreler,
}: {
  veriSozu: Promise<{ satislar: PanelSatisi[]; iadeler: PanelIadesi[] }>;
  bugun: TakvimGunu;
  seciliKanal: string | null;
  seciliPara: Currency;
  kanalSecenekleri: [string, string][];
  karGorunur: boolean;
  parametreler: Record<string, string | undefined>;
}) {
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();
  const { satislar, iadeler } = await veriSozu;

  const seri = aylikSeri(
    satislar,
    { yil: bugun.yil, ay: bugun.ay },
    GRAFIK_AY_SAYISI,
    seciliKanal,
    seciliPara,
    iadeler,
  );

  const noktalar: GrafikNoktasi[] = seri.map((nokta) => {
    const tarih = gunDegeri({ yil: nokta.yil, ay: nokta.ay, gun: 1 });
    const tam = bicim.ayYil(tarih);
    return {
      // "Ağustos 2026" -> "Ağustos"; yıl eksende gereksiz yer kaplar.
      etiket: tam.split(" ")[0] ?? tam,
      tamEtiket: tam,
      gelir: nokta.gelir,
      net2: nokta.net2,
    };
  });

  /**
   * TABLO EN YENİDEN ESKİYE (kullanıcı kararı 14.08.2026).
   *
   * GRAFİK ile TABLO farklı sıra ister ve bu bir tutarsızlık değil:
   *   grafik → zaman ekseni soldan sağa akar, eski solda kalmalı
   *   tablo  → okumaya en üstten başlanır, oradaki ay BU AY olmalı
   *
   * Etiket burada nokta ile EŞLEŞTİRİLİYOR: eskiden `noktalar[i]` ile
   * dizin üzerinden bulunuyordu ve sıra değişince ay adları satırlardan
   * KAYARDI — sessiz ve fark edilmesi zor bir hata.
   */
  const aylikSatirlar = seri
    .map((nokta, i) => ({ nokta, etiket: noktalar[i]?.tamEtiket ?? "" }))
    .reverse();

  /**
   * ═══ İADE ORANI SATIRLARI — KANAL × AY (K182, 07.09.2026) ═════════════
   *
   * ⛔ HÜCRE ORAN DEĞİL, ORANIN İKİ TARAFI. Oranı burada hesaplayıp tabloya
   * vermek toplam satırını imkânsız kılardı: oranlar toplanmaz, PAY ve PAYDA
   * toplanır. Tablo bölmeyi kendi yapıyor.
   *
   * ⚠ EK SORGU YOK — `aylikSeri` bellekteki listeyi süzüyor; `isiSatirlari`
   * ile aynı desen.
   *
   * ⛔ KANAL SÜZGECİ UYGULANMAZ — tablonun işi kanalları KARŞILAŞTIRMAK.
   */
  const iadeSerileri = kanalSecenekleri.map(([kod, ad]) => ({
    /** ⚠ KOD DA TAŞINIYOR: grafik serisinin anahtarı ADDAN değil KİMLİKTEN. */
    kod,
    ad,
    seri: aylikSeri(
      satislar,
      { yil: bugun.yil, ay: bugun.ay },
      GRAFIK_AY_SAYISI,
      kod,
      seciliPara,
      iadeler,
    ),
  }));
  const iadeAdetSatirlari: OranSatiri[] = iadeSerileri.map((k) => ({
    ad: k.ad,
    hucreler: k.seri.map((n) => ({ pay: n.iadeAdedi, payda: n.adet })),
  }));
  const iadeTutarSatirlari: OranSatiri[] = iadeSerileri.map((k) => ({
    ad: k.ad,
    hucreler: k.seri.map((n) => ({ pay: n.iadeTutari, payda: n.gelir })),
  }));

  /**
   * ═══ İADE ORANI ÇİZGİ GRAFİĞİ (kullanıcı isteği 07.09.2026) ═══════════
   * _"Bu sayfa çizgi grafikle desteklensin."_
   *
   * ⛔ ORAN TABLONUN GÖVDESİNDEN — `oran()` aynı dosyadan geliyor. İkinci bir
   * bölme yazsaydım tablo ile grafik sessizce ayrışırdı ve hangisinin doğru
   * olduğu ancak yan yana konunca görülürdü.
   * ⛔ TOPLAM SERİSİ DE AYNI KURAL: oranlar toplanmaz — PAY ve PAYDA toplanır,
   * sonra bölünür. Tablonun toplam satırıyla birebir aynı sayı.
   * ⚠ `null` ay (o kanalda hiç satış yok) çizgiyi KESER, sıfıra çekmez.
   */
  const iadeOraniSerileri: KarsilastirmaSerisi[] = [
    ...iadeSerileri.map((k) => ({
      anahtar: `kanal-${k.kod}`,
      ad: k.ad,
      birim: t("birimYuzde"),
      birimTuru: "YUZDE" as const,
      paraBirimi: null,
      degerler: k.seri.map((n) => oran({ pay: n.iadeAdedi, payda: n.adet })),
    })),
    {
      anahtar: "toplam",
      ad: t("toplam"),
      birim: t("birimYuzde"),
      birimTuru: "YUZDE" as const,
      paraBirimi: null,
      degerler: seri.map((_, ay) =>
        oran(
          iadeSerileri.reduce(
            (topla, k) => ({
              pay: topla.pay + (k.seri[ay]?.iadeAdedi ?? 0),
              payda: topla.payda + (k.seri[ay]?.adet ?? 0),
            }),
            { pay: 0, payda: 0 },
          ),
        ),
      ),
    },
  ];

  /**
   * ═══ KARŞILAŞTIRMA SERİLERİ (K182, 07.09.2026) ════════════════════════
   *
   * ⛔ `birim` ALANI SÜS DEĞİL, KAPIDIR: grafik aynı birimden olmayan
   * serileri BİRLİKTE ÇİZMEZ. Ciro (₺1,7 Mn) ile satış adedi (511) aynı
   * eksende olsaydı adet çizgisi tabanda düz görünür ve "adet değişmiyor"
   * derdi — oysa 321'den 511'e çıkmış.
   *
   * ⚠ EK SORGU YOK: hepsi zaten hesaplanmış `seri`den okunuyor.
   */
  const karsilastirmaSerileri: KarsilastirmaSerisi[] = [
    { anahtar: "ciro", ad: t("ciro"), birim: seciliPara, al: (n: AyNoktasi) => n.gelir },
    { anahtar: "net1", ad: t("net1"), birim: seciliPara, al: (n: AyNoktasi) => n.net1 },
    { anahtar: "net2", ad: t("net2"), birim: seciliPara, al: (n: AyNoktasi) => n.net2 },
    {
      anahtar: "iadeTutar",
      ad: t("iadeTutariSerisi"),
      birim: seciliPara,
      al: (n: AyNoktasi) => n.iadeTutari,
    },
    {
      anahtar: "adet",
      ad: t("satisAdedi"),
      birim: t("birimAdet"),
      al: (n: AyNoktasi) => n.adet,
    },
    {
      anahtar: "iadeAdet",
      ad: t("iadeAdediSerisi"),
      birim: t("birimAdet"),
      al: (n: AyNoktasi) => n.iadeAdedi,
    },
  ].map((k) => ({
    anahtar: k.anahtar,
    ad: k.ad,
    birim: k.birim,
    degerler: seri.map((n) => k.al(n)),
    /**
     * ⛔ FONKSİYON GEÇİLMEZ — 07.09.2026'da tam bu yüzden sekme 500 verdi
     * ("Bu ekran çizilemedi"). Grafik `"use client"` bir bileşen ve
     * sunucudan istemciye **fonksiyon serileştirilemez**. Seri yalnız
     * BİRİMİNİ söyler; biçimi istemci kendi `useBicim()` kancasından çözer.
     * ⚠ Ön-biçimleme de çözmezdi: eksen işaretleri SEÇİME bağlı olarak
     * istemcide hesaplanıyor, sunucuda değerleri henüz bilinmiyor.
     */
    birimTuru: (k.birim === seciliPara ? "PARA" : "SAYI") as "PARA" | "SAYI",
    paraBirimi: k.birim === seciliPara ? seciliPara : null,
  }));

  /* ═══════════════ AYLIK GRAFİK SEKMELERİ (K117, 31.08.2026) ═══════════
     Kullanıcı isteği: envanter gelişimi · satış adedi ısı haritası ·
     ortalama kâr marjı — ve sekme değişince ALTTAKİ TABLO da değişsin. */
  const GRAFIK_SEKMELERI = [
    "para",
    "envanter",
    "adet",
    "marj",
    /** K182 (kullanıcı isteği 07.09.2026): iade oranları — kanal kanal. */
    "iade",
    /** K182: seri seçmeli karşılaştırma. */
    "karsilastirma",
  ] as const;
  const grafikSekmesi = GRAFIK_SEKMELERI.includes(
    parametreler.grafik as (typeof GRAFIK_SEKMELERI)[number],
  )
    ? (parametreler.grafik as (typeof GRAFIK_SEKMELERI)[number])
    : "para";
  const grafikAdresi = (deger: string) =>
    suzgecAdresi("/", parametreler, { grafik: deger });

  /**
   * ⛔ ENVANTER SERİSİ YALNIZ KENDİ SEKMESİNDE ÇEKİLİYOR.
   * Ölçüldü (31.08.2026, canlı): 12 ay sonu fotoğrafı **2950 ms**, fotoğraf
   * başına ~246 ms. Koşulsuz çağrılsaydı panelin HER açılışına 3 saniye
   * eklenirdi — üstelik kullanıcıların çoğu bu sekmeyi hiç açmadan.
   */
  const envanterAylari =
    grafikSekmesi === "envanter"
      ? await envanterSerisi({ yil: bugun.yil, ay: bugun.ay }, GRAFIK_AY_SAYISI)
      : null;

  const envanterNoktalari: TekNokta[] = (envanterAylari ?? []).map((a) => {
    const tam = bicim.ayYil(gunDegeri({ yil: a.yil, ay: a.ay, gun: 1 }));
    return {
      etiket: tam.split(" ")[0] ?? tam,
      tamEtiket: tam,
      /**
       * ⚠ HİÇ MALI OLMAYAN AY `null`, SIFIR DEĞİL — ama burada sıfır GERÇEK
       * sıfırdır: parti yoksa envanter yoktur ve bu ölçülmüş bir bilgidir.
       * `deger` doğrudan geçiyor.
       */
      deger: a.deger,
    };
  });

  /**
   * ORTALAMA KÂR MARJI — NET-2 BAZLI (kullanıcı isteği 31.08.2026).
   * Hesap `aylikMarj` saf gövdesinde; burada yalnız ekrana çevriliyor.
   */
  const marjNoktalari: TekNokta[] = seri.map((nokta, i) => ({
    etiket: noktalar[i]?.etiket ?? "",
    tamEtiket: noktalar[i]?.tamEtiket ?? "",
    deger: aylikMarj(nokta),
  }));

  /**
   * SATIŞ ADEDİ ISI HARİTASI — AY × KANAL.
   *
   * ⚠ EK SORGU YOK: `aylikSeri` zaten bellekteki `satislar` listesini süzüyor;
   * kanal başına yeniden çağırmak yalnız o listeyi bir kez daha geziyor.
   *
   * ⛔ KANAL SÜZGECİ BURADA UYGULANMAZ — VE BU BİLİNÇLİ. Haritanın işi
   * kanalları KARŞILAŞTIRMAK; üstteki süzgeç tek kanala indirilmişse harita
   * tek satıra düşer ve hiçbir şey söylemez. Sekme başlığında da yazıyor.
   */
  const isiSatirlari: IsiSatiri[] = kanalSecenekleri.map(([kod, ad]) => ({
    ad,
    hucreler: aylikSeri(
      satislar,
      { yil: bugun.yil, ay: bugun.ay },
      GRAFIK_AY_SAYISI,
      kod,
      seciliPara,
      iadeler,
    ).map((n) => n.adet),
  }));

  /* ⏱ SÜRE İZİ — TEST İÇİN AÇILDI (K332, kaldırılacak). */
  sureIsareti("grafik12");
  sureIziniYaz("panel-grafik");

  return (
    <>
        {/* ==================== AYLIK GRAFİK — SEKMELİ ====================
            K117 (kullanıcı isteği 31.08.2026): tek bir para grafiği yerine
            dört görünüm. İLKE #13 GEREĞİ SEKME, AYRI BLOK DEĞİL: dördü de
            "son 12 ayda ne oldu" sorusuna bakıyor ve aynı anda
            karşılaştırılmaları GEREKMİYOR — envanter değeri ile satış adedi
            yan yana konsa ikisi de küçülürdü. Seçim adreste durur.

            ⛔ VE SEKME BURADA YER KAZANMANIN KOLAY YOLU DEĞİL: birlikte
            okunması gereken rakamlar (ciro ile NET-2) AYNI sekmede kaldı. */}
        {/* K270: 12 aylık grafik ve alt tabloları telefonda yok — Raporlar menüde. */}
        <div className="max-md:hidden">
        <SekmeliBolum
          baslik={t("grafikBaslik", { ay: GRAFIK_AY_SAYISI })}
          secili={grafikSekmesi}
          sekmeler={[
            {
              anahtar: "para",
              etiket: t("grafikSekmePara"),
              adres: grafikAdresi("para"),
              icerik: (
                <div className="min-w-0 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {t("grafikNotu")}
                  </p>
            <CizgiGrafik
              noktalar={noktalar}
              gelirAdi={t("ciro")}
              net2Adi={t("net2")}
              bicimle={(deger) => bicim.para(deger, seciliPara)}
              bicimleKisa={(deger) => bicim.paraKisa(deger, seciliPara)}
              bosMesaj={t("grafikBos")}
              net2Goster={karGorunur}
            />

            {/* Grafiğin okunabilir hâli — dokunmatik cihazda ve ekran
                okuyucuda ASIL kaynak budur (bkz. cizgi-grafik.tsx). Bu yüzden
                SİLİNMEZ; `<details>` ekran okuyucuda "genişlet" olarak
                tanınır, erişilebilirlik kaybı olmaz. */}
            <KatlanirBolum
              baslik={t("aylikRakamlar")}
              notu={t("aylikRakamlarNotu")}
            >
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ay")}</TableHead>
                      <TableHead className="text-right">
                        {t("satisAdedi")}
                      </TableHead>
                      <TableHead className="text-right">{t("ciro")}</TableHead>
                      {karGorunur ? (
                        <TableHead className="text-right">{t("net1")}</TableHead>
                      ) : null}
                      {karGorunur ? (
                        <TableHead className="text-right">{t("net2")}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aylikSatirlar.map(({ nokta, etiket }) => (
                      <TableRow key={`${nokta.yil}-${nokta.ay}`}>
                        <TableCell className="whitespace-nowrap">
                          {etiket}
                        </TableCell>
                        <TableCell className="text-right">{nokta.adet}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <CiroSunumu
                            brut={bicim.para(nokta.gelir, seciliPara)}
                            iade={
                              nokta.iadeTutari > 0
                                ? bicim.para(nokta.iadeTutari, seciliPara)
                                : null
                            }
                            net={bicim.para(
                              nokta.gelir - nokta.iadeTutari,
                              seciliPara,
                            )}
                          />
                        </TableCell>
                        {karGorunur ? (
                          <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                            {bicim.para(nokta.net1, seciliPara)}
                          </TableCell>
                        ) : null}
                        {karGorunur ? (
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(nokta.net2, seciliPara)}
                            {/* K170-②: bu ayda devreden KDV — yalnız > 0 iken
                                (kanal kutusuyla AYNI desen, İlke #10). */}
                            {nokta.devreden > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("devredenKdvKisa", {
                                  tutar: bicim.para(nokta.devreden, seciliPara),
                                })}
                              </span>
                            ) : null}
                            {nokta.iadeAdedi > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("kanalIade", { sayi: nokta.iadeAdedi })}
                              </span>
                            ) : null}
                            {/* ⛔ AKSAKLIK SAYISI KAYNAĞINA GÖTÜRÜR (İlke #16).
                                Ay penceresi `OZEL` aralıkla veriliyor; bitiş
                                günü DAHİL (bkz. `pencereOlustur`). */}
                            {nokta.hesaplanamayanAdet > 0 ? (
                              <Link
                                href={karEksikAyAdresi(nokta.yil, nokta.ay)}
                                className="text-muted-foreground hover:text-foreground block text-xs underline underline-offset-2"
                              >
                                {t("kanalEksik", {
                                  sayi: nokta.hesaplanamayanAdet,
                                })}
                              </Link>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
                  </KatlanirBolum>
                </div>
              ),
            },
            {
              anahtar: "envanter",
              etiket: t("grafikSekmeEnvanter"),
              adres: grafikAdresi("envanter"),
              icerik: (
                <div className="min-w-0 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {t("envanterGrafikNotu")}
                  </p>
                  <TekSeriliGrafik
                    seriAdi={t("grafikSekmeEnvanter")}
                    noktalar={envanterNoktalari}
                    bicimle={(deger) => bicim.para(deger, "TRY")}
                    bicimleKisa={(deger) => bicim.paraKisa(deger, "TRY")}
                    bosMesaj={t("grafikBos")}
                  />
                  <KatlanirBolum
                    baslik={t("envanterRakamlari")}
                    notu={t("aylikRakamlarNotu")}
                  >
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("ay")}</TableHead>
                            <TableHead className="text-right">
                              {t("envanterDegeri")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("envanterAdedi")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...(envanterAylari ?? [])].reverse().map((a) => (
                            <TableRow key={`${a.yil}-${a.ay}`}>
                              <TableCell className="whitespace-nowrap">
                                {bicim.ayYil(
                                  gunDegeri({ yil: a.yil, ay: a.ay, gun: 1 }),
                                )}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {bicim.para(a.deger, "TRY")}
                                {/* ⛔ K116③ — BİLİNMEYEN GÖRÜNÜR, UYDURULMAZ.
                                    Maliyeti bilinmeyen parti toplama SIFIR
                                    olarak karışmaz; kaç adet olduğu YAZAR.
                                    Karışsaydı envanter olduğundan düşük
                                    görünür ve düşüşün sebebi görünmezdi. */}
                                {a.bilinmeyenAdet > 0 ? (
                                  <span className="text-muted-foreground block text-xs">
                                    {t("envanterBilinmeyen", {
                                      adet: a.bilinmeyenAdet,
                                    })}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {bicim.sayi(a.adet)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </KatlanirBolum>
                </div>
              ),
            },
            {
              anahtar: "adet",
              etiket: t("grafikSekmeAdet"),
              adres: grafikAdresi("adet"),
              icerik: (
                <div className="min-w-0 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {t("isiHaritasiNotu")}
                  </p>
                  {/* ⚠ ISI HARİTASI ZATEN TABLODUR — altına ikinci bir tablo
                      konmadı. Her hücrede rakam yazıyor; renk tek başına bilgi
                      taşımaz (renk körlüğü ve siyah-beyaz çıktı). */}
                  <IsiHaritasi
                    sutunlar={noktalar.map((n) => n.etiket)}
                    satirlar={isiSatirlari}
                    bicimle={(deger) => bicim.sayi(deger)}
                    bosMesaj={t("grafikBos")}
                    satirToplamiEtiketi={t("toplam")}
                    sutunToplamiEtiketi={t("toplam")}
                  />
                </div>
              ),
            },
            {
              anahtar: "iade",
              etiket: t("grafikSekmeIade"),
              adres: grafikAdresi("iade"),
              icerik: (
                <div className="min-w-0 space-y-6">
                  <p className="text-muted-foreground text-sm">
                    {t("iadeOraniNotu")}
                  </p>

                  {/* ═══ ÇİZGİ GRAFİK (kullanıcı isteği 07.09.2026) ═══
                      ⛔ TABLONUN GÖVDESİNDEN BESLENİYOR (`oran()`): ikinci bir
                      bölme yazılsaydı grafik ile tablo sessizce ayrışırdı.
                      ⚠ Aynı bileşen karşılaştırma sekmesinde de kullanılıyor —
                      seri seçimi, karışık birim kapısı ve `null` kesmesi
                      bedavaya geliyor; ikinci bir grafik gövdesi yazılmadı. */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("iadeOraniGrafik")}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t("iadeOraniGrafikNotu")}
                    </p>
                    <KarsilastirmaGrafigi
                      etiketler={noktalar.map((n) => n.etiket)}
                      seriler={iadeOraniSerileri}
                      baslangicSecim={["toplam"]}
                      bosMesaj={t("grafikBos")}
                      karisikBirimMesaji={t("karsilastirmaKarisikBirim")}
                      secimBosMesaji={t("karsilastirmaSecimBos")}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("iadeOraniAdet")}</h3>
                    <OranTablosu
                      sutunlar={noktalar.map((n) => n.etiket)}
                      satirlar={iadeAdetSatirlari}
                      bicimleOran={(d) => bicim.yuzde(d)}
                      /* ⭐ ORAN KAYNAĞINI YANINDA TAŞIR: "kaçta kaç". */
                      bicimleAyrinti={(h) =>
                        `${bicim.sayi(h.pay)}/${bicim.sayi(h.payda)}`
                      }
                      toplamEtiketi={t("toplam")}
                      bosMesaj={t("grafikBos")}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("iadeOraniTutar")}</h3>
                    <OranTablosu
                      sutunlar={noktalar.map((n) => n.etiket)}
                      satirlar={iadeTutarSatirlari}
                      bicimleOran={(d) => bicim.yuzde(d)}
                      bicimleAyrinti={(h) =>
                        `${bicim.paraKisa(h.pay, seciliPara)}/${bicim.paraKisa(
                          h.payda,
                          seciliPara,
                        )}`
                      }
                      toplamEtiketi={t("toplam")}
                      bosMesaj={t("grafikBos")}
                    />
                  </div>
                </div>
              ),
            },
            {
              anahtar: "karsilastirma",
              etiket: t("grafikSekmeKarsilastirma"),
              adres: grafikAdresi("karsilastirma"),
              icerik: (
                <div className="min-w-0 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {t("karsilastirmaNotu")}
                  </p>
                  <KarsilastirmaGrafigi
                    etiketler={noktalar.map((n) => n.etiket)}
                    seriler={karsilastirmaSerileri}
                    /* Açılış: kullanıcının verdiği örnek — Ciro ve NET-2. */
                    baslangicSecim={["ciro", "net2"]}
                    bosMesaj={t("grafikBos")}
                    karisikBirimMesaji={t("karsilastirmaKarisikBirim")}
                    secimBosMesaji={t("karsilastirmaSecimBos")}
                  />
                </div>
              ),
            },
            {
              anahtar: "marj",
              etiket: t("grafikSekmeMarj"),
              adres: grafikAdresi("marj"),
              icerik: (
                <div className="min-w-0 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {t("marjGrafikNotu")}
                  </p>
                  <TekSeriliGrafik
                    seriAdi={t("grafikSekmeMarj")}
                    noktalar={marjNoktalari}
                    bicimle={(deger) => bicim.yuzde(deger)}
                    bicimleKisa={(deger) => bicim.yuzde(deger)}
                    bosMesaj={t("grafikBos")}
                  />
                  <KatlanirBolum
                    baslik={t("marjRakamlari")}
                    notu={t("aylikRakamlarNotu")}
                  >
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("ay")}</TableHead>
                            <TableHead className="text-right">
                              {t("marjNetCiro")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("net2")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("marjSutunu")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aylikSatirlar.map(({ nokta, etiket }) => {
                            const marj = aylikMarj(nokta);
                            return (
                              <TableRow key={etiket}>
                                <TableCell className="whitespace-nowrap">
                                  {etiket}
                                </TableCell>
                                {/* ⚠ PAYDA EKRANDA YAZAR: kullanıcı marjı bu
                                    iki sütunu bölerek DOĞRULAYABİLMELİ. Payda
                                    gizli kalsaydı yüzde denetlenemez bir sayı
                                    olurdu (İlke #16). */}
                                <TableCell className="text-right whitespace-nowrap">
                                  {bicim.para(
                                    nokta.hesaplananGelir -
                                      nokta.hesaplananIadeTutari,
                                    seciliPara,
                                  )}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {bicim.para(nokta.net2, seciliPara)}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {/* ⛔ HESAPLANAMAYAN AY "%0" DEĞİL "—":
                                      sıfır "ölçtüm, sıfır çıktı" demektir. */}
                                  {marj === null ? (
                                    <span className="text-muted-foreground">
                                      {t("marjYok")}
                                    </span>
                                  ) : (
                                    bicim.yuzde(marj)
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </KatlanirBolum>
                </div>
              ),
            },
          ]}
        />
        </div>
    </>
  );
}
