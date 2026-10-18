import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { Baglanti } from "@/components/baglanti";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { gunMetni, PENCERE_TURLERI, PencereHatasi, pencereOlustur, type Pencere, type PencereTuru } from "@/lib/donem";
import { PencereSecici } from "@/app/rapor/pencere-secici";
import { projeSonucuGetir } from "@/lib/ortaklik/sonuc-veri";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Ortaklik");
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id: (await params).id }, select: { ad: true } });
  return { title: proje ? t("sonucBasligi", { proje: proje.ad }) : t("baslik") };
}

/**
 * PROJE SONUCU (K347 · Aşama 3a) — projeye işaretli partilerden yapılan satışların
 * payı. Hesap `lib/ortaklik/sonuc.ts`te (saf gövde); bu sayfa yalnız okur ve çizer.
 * ⚠ KÂR İZNİ AYRI: NET ve maliyet `satis.kar.gor` ister — ortaklık izni kârı
 * görmeye yetmez (anayasa: «yetki taşımada düşmüştü»). İzin yoksa adet ve ciro kalır.
 */
export default async function ProjeSonucuSayfasi({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pencere?: string; baslangic?: string; bitis?: string; q?: string }>;
}) {
  const baglam = await sayfaIzni("ortaklik.yonet");
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id }, select: { id: true, ad: true, currency: true, baslangic: true } });
  if (!proje) notFound();

  const t = await getTranslations("Ortaklik");
  const bicim = await bicimlendirici();
  const karGorunur = baglam.izinler.has("satis.kar.gor");
  const para = (n: number) => bicim.para(n, proje.currency);

  const istenen = (p.pencere ?? "BU_AY") as PencereTuru;
  const tur: PencereTuru = PENCERE_TURLERI.includes(istenen) ? istenen : "BU_AY";
  let pencere: Pencere;
  let pencereHatasi: string | null = null;
  try {
    pencere = pencereOlustur(tur, new Date(), { baslangic: p.baslangic ?? "", bitis: p.bitis ?? "" });
  } catch (hata) {
    // Bozuk aralık sessizce «bu ay»a düşmez; NEDEN düştüğü yazılır (İlke #5).
    pencereHatasi = t(hata instanceof PencereHatasi && hata.kod === "TERS_ARALIK" ? "aralikTers" : "aralikGecersiz");
    pencere = pencereOlustur("BU_AY", new Date());
  }

  const sonuc = await projeSonucuGetir(proje, pencere);
  const q = (p.q ?? "").trim();
  const satirlar = q ? sonuc.satirlar.filter((s) => (s.kod ?? "").includes(q)) : sonuc.satirlar;
  /** İlke #15: tablo toplamı GÖRÜNEN satırların toplamıdır; yalnız hesaplanmış satırlar toplanır. */
  const gorunenToplam = satirlar.filter((s) => s.durum === "HESAPLANDI").reduce(
    (t2, s) => ({ adet: t2.adet + s.projeAdedi, ciro: t2.ciro + s.ciro, maliyet: t2.maliyet + (s.maliyet ?? 0), net2: t2.net2 + (s.net2 ?? 0), iade: t2.iade + s.iadeNet2 }),
    { adet: 0, ciro: 0, maliyet: 0, net2: 0, iade: 0 },
  );
  const tasinanlar = { pencere: p.pencere, baslangic: p.baslangic, bitis: p.bitis };

  return <div className="min-w-0 space-y-6">
    <div className="space-y-2">
      <ListeyeDon href="/ortaklik">{t("baslik")}</ListeyeDon>
      <h1 className="text-2xl font-semibold">{t("sonucBasligi", { proje: proje.ad })}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("sonucAciklama", { tarih: bicim.tarih(proje.baslangic) })}</p>
    </div>

    <PencereSecici temelAdres={`/ortaklik/${proje.id}`} secili={tur} baslangic={p.baslangic ?? gunMetni(pencere.ilkGun)} bitis={p.bitis ?? gunMetni(pencere.sonGun)} />
    {pencereHatasi ? <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>{pencereHatasi}</p> : null}

    <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
      <IstatistikKutusu etiket={t("sonucAdet")} cocuk={<span>{sonuc.toplam.adet}</span>} />
      <IstatistikKutusu etiket={t("sonucCiro")} cocuk={<span>{para(sonuc.toplam.ciro)}</span>} />
      {karGorunur ? <>
        <IstatistikKutusu etiket={t("sonucMaliyet")} cocuk={<span>{para(sonuc.toplam.maliyet)}</span>} />
        <IstatistikKutusu etiket={t("sonucNet2")} cocuk={<span>{para(sonuc.toplam.net2)}</span>} altNot={<span className="text-muted-foreground block">{t("sonucNet1", { tutar: para(sonuc.toplam.net1) })}</span>} />
        <IstatistikKutusu etiket={t("sonucIade")} cocuk={<span>{para(sonuc.toplam.iadeNet2)}</span>} />
        <IstatistikKutusu etiket={t("sonucIadeSonrasi")} cocuk={<span>{para(sonuc.toplam.net2 + sonuc.toplam.iadeNet2)}</span>} />
      </> : null}
    </div>
    {!karGorunur ? <p className="text-sm text-muted-foreground">{t("sonucKarIzni")}</p> : null}

    {/* Toplama GİRMEYENLER sessizce düşmez (anayasa: «boş sonuç ile temiz sonuç ayrılır»). */}
    <div className="max-w-3xl space-y-2 text-sm">
      {sonuc.karYok > 0 ? <p className={`rounded-md p-3 ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>{t("sonucKarYok", { sayi: sonuc.karYok })}</p> : null}
      {sonuc.birimFarkli > 0 ? <p className={`rounded-md p-3 ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>{t("sonucBirimFarkli", { sayi: sonuc.birimFarkli, birim: proje.currency })}</p> : null}
      {sonuc.iadeHesaplanamayan > 0 ? <p className={`rounded-md p-3 ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>{t("sonucIadeHesaplanamayan", { sayi: sonuc.iadeHesaplanamayan })}</p> : null}
      <p className="text-muted-foreground">{t("sonucSinir")}</p>
    </div>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("sonucSatislar", { sayi: sonuc.satirlar.length })}</h2>
      <div className="max-w-3xl space-y-1">
        <KodAramaKutusu temelAdres={`/ortaklik/${proje.id}`} baslangic={q} tasinanlar={tasinanlar} ipucu={t("sonucAramaIpucu")} />
        {q ? <p className="text-sm text-muted-foreground">{t("sonucAramaSonucu", { sayi: satirlar.length, toplam: sonuc.satirlar.length })}</p> : null}
      </div>
      {!satirlar.length ? <p className="max-w-3xl text-sm text-muted-foreground">{q ? t("aramadaYok") : t("sonucBos")}</p> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("sutunTarih")}</TableHead>
            <TableHead>{t("sutunSiparis")}</TableHead>
            <TableHead>{t("sutunKanal")}</TableHead>
            <TableHead className="text-right">{t("sutunProjeAdedi")}</TableHead>
            <TableHead className="text-right">{t("sonucCiro")}</TableHead>
            {karGorunur ? <>
              <TableHead className="text-right">{t("sonucMaliyet")}</TableHead>
              <TableHead className="text-right">{t("sonucNet2")}</TableHead>
            </> : null}
          </TableRow></TableHeader>
          <TableBody>{satirlar.map((s) => <TableRow key={s.satisId}>
            <TableCell className="whitespace-nowrap">{bicim.tarih(s.tarih)}</TableCell>
            <TableCell><div className="flex items-center gap-1">
              <Baglanti href={`/satislar/${s.satisId}`}>{s.kod ?? t("kodsuzSatis")}</Baglanti>
              {s.kod ? <KopyalanabilirKod deger={s.kod} etiket={t("sutunSiparis")} sadeceIkon /> : null}
            </div></TableCell>
            <TableCell className="min-w-40">{s.kanal}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{t("projeAdediMetni", { proje: s.projeAdedi, toplam: s.toplamAdet })}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{para(s.ciro)}</TableCell>
            {karGorunur ? <>
              <TableCell className="text-right whitespace-nowrap">{s.maliyet === null ? "—" : para(s.maliyet)}</TableCell>
              {/* İade etkisi AYRI SÜTUN DEĞİL — NET-2 hücresinin altında, yalnız varsa (sütun tavanı 7). */}
              <TableCell className="text-right whitespace-nowrap">{s.durum === "HESAPLANDI" ? para(s.net2!) : <span className={DURUM_YAZISI.uyari}>{t(s.durum === "KAR_YOK" ? "durumKarYok" : "durumBirim")}</span>}
                {s.iadeNet2 ? <span className="text-muted-foreground block text-xs">{t("satirIade", { tutar: para(s.iadeNet2) })}</span> : null}</TableCell>
            </> : null}
          </TableRow>)}</TableBody>
          <TableFooter><TableRow>
            <TableCell colSpan={3}>{q ? t("aramadakiToplam", { sayi: satirlar.length }) : t("donemToplami")}</TableCell>
            <TableCell className="text-right">{gorunenToplam.adet}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{para(gorunenToplam.ciro)}</TableCell>
            {karGorunur ? <>
              <TableCell className="text-right whitespace-nowrap">{para(gorunenToplam.maliyet)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{para(gorunenToplam.net2)}
                {gorunenToplam.iade ? <span className="text-muted-foreground block text-xs">{t("satirIade", { tutar: para(gorunenToplam.iade) })}</span> : null}</TableCell>
            </> : null}
          </TableRow></TableFooter>
        </Table>
      )}
    </section>
  </div>;
}
