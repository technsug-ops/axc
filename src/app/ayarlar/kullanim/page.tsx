import { getTranslations } from "next-intl/server";
import { MousePointerClick } from "lucide-react";

import { HalkaGrafik, type HalkaDilimi } from "@/components/halka-grafik";
import { IstatistikKutusu, PayCubugu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { SekmeliBolum, type Sekme } from "@/components/sekmeli-bolum";
import { SuzgecCubugu } from "@/components/suzgec-cubugu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { gunBasiAni, gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import {
  GUNLUK_SUTUN_TAVANI,
  KULLANIM_LISTE_SINIRI,
  KULLANIM_SEKMELERI,
  kullanimSekmesi,
  payYuzde,
  saatEkseni,
  sayfaMenuAnahtari,
  zamanEkseni,
  type ZamanSutunu,
} from "@/lib/kullanim/firma-raporu";
import { hedefGorunumu } from "@/lib/kullanim/olay";
import { grafikSayimlari, ilkIzAni, kullanimOzeti, sekmeVerisi } from "@/lib/kullanim/rapor-veri";
import { KULLANIM_CIHAZ_RENKLERI } from "@/lib/renkler";
import type { KullanimListesi } from "@/lib/kullanim/firma-raporu";
import { pencereCoz } from "@/lib/liste-suzgeci";
import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import { suzgecAdresi } from "@/lib/suzgec";
import { sayfaIzni } from "@/lib/yetki";

import { GunGrafigi, SaatGrafigi } from "./grafikler";

/**
 * ============================================================================
 *  AYARLAR → KULLANIM (K334-③, kullanıcı kararı 14.10.2026)
 * ----------------------------------------------------------------------------
 *  «En çok nereler kullanılıyor, hangi tuşlara basılıyor, hangi sayfalarda ve
 *  nereden nereye geçiliyor.» İz `components/kullanim-izi.tsx`ten gelir;
 *  sayım `lib/kullanim/rapor-veri.ts`te, veritabanında.
 *
 *  ⚠ İZİN: mevcut `ayar.yaz` (kullanıcı kararı 14.10.2026) — yeni izin
 *  açılmadı; iki bacaklı izin kuralının riskine girmeden ayar yöneticisine açık.
 *
 *  ⚠ KUTUCUKLAR ARAMADAN BAĞIMSIZ (İlke #17), liste toplamı ARAMAYA bağlı ve
 *  ekranda «aramada» diye yazar. Toplam görünen satırların değil süzgecin
 *  tamamının toplamıdır (İlke #15) — 100 satır tavanı yalnız ÇİZİMİ sınırlar.
 *
 *  ⚠ İZİN DOĞUM TARİHİ yazar: ilk izden önceki günler için «kayıt yok» bir
 *  sonuç değildir.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

const TEMEL = "/ayarlar/kullanim";

export async function generateMetadata() {
  const t = await getTranslations("Kullanim");
  return { title: t("baslik") };
}

export default async function KullanimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ pencere?: string; baslangic?: string; bitis?: string; q?: string; sekme?: string }>;
}) {
  const baglam = await sayfaIzni("ayar.yaz");
  const p = await searchParams;
  const t = await getTranslations("Kullanim");
  const tMenu = await getTranslations("Menu");
  const bicim = await bicimlendirici();

  const pencere = pencereCoz(p);
  const sekme = kullanimSekmesi(p.sekme);
  const q = (p.q ?? "").trim();

  /** Menü ADIYLA arama: «Satışlar» yazan, `/satislar` kalıbını bulsun. */
  const aranan = q.toLocaleLowerCase("tr");
  const ekKaliplar =
    q === ""
      ? []
      : Object.entries(MENU_ADRESLERI)
          .filter(([anahtar]) => tMenu.has(anahtar) && tMenu(anahtar).toLocaleLowerCase("tr").includes(aranan))
          .map(([, adres]) => adres);

  const [ilk, ozet, veri, grafik] = await Promise.all([
    ilkIzAni(baglam.companyId),
    kullanimOzeti(baglam.companyId, pencere.aralik),
    sekmeVerisi(sekme, baglam.companyId, pencere.aralik, q, ekKaliplar),
    grafikSayimlari(baglam.companyId, pencere.aralik),
  ]);

  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.ilkGun)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : t("tumZaman");
  const toplamOlay = ozet.sayfa + ozet.tiklama;
  /** Liste satırının payı — çubuk + yazı (renk tek başına konuşmaz). Payda: o listenin TOPLAMI (süzgeç + arama). */
  const payHucresi = (adet: number, toplam: number) => {
    const y = payYuzde(adet, toplam);
    return (
      <TableCell>
        <span className="flex w-28 sm:w-36">
          <PayCubugu oran={y === null ? 0 : y / 100} etiket={y === null ? "—" : bicim.yuzde(y)} />
        </span>
      </TableCell>
    );
  };

  /** Sayfa kalıbı → «Satışlar» + kalıp; menüde adı yoksa yalnız kalıp. */
  const sayfaAdi = (kalip: string) => {
    const anahtar = sayfaMenuAnahtari(kalip);
    const ad = anahtar && tMenu.has(anahtar) ? tMenu(anahtar) : null;
    return (
      <span className="flex min-w-0 flex-col">
        {ad ? <span className="font-medium break-words">{ad}</span> : null}
        <span className={`${ad ? "text-muted-foreground text-xs" : "font-medium"} font-mono break-all`}>{kalip}</span>
      </span>
    );
  };

  const hedefAdi = (hedef: string) => {
    const h = hedefGorunumu(hedef);
    if (h.tur === "DIS") return <span className="text-muted-foreground italic">{t("disBaglanti")}</span>;
    if (h.tur === "BAGLANTI")
      return (
        <span className="flex min-w-0 items-start gap-1">
          <span className="text-muted-foreground shrink-0">{t("baglantiOn")}</span>
          {sayfaAdi(h.kalip)}
        </span>
      );
    return <span className="font-medium break-words">«{h.metin}»</span>;
  };

  /** Liste başlığı: kaç farklı satır, toplam kaç olay; aramada mı; tavan aşıldı mı. */
  const listeOzeti = (liste: KullanimListesi<{ adet: number }>, birim: string) => (
    <div className="text-muted-foreground mb-2 space-y-1 text-sm">
      <p>
        {q === ""
          ? t("listeOzeti", { farkli: bicim.sayi(liste.farkli), toplam: bicim.sayi(liste.toplam), birim })
          : t("listeOzetiArama", { q, farkli: bicim.sayi(liste.farkli), toplam: bicim.sayi(liste.toplam), birim })}
      </p>
      {liste.farkli > KULLANIM_LISTE_SINIRI ? (
        <p>{t("tavanNotu", { sinir: bicim.sayi(KULLANIM_LISTE_SINIRI), farkli: bicim.sayi(liste.farkli) })}</p>
      ) : null}
    </div>
  );

  const bos = <p className="text-muted-foreground py-6 text-center text-sm">{q === "" ? t("bos") : t("bosArama", { q })}</p>;

  /** Toplam satırı — İlke #15: tek tek gösterilen yerde toplam da olur. */
  const toplamSatiri = (sutun: number, toplam: number) => (
    <TableRow className="bg-muted/40 font-semibold">
      <TableCell colSpan={sutun}>{t("toplam")}</TableCell>
      <TableCell className="text-right tabular-nums">{bicim.sayi(toplam)}</TableCell>
      <TableCell />
    </TableRow>
  );

  let icerik: React.ReactNode;
  if (veri.liste.farkli === 0) {
    icerik = bos;
  } else if (veri.sekme === "sayfalar") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimAcilis"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunSayfa")}</TableHead>
              <TableHead className="text-right">{t("sutunAcilis")}</TableHead>
              <TableHead>{t("sutunPay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.ad)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
                {payHucresi(s.adet, veri.liste.toplam)}
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell>{t("toplam")}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplam)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  } else if (veri.sekme === "dugmeler") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimTiklama"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunDugme")}</TableHead>
              <TableHead>{t("sutunHangiSayfada")}</TableHead>
              <TableHead className="text-right">{t("sutunTiklama")}</TableHead>
              <TableHead>{t("sutunPay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {hedefAdi(s.hedef)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.sayfa)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
                {payHucresi(s.adet, veri.liste.toplam)}
              </TableRow>
            ))}
            {toplamSatiri(2, veri.liste.toplam)}
          </TableBody>
        </Table>
      </>
    );
  } else if (veri.sekme === "gecisler") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimGecis"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunNereden")}</TableHead>
              <TableHead>{t("sutunNereye")}</TableHead>
              <TableHead className="text-right">{t("sutunGecis")}</TableHead>
              <TableHead>{t("sutunPay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.nereden)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.nereye)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
                {payHucresi(s.adet, veri.liste.toplam)}
              </TableRow>
            ))}
            {toplamSatiri(2, veri.liste.toplam)}
          </TableBody>
        </Table>
      </>
    );
  } else {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimOlay"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunKullanici")}</TableHead>
              <TableHead className="text-right">{t("sutunAcilis")}</TableHead>
              <TableHead className="text-right">{t("sutunTiklama")}</TableHead>
              <TableHead>{t("sutunSonGorulme")}</TableHead>
              <TableHead>{t("sutunPay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.kullaniciId ?? "silinmis"}>
                <TableCell className="whitespace-normal font-medium">
                  {s.kullaniciId === null || s.ad === "" ? <span className="text-muted-foreground italic">{t("silinmisKullanici")}</span> : s.ad}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.sayfa)}</TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.tiklama)}</TableCell>
                <TableCell className="whitespace-nowrap">{s.sonGorulme ? bicim.tarihSaat(s.sonGorulme) : "—"}</TableCell>
                {payHucresi(s.adet, veri.liste.toplam)}
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell>{t("toplam")}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplamSayfa)}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplamTiklama)}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  }

  const tasinan = { pencere: p.pencere, baslangic: p.baslangic, bitis: p.bitis, q: p.q };

  /* ═══ GRAFİKLER — eksen İZİN DOĞUMUNDAN bugüne kadar; pencere varsa onun içinde ═══ */
  const simdi = new Date();
  const bugunGun = gunDegeri(isTakvimGunu(simdi));
  const dogumGun = ilk ? gunDegeri(isTakvimGunu(ilk)) : null;
  const eksen = dogumGun
    ? zamanEkseni(grafik.gunler, pencere.pencere?.ilkGun ?? dogumGun, pencere.pencere?.sonGun ?? bugunGun, dogumGun, bugunGun)
    : { kova: "GUN" as const, sutunlar: [] as ZamanSutunu[] };
  const sutunAdi = (s: ZamanSutunu) => (eksen.kova === "AY" ? bicim.ayYil(s.ilk) : bicim.tarih(s.ilk));
  const gunSutunlari = eksen.sutunlar.map((s) => ({
    anahtar: s.anahtar,
    sayfa: s.sayfa,
    tiklama: s.tiklama,
    ipucu: t("gunIpucu", { tarih: sutunAdi(s), sayfa: bicim.sayi(s.sayfa), tiklama: bicim.sayi(s.tiklama) }),
    adres: suzgecAdresi(TEMEL, { ...tasinan, sekme: p.sekme }, { pencere: "OZEL", baslangic: gunMetni(s.ilk), bitis: gunMetni(s.son) }),
  }));
  const gunEnBuyuk = Math.max(0, ...eksen.sutunlar.map((s) => s.sayfa + s.tiklama));
  const saatler = saatEkseni(grafik.saatler);
  const gunBasi = gunBasiAni(isTakvimGunu(simdi)).getTime();
  /** «09:00» — saat de dil altyapısından (İstanbul saat dilimiyle) biçimlenir. */
  const saatAdi = (h: number) => bicim.saat(new Date(gunBasi + h * 3_600_000));
  const saatIpuclari = saatler.map((adet, h) => t("saatIpucu", { bas: saatAdi(h), bit: saatAdi(h + 1), adet: bicim.sayi(adet) }));
  const saatEtiketleri = saatler.map((_, h) => (h % 6 === 0 ? saatAdi(h) : ""));
  const cihazSirasi = ["TELEFON", "MASAUSTU", "TABLET"] as const;
  const cihazAdi = { TELEFON: t("kutuTelefon"), MASAUSTU: t("kutuMasaustu"), TABLET: t("kutuTablet") };
  const cihazDilimleri: HalkaDilimi[] = cihazSirasi
    .filter((c) => ozet.cihaz[c] > 0)
    .map((c) => ({ etiket: cihazAdi[c], tutar: ozet.cihaz[c], tutarMetni: t("olaySayisi", { n: bicim.sayi(ozet.cihaz[c]) }), renk: KULLANIM_CIHAZ_RENKLERI[c] }));
  const kullanilmayanCihaz = cihazSirasi.filter((c) => ozet.cihaz[c] === 0).map((c) => cihazAdi[c]);
  const cihazPayi = (c: (typeof cihazSirasi)[number]) => {
    const y = payYuzde(ozet.cihaz[c], toplamOlay);
    return y === null ? "—" : bicim.yuzde(y);
  };
  const sekmeler: Sekme[] = KULLANIM_SEKMELERI.map((s) => ({
    anahtar: s,
    etiket: t(`sekme.${s}`),
    adres: suzgecAdresi(TEMEL, tasinan, { sekme: s === "sayfalar" ? undefined : s }),
    icerik: s === sekme ? icerik : null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MousePointerClick className="size-6" aria-hidden />
          {t("baslik")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {ilk ? t("izDogumu", { tarih: bicim.tarihSaat(ilk) }) : t("izYok")}
        </p>
      </div>

      <SuzgecCubugu
        temelAdres={TEMEL}
        mevcut={p}
        suzgecler={[]}
        zaman={{
          secili: pencere.tur,
          aralikMetni: pencere.pencere ? aralikMetni : "",
          baslangic: p.baslangic ?? "",
          bitis: p.bitis ?? "",
        }}
      />
      <p className="text-muted-foreground text-xs">{t("donem", { aralik: aralikMetni })}</p>

      {/* İlke #12 — kompakt kutucuk ızgarası; aramadan BAĞIMSIZ, dönemin tamamı. */}
      <div className="grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        <IstatistikKutusu etiket={t("kutuSayfa")} cocuk={bicim.sayi(ozet.sayfa)} bas />
        <IstatistikKutusu etiket={t("kutuTiklama")} cocuk={bicim.sayi(ozet.tiklama)} />
        <IstatistikKutusu etiket={t("kutuAktifGun")} cocuk={bicim.sayi(ozet.aktifGun)} altNot={t("kutuAktifGunNot")} />
        <IstatistikKutusu etiket={t("kutuKullanici")} cocuk={bicim.sayi(ozet.kullanici)} />
      </div>

      {/* K334-③ görsel turu — aramadan BAĞIMSIZ, kutucuklarla aynı dönem. */}
      {toplamOlay === 0 ? (
        <p className="text-muted-foreground text-sm">{t("grafikBos")}</p>
      ) : (
        <div className="grid max-w-5xl gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{eksen.kova === "AY" ? t("grafikAyBaslik") : t("grafikGunBaslik")}</CardTitle>
              <p className="text-muted-foreground text-xs">
                {eksen.kova === "AY" ? t("grafikAyNot", { sinir: bicim.sayi(GUNLUK_SUTUN_TAVANI) }) : t("grafikGunNot")}
              </p>
            </CardHeader>
            <CardContent>
              <GunGrafigi
                sutunlar={gunSutunlari}
                lejantSayfa={t("kutuSayfa")}
                lejantTiklama={t("kutuTiklama")}
                ilkEtiket={eksen.sutunlar.length > 0 ? sutunAdi(eksen.sutunlar[0]!) : ""}
                sonEtiket={eksen.sutunlar.length > 0 ? sutunAdi(eksen.sutunlar[eksen.sutunlar.length - 1]!) : ""}
                enYuksekMetni={t("enYuksek", { n: bicim.sayi(gunEnBuyuk) })}
                aciklama={t("gunAciklama", { n: bicim.sayi(eksen.sutunlar.length) })}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("grafikSaatBaslik")}</CardTitle>
              <p className="text-muted-foreground text-xs">{t("grafikSaatNot")}</p>
            </CardHeader>
            <CardContent>
              <SaatGrafigi
                saatler={saatler}
                ipuclari={saatIpuclari}
                eksenEtiketleri={saatEtiketleri}
                enYuksekMetni={t("enYuksek", { n: bicim.sayi(Math.max(0, ...saatler)) })}
                aciklama={t("saatAciklama")}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("grafikCihazBaslik")}</CardTitle>
            </CardHeader>
            <CardContent>
              <HalkaGrafik
                dilimler={cihazDilimleri}
                toplam={toplamOlay}
                toplamMetni={bicim.sayi(toplamOlay)}
                toplamEtiketi={t("cihazToplam")}
                yuzdeMetni={(oran) => bicim.yuzde(oran)}
                dipnot={kullanilmayanCihaz.length > 0 ? t("cihazKullanilmayan", { liste: kullanilmayanCihaz.join(", ") }) : undefined}
                bosMesaj={t("grafikBos")}
                aciklama={t("cihazAciklama", { telefon: cihazPayi("TELEFON"), masaustu: cihazPayi("MASAUSTU"), tablet: cihazPayi("TABLET") })}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <KodAramaKutusu
        temelAdres={TEMEL}
        baslangic={p.q ?? ""}
        tasinanlar={{ pencere: p.pencere, baslangic: p.baslangic, bitis: p.bitis, sekme: p.sekme }}
        ipucu={t("aramaIpucu")}
      />

      <SekmeliBolum sekmeler={sekmeler} secili={sekme} notu={t(`sekmeNotu.${sekme}`)} />
    </div>
  );
}
