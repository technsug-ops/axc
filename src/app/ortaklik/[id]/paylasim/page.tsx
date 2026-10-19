import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { Baglanti } from "@/components/baglanti";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { paylasimGetir } from "@/lib/ortaklik/paylasim-veri";
import { AnlasmaFormu, AnlasmaSil, type FormOrtagi } from "./anlasma-formu";
import { DonemGeriAl, DonemKesinlestir } from "./donem-eylemleri";
import { kesinlestirmeKontrolu } from "@/lib/ortaklik/kesinlestirme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Ortaklik");
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id: (await params).id }, select: { ad: true } });
  return { title: proje ? t("paylasimBasligi", { proje: proje.ad }) : t("baslik") };
}

/**
 * K347 · 4a — PAYLAŞIM: anlaşma sürümleri + ay ay önizleme. Hesap `lib/ortaklik/paylasim.ts`
 * (saf). Bu ekran YAZMAZ, yalnız gösterir; kesinleştirme ve ödeme 4b'dedir.
 * Para rakamları `satis.kar.gor` ister (proje sonucu ekranıyla aynı kapı).
 */
export default async function PaylasimSayfasi({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  const baglam = await sayfaIzni("ortaklik.yonet");
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id }, select: { id: true, ad: true, currency: true, baslangic: true } });
  if (!proje) notFound();
  const t = await getTranslations("Ortaklik");
  const bicim = await bicimlendirici();
  const karGorunur = baglam.izinler.has("satis.kar.gor");
  const para = (n: number) => bicim.para(n, proje.currency);

  const buAy = gunMetni(gunDegeri(isTakvimGunu(new Date()))).slice(0, 7);
  const ilkAy = gunMetni(proje.baslangic).slice(0, 7);
  const istenen = /^\d{4}-(0[1-9]|1[0-2])$/.test(p.ay ?? "") ? p.ay! : buAy;
  const ay = istenen < ilkAy ? ilkAy : istenen;

  const veri = await paylasimGetir(proje, ay);
  /** 4b — kesinleştirme kapısı: aynı saf kontrol eylemde de sorulur (ekran ile eylem ayrışmaz). */
  const muhasebeKapali = Boolean(await prisma.muhasebeDonemi.findFirst({ where: { yil: Number(ay.slice(0, 4)), ay: Number(ay.slice(5, 7)), durum: "KAPALI" }, select: { id: true } }));
  const kesinHatasi = kesinlestirmeKontrolu({ ay, buAy, muhasebeKapali, sonuclar: veri.sonuclar });
  const etkinDonem = veri.donemKayitlari.find((d) => gunMetni(d.ay).slice(0, 7) === ay) ?? null;
  const sonEtkinMi = Boolean(etkinDonem) && !veri.donemKayitlari.some((d) => gunMetni(d.ay).slice(0, 7) > ay);
  const secili = veri.sonuclar.find((s) => s.ay === ay) ?? null;
  const adlar = Object.fromEntries(veri.katilimlar.map((k) => [k.id, k.ortak.ad]));
  const son = veri.surumKayitlari.at(-1);
  const formOrtaklari: FormOrtagi[] = veri.katilimlar.map((k) => {
    const pay = son?.paylar.find((x) => x.katilimId === k.id);
    const s = (d: unknown) => (d === undefined ? "" : String(Number(d)));
    return { katilimId: k.id, ad: k.ortak.ad, sabitOran: s(pay?.sabitOran), emekUcreti: s(pay?.emekUcreti), sorumlulukPayi: s(pay?.sorumlulukPayi) };
  });
  const surumdeOlmayan = secili?.surumId
    ? veri.katilimlar.filter((k) => !veri.surumler.find((s) => s.id === secili.surumId)?.paylar.some((x) => x.katilimId === k.id))
    : [];
  const aylar = [...veri.sonuclar].reverse();
  const yontem = (s: { kalanYontemi: string; karmaSermayeYuzdesi: { toString(): string } | null }) =>
    s.kalanYontemi === "KARMA" ? t("kalan_KARMA_ozet", { yuzde: bicim.yuzde(Number(s.karmaSermayeYuzdesi), 2) }) : t(`kalan_${s.kalanYontemi}`);
  const uyari = `rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`;

  return <div className="min-w-0 space-y-6">
    <div className="space-y-2">
      <ListeyeDon href="/ortaklik">{t("baslik")}</ListeyeDon>
      <h1 className="text-2xl font-semibold">{t("paylasimBasligi", { proje: proje.ad })}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("paylasimAciklama")}</p>
      <div className="flex flex-wrap gap-x-4"><Baglanti href={`/ortaklik/${proje.id}`} className="inline-flex min-h-11 items-center text-sm md:min-h-0">{t("sonucuAc")}</Baglanti>
        <Baglanti href={`/ortaklik/${proje.id}/hesap`} className="inline-flex min-h-11 items-center text-sm md:min-h-0">{t("hesabiAc")}</Baglanti></div>
    </div>

    {karGorunur ? <section className="space-y-3">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="block space-y-1 text-sm">{t("paylasimAy")}<Input type="month" name="ay" defaultValue={ay} min={ilkAy} className="w-44" /></label>
        <Button type="submit" variant="secondary" className="min-h-11">{t("goster")}</Button>
      </form>
      <h2 className="text-lg font-semibold">{secili?.kesin ? t("kesinBaslik", { ay }) : t("onizlemeBaslik", { ay })}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{secili?.kesin ? t("kesinNotu") : t("onizlemeNotu")}</p>
      {secili?.bayat ? <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`} role="alert">{t("bayatUyari")}</p> : null}
      <div className="max-w-3xl space-y-2">
        {secili?.kesin ? (sonEtkinMi && etkinDonem ? <DonemGeriAl donemId={etkinDonem.id} ay={ay} /> : <p className="text-sm text-muted-foreground">{t("geriAlSonDegil")}</p>)
          : kesinHatasi === null ? <DonemKesinlestir projeId={proje.id} ay={ay} />
          : <p className="text-sm text-muted-foreground">{t(kesinHatasi)}{kesinHatasi === "KESIN_DONEM_ACIK" ? <> <Baglanti href="/ayarlar/donemler">{t("donemleriAc")}</Baglanti></> : null}</p>}
      </div>
      {!secili || secili.durum === "ANLASMA_YOK" ? <p className={uyari}>{t("durum_ANLASMA_YOK")}</p> : null}
      {secili?.durum === "SERMAYE_YOK" ? <p className={uyari}>{t("durum_SERMAYE_YOK")}</p> : null}
      {veri.karYok[ay] ? <p className={uyari}>{t("paylasimKarYok", { sayi: veri.karYok[ay] })}</p> : null}
      {surumdeOlmayan.length ? <p className={uyari}>{t("surumdeYok", { adlar: surumdeOlmayan.map((k) => k.ortak.ad).join(", ") })}</p> : null}
      {secili ? <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
        <IstatistikKutusu etiket={t("sonucDonem")} cocuk={<span>{para(secili.sonuc)}</span>} />
        <IstatistikKutusu etiket={t("paylasimUcret")} cocuk={<span>{para(secili.ucretToplami)}</span>} />
        <IstatistikKutusu etiket={t("paylasimMahsup")} cocuk={<span>{para(secili.mahsup)}</span>} />
        <IstatistikKutusu etiket={t("paylasimBolunen")} cocuk={<span>{para(secili.bolunen)}</span>} />
        <IstatistikKutusu etiket={t("paylasimDevreden")} cocuk={<span>{para(secili.devredenSonra)}</span>} />
        <IstatistikKutusu etiket={t("anlasmaKarKullanimi")} cocuk={<span className="text-base">{secili.karKullanimi ? t(`kullanim_${secili.karKullanimi}`) : "—"}</span>} />
      </div> : null}
      {secili?.durum === "TAMAM" ? <Table>
        <TableHeader><TableRow>
          <TableHead>{t("ortakSec")}</TableHead>
          <TableHead className="text-right">{t("anlasmaEmekUcreti")}</TableHead>
          <TableHead className="text-right">{t("paylasimPay")}</TableHead>
          <TableHead className="text-right">{t("paylasimHak")}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{Object.entries(secili.haklar).map(([kid, h]) => <TableRow key={kid}>
          <TableCell>{adlar[kid] ?? "—"}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(h.ucret)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(h.pay)}</TableCell>
          <TableCell className="text-right whitespace-nowrap font-medium">{para(h.toplam)}</TableCell>
        </TableRow>)}</TableBody>
        <TableFooter><TableRow>
          <TableCell>{t("paylasimToplam")}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(secili.ucretToplami)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(secili.bolunen)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(Object.values(secili.haklar).reduce((x, h) => x + h.toplam, 0))}</TableCell>
        </TableRow></TableFooter>
      </Table> : null}

      <h2 className="pt-2 text-lg font-semibold">{t("paylasimAylar")}</h2>
      <Table>
        <TableHeader><TableRow>
          <TableHead>{t("paylasimAy")}</TableHead>
          <TableHead className="text-right">{t("sonucDonem")}</TableHead>
          <TableHead className="text-right">{t("paylasimUcret")}</TableHead>
          <TableHead className="text-right">{t("paylasimBolunen")}</TableHead>
          <TableHead className="text-right">{t("paylasimDevreden")}</TableHead>
          <TableHead>{t("paylasimDurum")}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{aylar.map((s) => <TableRow key={s.ay}>
          <TableCell><Baglanti href={`/ortaklik/${proje.id}/paylasim?ay=${s.ay}`}>{s.ay}</Baglanti></TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(s.sonuc)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(s.ucretToplami)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(s.bolunen)}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(s.devredenSonra)}</TableCell>
          <TableCell className={s.bayat ? DURUM_YAZISI.olumsuz : s.durum === "TAMAM" ? "" : DURUM_YAZISI.uyari}>{s.kesin ? (s.bayat ? t("durumKesinBayat") : t("durumKesin")) : t(`durumKisa_${s.durum}`)}</TableCell>
        </TableRow>)}</TableBody>
        <TableFooter><TableRow>
          <TableCell>{t("paylasimToplam")}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(aylar.reduce((x, s) => x + s.sonuc, 0))}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(aylar.reduce((x, s) => x + s.ucretToplami, 0))}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(aylar.reduce((x, s) => x + s.bolunen, 0))}</TableCell>
          <TableCell colSpan={2} />
        </TableRow></TableFooter>
      </Table>
    </section> : <p className="text-sm text-muted-foreground">{t("sonucKarIzni")}</p>}

    <section className="max-w-3xl space-y-3">
      <h2 className="text-lg font-semibold">{t("anlasmaSurumleri", { sayi: veri.surumKayitlari.length })}</h2>
      {!veri.surumKayitlari.length ? <p className="text-sm text-muted-foreground">{t("anlasmaYok")}</p> : null}
      {[...veri.surumKayitlari].reverse().map((s) => {
        const surumAyi = gunMetni(s.gecerlilikAyi).slice(0, 7);
        return <article key={s.id} className="space-y-2 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><p className="font-medium">{t("anlasmaSurumBaslik", { ay: surumAyi })}</p>
              <p className="text-muted-foreground">{yontem(s)} · {t(`zarar_${s.zararYontemi}`)} · {t(`kullanim_${s.karKullanimi}`)}</p>
              {s.aciklama ? <p>{s.aciklama}</p> : null}</div>
            <div className="w-full md:w-auto"><AnlasmaSil id={s.id} ay={surumAyi} /></div>
          </div>
          <ul className="divide-y rounded border">{s.paylar.map((x) => <li key={x.id} className="flex flex-wrap justify-between gap-x-3 p-2">
            <span className="font-medium">{adlar[x.katilimId] ?? "—"}</span>
            <span className="text-muted-foreground">{t("anlasmaPayOzeti", { oran: bicim.yuzde(Number(x.sabitOran), 2), ucret: para(Number(x.emekUcreti)), sorumluluk: bicim.yuzde(Number(x.sorumlulukPayi), 2) })}</span>
          </li>)}</ul>
        </article>;
      })}
      <AnlasmaFormu
        projeId={proje.id}
        varsayilanAy={ay}
        ortaklar={formOrtaklari}
        baslangic={{
          kalanYontemi: son?.kalanYontemi ?? "SABIT",
          karmaSermayeYuzdesi: son?.karmaSermayeYuzdesi ? String(Number(son.karmaSermayeYuzdesi)) : "",
          zararYontemi: son?.zararYontemi ?? "DEVREDER",
          karKullanimi: son?.karKullanimi ?? "DAGIT",
        }}
      />
    </section>
  </div>;
}
