import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { Baglanti } from "@/components/baglanti";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DURUM_YAZISI } from "@/lib/renkler";
import { ortakBakiyeleri } from "@/lib/ortaklik/kesinlestirme";
import { OdemeFormu, OdemeTersle } from "./odeme-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Ortaklik");
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id: (await params).id }, select: { ad: true } });
  return { title: proje ? t("hesapBasligi", { proje: proje.ad }) : t("baslik") };
}

/**
 * K347 · 4b — ORTAK HESABI. Bakiye = Σ hareket (hak +, ödeme −); defter, satır değişmez.
 * Para rakamı olduğu için ortaklık izni + `satis.kar.gor` ister.
 * Arama (İlke #17) ortak adı ve açıklamada; tablo toplamı GÖRÜNEN satırların toplamıdır (#15).
 */
export default async function OrtakHesabiSayfasi({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; ortak?: string }>;
}) {
  const baglam = await sayfaIzni("ortaklik.yonet");
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const proje = await prisma.ortaklikProjesi.findUnique({ where: { id }, select: { id: true, ad: true, currency: true } });
  if (!proje) notFound();
  const t = await getTranslations("Ortaklik");
  const bicim = await bicimlendirici();
  if (!baglam.izinler.has("satis.kar.gor")) {
    return <div className="space-y-3"><ListeyeDon href="/ortaklik">{t("baslik")}</ListeyeDon><p className="text-sm text-muted-foreground">{t("sonucKarIzni")}</p></div>;
  }
  const para = (n: number) => bicim.para(n, proje.currency);
  const [katilimlar, hareketler, surumler, kategoriler] = await Promise.all([
    prisma.ortaklikKatilimi.findMany({ where: { projeId: id }, select: { id: true, ortak: { select: { ad: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.ortakCariHareketi.findMany({
      where: { projeId: id },
      select: { id: true, katilimId: true, tur: true, tutar: true, tarih: true, aciklama: true, expenseId: true, reversedBy: { select: { id: true } }, donem: { select: { ay: true } } },
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
    }),
    prisma.ortaklikAnlasmasi.findMany({ where: { projeId: id }, select: { gecerlilikAyi: true, karKullanimi: true } }),
    prisma.expenseCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const adlar = Object.fromEntries(katilimlar.map((k) => [k.id, k.ortak.ad]));
  const sayisal = hareketler.map((h) => ({ ...h, tutarSayi: Number(h.tutar) }));
  const bakiye = ortakBakiyeleri(sayisal.map((h) => ({ katilimId: h.katilimId, tur: h.tur, tutar: h.tutarSayi })));
  const q = (p.q ?? "").trim().toLocaleLowerCase("tr");
  const gorunen = sayisal.filter((h) => (!p.ortak || h.katilimId === p.ortak) && (!q || `${adlar[h.katilimId] ?? ""} ${h.aciklama ?? ""}`.toLocaleLowerCase("tr").includes(q)));
  const toplam = (alan: "hak" | "odenen" | "kalan") => Object.values(bakiye).reduce((x, b) => x + b[alan], 0);

  return <div className="min-w-0 space-y-6">
    <div className="space-y-2">
      <ListeyeDon href="/ortaklik">{t("baslik")}</ListeyeDon>
      <h1 className="text-2xl font-semibold">{t("hesapBasligi", { proje: proje.ad })}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("hesapAciklama")}</p>
      <Baglanti href={`/ortaklik/${proje.id}/paylasim`} className="inline-flex min-h-11 items-center text-sm md:min-h-0">{t("paylasimiAc")}</Baglanti>
    </div>

    <section className="max-w-3xl space-y-2">
      <h2 className="text-lg font-semibold">{t("bakiyeler")}</h2>
      <Table>
        <TableHeader><TableRow>
          <TableHead>{t("ortakSec")}</TableHead>
          <TableHead className="text-right">{t("bakiyeHak")}</TableHead>
          <TableHead className="text-right">{t("bakiyeOdenen")}</TableHead>
          <TableHead className="text-right">{t("bakiyeKalan")}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{katilimlar.map((k) => {
          const b = bakiye[k.id] ?? { hak: 0, odenen: 0, kalan: 0 };
          return <TableRow key={k.id}>
            <TableCell><Baglanti href={`/ortaklik/${proje.id}/hesap?ortak=${k.id}`}>{k.ortak.ad}</Baglanti></TableCell>
            <TableCell className="text-right whitespace-nowrap">{para(b.hak)}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{para(b.odenen)}</TableCell>
            <TableCell className={`text-right whitespace-nowrap font-medium ${b.kalan < 0 ? DURUM_YAZISI.olumsuz : ""}`}>{para(b.kalan)}</TableCell>
          </TableRow>;
        })}</TableBody>
        <TableFooter><TableRow>
          <TableCell>{t("paylasimToplam")}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(toplam("hak"))}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(toplam("odenen"))}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(toplam("kalan"))}</TableCell>
        </TableRow></TableFooter>
      </Table>
      <p className="text-xs text-muted-foreground">{t("bakiyeNotu")}</p>
    </section>

    <div className="max-w-3xl">
      <OdemeFormu
        projeId={proje.id}
        ortaklar={katilimlar.map((k) => ({ id: k.id, ad: k.ortak.ad }))}
        kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.name }))}
        giderYetkisi={baglam.izinler.has("gider.yaz")}
        surumler={surumler.map((s) => ({ ay: gunMetni(s.gecerlilikAyi).slice(0, 7), karKullanimi: s.karKullanimi }))}
        bugun={gunMetni(gunDegeri(isTakvimGunu(new Date())))}
      />
    </div>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("hareketler", { sayi: sayisal.length })}</h2>
      <div className="max-w-3xl space-y-1">
        <KodAramaKutusu temelAdres={`/ortaklik/${proje.id}/hesap`} baslangic={p.q ?? ""} tasinanlar={{ ortak: p.ortak }} ipucu={t("hareketAramaIpucu")} />
        {p.ortak ? <p className="text-sm">{t("ortakSuzgeci", { ad: adlar[p.ortak] ?? "—" })} <Baglanti href={`/ortaklik/${proje.id}/hesap`}>{t("suzgeciKaldir")}</Baglanti></p> : null}
        {q || p.ortak ? <p className="text-sm text-muted-foreground">{t("hareketAramaSonucu", { sayi: gorunen.length, toplam: sayisal.length })}</p> : null}
      </div>
      {!gorunen.length ? <p className="max-w-3xl text-sm text-muted-foreground">{q || p.ortak ? t("aramadaYok") : t("hareketYok")}</p> : <Table>
        <TableHeader><TableRow>
          <TableHead>{t("sutunTarih")}</TableHead>
          <TableHead>{t("ortakSec")}</TableHead>
          <TableHead>{t("hareketTuru")}</TableHead>
          <TableHead className="text-right">{t("hareketTutari")}</TableHead>
          <TableHead>{t("sutunAciklama")}</TableHead>
          <TableHead>{t("hareketEylem")}</TableHead>
        </TableRow></TableHeader>
        <TableBody>{gorunen.map((h) => <TableRow key={h.id}>
          <TableCell className="whitespace-nowrap">{bicim.tarih(h.tarih)}</TableCell>
          <TableCell>{adlar[h.katilimId] ?? "—"}</TableCell>
          <TableCell className="whitespace-nowrap">{t(`cari_${h.tur}`)}{h.donem ? ` · ${gunMetni(h.donem.ay).slice(0, 7)}` : ""}</TableCell>
          <TableCell className={`text-right whitespace-nowrap ${h.tutarSayi < 0 ? DURUM_YAZISI.olumsuz : ""}`}>{para(h.tutarSayi)}</TableCell>
          <TableCell className="min-w-40">{h.aciklama ?? "—"}{h.expenseId ? <span className="text-muted-foreground block text-xs">{t("odemeGiderAcildi")}</span> : null}</TableCell>
          <TableCell>{h.tur === "ODEME" && !h.reversedBy ? <OdemeTersle hareketId={h.id} /> : h.reversedBy ? <span className="text-muted-foreground text-xs">{t("tersKaydiVar")}</span> : null}</TableCell>
        </TableRow>)}</TableBody>
        <TableFooter><TableRow>
          <TableCell colSpan={3}>{q || p.ortak ? t("aramadakiHareketToplami", { sayi: gorunen.length }) : t("hareketToplami")}</TableCell>
          <TableCell className="text-right whitespace-nowrap">{para(gorunen.reduce((x, h) => x + h.tutarSayi, 0))}</TableCell>
          <TableCell colSpan={2} />
        </TableRow></TableFooter>
      </Table>}
    </section>
  </div>;
}
