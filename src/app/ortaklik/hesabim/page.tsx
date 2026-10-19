import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { gunMetni } from "@/lib/donem";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DURUM_YAZISI } from "@/lib/renkler";
import { ortakBakiyeleri } from "@/lib/ortaklik/kesinlestirme";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Ortaklik");
  return { title: t("hesabimBaslik") };
}

/**
 * K347 · 5 — ORTAĞIN KENDİ HESABI. ⛔ Kimlik OTURUMDAN okunur (`IsOrtagi.userId`); adreste kimlik
 * YOK — başka bir ortağın hesabını açtıracak parametre bulunmaz. Gösterilen: kendi hakkı · ödenen ·
 * kalan · kendi hareketleri · projenin KESİN aylarındaki dönem sonucu ve KENDİ payı (kullanıcı
 * kararı 19.10.2026). Diğer ortakların adı ve payı hiçbir yerde sorgulanmaz.
 */
export default async function HesabimSayfasi({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const baglam = await sayfaIzni("ortaklik.hesabim");
  const t = await getTranslations("Ortaklik");
  const bicim = await bicimlendirici();
  const q = ((await searchParams).q ?? "").trim().toLocaleLowerCase("tr");

  const kart = await prisma.isOrtagi.findUnique({
    where: { userId: baglam.kullaniciId },
    select: {
      ad: true,
      katilimlar: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sorumluluk: true,
          proje: {
            select: {
              id: true, ad: true, currency: true,
              donemler: { where: { geriAlindiAt: null }, orderBy: { ay: "desc" }, select: { id: true, ay: true, sonuc: true, karKullanimi: true } },
            },
          },
          // YALNIZ bu katılımın hareketleri — sorgu başka ortağın satırına uzanmaz.
          cariHareketleri: { orderBy: [{ tarih: "desc" }, { createdAt: "desc" }], select: { id: true, tur: true, tutar: true, tarih: true, aciklama: true, donemId: true } },
        },
      },
    },
  });

  return <div className="min-w-0 space-y-6">
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("hesabimBaslik")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{kart ? t("hesabimAciklama", { ad: kart.ad }) : t("hesabimBagliDegil")}</p>
    </div>
    {kart && !kart.katilimlar.length ? <p className="text-sm text-muted-foreground">{t("hesabimProjeYok")}</p> : null}
    {kart && kart.katilimlar.length > 0 ? <div className="max-w-3xl"><KodAramaKutusu temelAdres="/ortaklik/hesabim" baslangic={(await searchParams).q ?? ""} tasinanlar={{}} ipucu={t("hesabimAramaIpucu")} /></div> : null}
    {kart?.katilimlar.map((k) => {
      const para = (n: number) => bicim.para(n, k.proje.currency);
      const hareketler = k.cariHareketleri.map((h) => ({ ...h, tutarSayi: Number(h.tutar) }));
      const b = ortakBakiyeleri(hareketler.map((h) => ({ katilimId: k.id, tur: h.tur, tutar: h.tutarSayi })))[k.id] ?? { hak: 0, odenen: 0, kalan: 0 };
      const donemHakki = (donemId: string) => hareketler.filter((h) => h.donemId === donemId && h.tur === "HAK").reduce((x, h) => x + h.tutarSayi, 0);
      const gorunen = q ? hareketler.filter((h) => `${h.aciklama ?? ""} ${t(`cari_${h.tur}`)}`.toLocaleLowerCase("tr").includes(q)) : hareketler;
      return <section key={k.id} className="space-y-4 rounded-lg border p-4">
        <div><h2 className="text-lg font-semibold">{k.proje.ad}</h2><p className="text-sm text-muted-foreground">{k.sorumluluk}</p></div>
        <div className="grid max-w-3xl grid-cols-3 gap-3">
          <IstatistikKutusu etiket={t("bakiyeHak")} cocuk={<span>{para(b.hak)}</span>} />
          <IstatistikKutusu etiket={t("bakiyeOdenen")} cocuk={<span>{para(b.odenen)}</span>} />
          <IstatistikKutusu etiket={t("bakiyeKalan")} cocuk={<span className={b.kalan < 0 ? DURUM_YAZISI.olumsuz : ""}>{para(b.kalan)}</span>} />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">{t("hesabimKesinAylar", { sayi: k.proje.donemler.length })}</h3>
          {!k.proje.donemler.length ? <p className="text-sm text-muted-foreground">{t("hesabimKesinYok")}</p> : <Table>
            <TableHeader><TableRow>
              <TableHead>{t("paylasimAy")}</TableHead>
              <TableHead className="text-right">{t("sonucDonem")}</TableHead>
              <TableHead className="text-right">{t("hesabimPayiniz")}</TableHead>
              <TableHead>{t("anlasmaKarKullanimi")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{k.proje.donemler.map((d) => <TableRow key={d.id}>
              <TableCell>{gunMetni(d.ay).slice(0, 7)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{para(Number(d.sonuc))}</TableCell>
              <TableCell className="text-right whitespace-nowrap font-medium">{para(donemHakki(d.id))}</TableCell>
              <TableCell>{t(`kullanim_${d.karKullanimi}`)}</TableCell>
            </TableRow>)}</TableBody>
            <TableFooter><TableRow>
              <TableCell>{t("paylasimToplam")}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{para(k.proje.donemler.reduce((x, d) => x + Number(d.sonuc), 0))}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{para(k.proje.donemler.reduce((x, d) => x + donemHakki(d.id), 0))}</TableCell>
              <TableCell />
            </TableRow></TableFooter>
          </Table>}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">{t("hareketler", { sayi: hareketler.length })}</h3>
          {q ? <p className="text-sm text-muted-foreground">{t("hareketAramaSonucu", { sayi: gorunen.length, toplam: hareketler.length })}</p> : null}
          {!gorunen.length ? <p className="text-sm text-muted-foreground">{q ? t("aramadaYok") : t("hareketYok")}</p> : <Table>
            <TableHeader><TableRow>
              <TableHead>{t("sutunTarih")}</TableHead>
              <TableHead>{t("hareketTuru")}</TableHead>
              <TableHead className="text-right">{t("hareketTutari")}</TableHead>
              <TableHead>{t("sutunAciklama")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{gorunen.map((h) => <TableRow key={h.id}>
              <TableCell className="whitespace-nowrap">{bicim.tarih(h.tarih)}</TableCell>
              <TableCell className="whitespace-nowrap">{t(`cari_${h.tur}`)}</TableCell>
              <TableCell className={`text-right whitespace-nowrap ${h.tutarSayi < 0 ? DURUM_YAZISI.olumsuz : ""}`}>{para(h.tutarSayi)}</TableCell>
              <TableCell className="min-w-40">{h.aciklama ?? "—"}</TableCell>
            </TableRow>)}</TableBody>
            <TableFooter><TableRow>
              <TableCell colSpan={2}>{q ? t("aramadakiHareketToplami", { sayi: gorunen.length }) : t("hareketToplami")}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{para(gorunen.reduce((x, h) => x + h.tutarSayi, 0))}</TableCell>
              <TableCell />
            </TableRow></TableFooter>
          </Table>}
        </div>
      </section>;
    })}
  </div>;
}
