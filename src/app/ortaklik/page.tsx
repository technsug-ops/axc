import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import type { Prisma } from "@/generated/prisma/client";
import { OrtaklikFormu } from "./form";
import { FinansmanBagFormu, FinansmanBagiCoz } from "./finansman-formu";
import Link from "@/components/niyetli-baglanti";
import { Baglanti } from "@/components/baglanti";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";
import { baglanabilirOrtaklikKaynaklari } from "@/lib/finansman/veri";
import { KapsamKuralFormu, KapsamKuralSil } from "./kapsam-formlari";
import { AdDuzenle, KatilimDuzenle } from "./duzenle-diyaloglari";
import { KayitSil } from "./onayli-eylem";
import { KATKI_TURLERI } from "./katki";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { SatirEylemleri } from "@/components/satir-eylemi";
import { aramaKosulu } from "@/lib/varyant-arama-kurali";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Ortaklik");
  return { title: t("baslik") };
}

/**
 * Arama (İlke #17): proje adı · ortak adı · kurallı ürünün kodu. Sayılar aramadan
 * BAĞIMSIZ toplamı da söyler — ekrandaki sayının neyi saydığı belli olsun.
 */
function projeAramasi(q: string): Prisma.OrtaklikProjesiWhereInput {
  if (!q) return {};
  return { OR: [
    { ad: { contains: q } },
    { katilimlar: { some: { ortak: { ad: { contains: q } } } } },
    // Ürün kodu dalı ortak gövdeden: SKU · Firma SKU · barkod (UPC-A↔EAN-13 eşdeğeri dahil) · kanal kodu · ürün adı.
    // PASİF DAHİL: kural, sonradan pasife alınmış bir ürüne bağlı kalabilir; o kuralı bulup
    // kaldırabilmek için arama pasif ürünü ELEMEZ.
    { kapsamKurallari: { some: { variant: { OR: aramaKosulu(q) } } } },
  ] };
}

export default async function OrtaklikSayfasi({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const baglam = await sayfaIzni("ortaklik.yonet");
  const q = ((await searchParams).q ?? "").trim();
  const t = await getTranslations("Ortaklik");
  const tf = await getTranslations("Finansman");
  const ortakMetin = await getTranslations("Ortak");
  const bicim = await bicimlendirici();
  const finansmanYetkisi = baglam.izinler.has("finansman.yonet");
  const alimYetkisi = baglam.izinler.has("alim.yaz");
  const [projeler, projeToplami, tumProjeler, ortaklar, ortakToplami, tumOrtaklar, kaynaklar] = await Promise.all([
    prisma.ortaklikProjesi.findMany({
      where: projeAramasi(q),
      include: {
        _count: { select: { alimKalemleri: true } },
        kapsamKurallari: { include: { variant: { select: { sku: true, companySku: true, product: { select: { name: true } } } } } },
        katilimlar: { include: { ortak: true, finansmanKaynaklari: { select: { id: true, kaynakAdi: true, tur: true, birim: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ortaklikProjesi.count(),
    prisma.ortaklikProjesi.findMany({ select: { id: true, ad: true, currency: true, katilimlar: { where: { OR: [{ sermaye: true }, { finansman: true }] }, select: { id: true, ortak: { select: { ad: true } } } } }, orderBy: { ad: "asc" } }),
    prisma.isOrtagi.findMany({ where: q ? { ad: { contains: q } } : {}, include: { _count: { select: { katilimlar: true } } }, orderBy: { ad: "asc" } }),
    prisma.isOrtagi.count(),
    prisma.isOrtagi.findMany({ select: { id: true, ad: true }, orderBy: { ad: "asc" } }),
    finansmanYetkisi ? baglanabilirOrtaklikKaynaklari() : [],
  ]);
  return <div className="min-w-0 space-y-6">
    {/* Arama hatırlanır: proje sonucundan «← İş Ortakları» aynı aramaya döner (liste hafızası). */}
    <ListeyiHatirla temel="/ortaklik" etiket={t("baslik")} />
    <div><h1 className="text-2xl font-semibold">{t("baslik")}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("aciklama")}</p></div>
    <p className="max-w-3xl text-sm text-muted-foreground">{t("taslakAciklama")}</p>
    <div className="grid gap-4 lg:grid-cols-3">
      <OrtaklikFormu tur="proje" /><OrtaklikFormu tur="ortak" />
      <OrtaklikFormu tur="katilim" ortaklar={tumOrtaklar} projeler={tumProjeler.map(p => ({ id: p.id, ad: p.ad }))} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {finansmanYetkisi && <FinansmanBagFormu
        katilimlar={tumProjeler.flatMap(p => p.katilimlar.map(k => ({ id: k.id, ad: `${p.ad} · ${k.ortak.ad} · ${p.currency}` })))}
        kaynaklar={kaynaklar.map(k => ({ id: k.id, ad: `${k.kaynakAdi} · ${tf(`tur.${k.tur}`)} · ${k.birim}` }))}
      />}
      {alimYetkisi && <KapsamKuralFormu projeler={tumProjeler.map(p => ({ id: p.id, ad: p.ad }))} />}
    </div>
    <div className="max-w-3xl space-y-2">
      <KodAramaKutusu temelAdres="/ortaklik" baslangic={q} tasinanlar={{}} ipucu={t("aramaIpucu")} />
      {q ? <p className="text-sm text-muted-foreground">{t("aramaSonucu", { proje: projeler.length, projeToplam: projeToplami, ortak: ortaklar.length, ortakToplam: ortakToplami })}</p> : null}
    </div>
    <section className="max-w-3xl space-y-3"><h2 className="text-lg font-semibold">{t("ortaklarSayili", { sayi: ortakToplami })}</h2>
      {!ortaklar.length && <p className="text-sm text-muted-foreground">{q ? t("aramadaYok") : t("ortakYok")}</p>}
      <ul className="divide-y rounded-lg border">{ortaklar.map(o => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="min-w-0"><p className="font-medium">{o.ad}</p><p className="text-sm text-muted-foreground">{t("ortakProjeSayisi", { sayi: o._count.katilimlar })}</p></div>
        <div className="w-full md:w-auto"><SatirEylemleri>
          <AdDuzenle tur="ortak" id={o.id} ad={o.ad} />
          <KayitSil tur="ortak" id={o.id} baslik={t("silBaslik", { ad: o.ad })} aciklama={t(o._count.katilimlar ? "silinemezBagli" : "silNotu")} />
        </SatirEylemleri></div>
      </li>)}</ul>
    </section>
    <section className="max-w-3xl space-y-4"><h2 className="text-lg font-semibold">{t("projelerSayili", { sayi: projeToplami })}</h2>
      {!projeler.length && <p className="text-sm text-muted-foreground">{q ? t("aramadaYok") : t("projeYok")}</p>}
      {projeler.map(p => {
        const bagli = p.katilimlar.length + p._count.alimKalemleri + p.kapsamKurallari.length;
        return <article key={p.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h3 className="font-semibold">{p.ad} <span className="ml-1 rounded bg-muted px-2 py-0.5 text-xs font-normal">{t("taslak")}</span></h3>
              <p className="text-sm text-muted-foreground">{t("projeOzeti", { tarih: bicim.tarih(p.baslangic), birim: p.currency, sayi: p.katilimlar.length })}</p>
              <p className="text-sm">{t("kapsamKalemSayisi", { sayi: p._count.alimKalemleri })}</p>
              <Baglanti href={`/ortaklik/${p.id}`} className="mt-1 inline-flex min-h-11 items-center text-sm md:min-h-0">{t("sonucuAc")}</Baglanti></div>
            <div className="w-full md:w-auto"><SatirEylemleri>
              <AdDuzenle tur="proje" id={p.id} ad={p.ad} />
              <KayitSil tur="proje" id={p.id} baslik={t("silBaslik", { ad: p.ad })} aciklama={t(bagli ? "silinemezBagli" : "silNotu")} />
            </SatirEylemleri></div>
          </div>
          {p.kapsamKurallari.length > 0 && <div className="space-y-2"><h4 className="text-sm font-medium">{t("otomatikKurallar")}</h4>
            <ul className="divide-y rounded border">{p.kapsamKurallari.map(k => <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 text-sm"><p className="font-medium">{k.variant.product.name}</p>
                <div className="flex flex-wrap gap-x-3"><KopyalanabilirKod deger={k.variant.sku} etiket={ortakMetin("sku")} /><KopyalanabilirKod deger={k.variant.companySku} etiket={ortakMetin("firmaSku")} /></div></div>
              {alimYetkisi && <div className="w-full md:w-auto"><SatirEylemleri><KapsamKuralSil id={k.id} sku={k.variant.sku} /></SatirEylemleri></div>}
            </li>)}</ul></div>}
          {!p.katilimlar.length && <p className="text-sm">{t("katilimYok")}</p>}
          <ul className="divide-y">{p.katilimlar.map(k => <li key={k.id} className="space-y-2 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-medium">{k.ortak.ad}</p><p className="text-sm">{k.sorumluluk}</p>
                <p className="text-sm text-muted-foreground">{KATKI_TURLERI.filter(a => k[a]).map(a => t(a)).join(" · ")}</p></div>
              <div className="w-full md:w-auto"><SatirEylemleri>
                <KatilimDuzenle id={k.id} sorumluluk={k.sorumluluk} katkilar={{ sermaye: k.sermaye, emek: k.emek, komisyon: k.komisyon, finansman: k.finansman }} />
                <KayitSil tur="katilim" id={k.id} baslik={t("katilimSilBaslik", { ortak: k.ortak.ad, proje: p.ad })} aciklama={t(k.finansmanKaynaklari.length ? "silinemezBagli" : "silNotu")} />
              </SatirEylemleri></div>
            </div>
            {k.finansmanKaynaklari.map(f => <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
              <span>{t("bagliKaynak", { ad: f.kaynakAdi, tur: tf(`tur.${f.tur}`), birim: f.birim })}{finansmanYetkisi && <> · <Link href={`/finansman/${f.id}`} className="text-primary underline underline-offset-4">{t("finansmaniAc")}</Link></>}</span>
              {finansmanYetkisi && <div className="w-full md:w-auto"><SatirEylemleri><FinansmanBagiCoz finansmanId={f.id} kaynak={f.kaynakAdi} /></SatirEylemleri></div>}
            </div>)}
          </li>)}</ul>
        </article>;
      })}
    </section>
  </div>;
}
