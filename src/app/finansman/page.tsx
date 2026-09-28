import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { miktarMetni } from "@/lib/finansman/gosterim";
import { EK_BIRIMLER, FINANSMAN_TURLERI, secilebilirBirimler, type FinansmanBirimi } from "@/lib/finansman/kural";
import { cokBirimAcikMi, finansmanListesi, turCoz } from "@/lib/finansman/veri";
import { sayfaIzni } from "@/lib/yetki";

import { FiyatFormu } from "./fiyat-formu";
import { YeniKaynakFormu } from "./yeni-kaynak-formu";

/**
 * ============================================================================
 *  FİNANSMAN — LİSTE (K304 · K304-②)
 * ----------------------------------------------------------------------------
 *  Sermaye · ortak borcu · üçüncü kişi borcu · banka kredisi; birim TL · EUR ·
 *  USD · gram altın. Kutucuklar SÜZGEÇLE BİRLİKTE değişir (İlke #15); birimler
 *  ayrı toplanır. TL KARŞILIĞI tahminidir: kullanıcının girdiği son fiyatla,
 *  fiyat tarihiyle birlikte yazar; fiyatı olmayan birim adıyla söylenir.
 *  ⛔ Bu ekrandaki hiçbir rakam gelir değildir (sayfa açıklaması bunu yazar).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("finansman") };
}

export default async function FinansmanSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tur?: string }>;
}) {
  const baglam = await sayfaIzni("finansman.yonet");
  const p = await searchParams;
  const arama = (p.q ?? "").trim();
  const tur = turCoz(p.tur);
  const t = await getTranslations("Finansman");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [{ satirlar, toplamlar, fiyatlar, borcTl, fiyatsizBirimler }, cokBirim] = await Promise.all([
    finansmanListesi({ arama, tur }),
    cokBirimAcikMi(baglam.companyId),
  ]);
  const miktar = (n: number, b: FinansmanBirimi) => miktarMetni(n, b, bicim, (bb, m) => t(`birimMiktar.${bb}`, { miktar: m }));
  const adres = (yeniTur: string | null) => {
    const s = new URLSearchParams();
    if (arama) s.set("q", arama);
    if (yeniTur) s.set("tur", yeniTur);
    const q = s.toString();
    return q ? `/finansman?${q}` : "/finansman";
  };
  /** Fiyatı sorulacak birimler: özellik açıksa ek birimler + EUR; kapalıysa yalnız kayıtta geçen TL dışı birimler. */
  const fiyatBirimleri = (["EUR", ...EK_BIRIMLER] as FinansmanBirimi[]).filter(
    (b) => (cokBirim && b !== "EUR") || toplamlar.some(([tb]) => tb === b),
  );

  return (
    <div className="min-w-0 space-y-6">
      <ListeyiHatirla temel="/finansman" etiket={t("baslik")} />
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("aciklama")}</p>
      </div>

      <YeniKaynakFormu birimler={[...secilebilirBirimler(cokBirim)]} />

      <div className="flex flex-wrap gap-2" aria-label={t("turSuzgeci")}>
        {[null, ...FINANSMAN_TURLERI].map((x) => (
          <Link
            key={x ?? "hepsi"}
            href={adres(x)}
            className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm md:min-h-9 ${
              x === tur ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            {x ? t(`tur.${x}`) : t("tumTurler")}
          </Link>
        ))}
      </div>

      <div className="space-y-1">
        <KodAramaKutusu temelAdres="/finansman" baslangic={arama} tasinanlar={{ tur: tur ?? undefined }} ipucu={t("aramaIpucu")} />
        {arama ? <p className="text-muted-foreground text-xs">{t("aramaSonuc", { q: arama, sayi: satirlar.length })}</p> : null}
      </div>

      {toplamlar.some(([b]) => b !== "TRY") ? (
        <div className="max-w-md">
          <IstatistikKutusu
            bas
            etiket={t("borcTlBaslik")}
            cocuk={bicim.para(borcTl, "TRY")}
            altNot={
              fiyatsizBirimler.length > 0
                ? t("borcTlEksik", { birimler: fiyatsizBirimler.map((b) => t(`birim.${b}`)).join(", ") })
                : t("borcTlNot")
            }
          />
        </div>
      ) : null}

      {toplamlar.map(([birim, top]) => (
        <section key={birim} className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-medium">
            {t("toplamBasligi", { para: t(`birim.${birim}`), sayi: satirlar.filter((s) => s.birim === birim).length })}
          </h2>
          <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
            <IstatistikKutusu etiket={t("kutu.sermaye")} cocuk={miktar(top.sermaye, birim)} />
            <IstatistikKutusu etiket={t("kutu.ORTAK_BORCU")} cocuk={miktar(top.kalanBorc.ORTAK_BORCU, birim)} />
            <IstatistikKutusu etiket={t("kutu.UCUNCU_KISI_BORCU")} cocuk={miktar(top.kalanBorc.UCUNCU_KISI_BORCU, birim)} />
            <IstatistikKutusu etiket={t("kutu.BANKA_KREDISI")} cocuk={miktar(top.kalanBorc.BANKA_KREDISI, birim)} />
            <IstatistikKutusu etiket={t("kutu.odenenFaiz")} cocuk={miktar(top.odenenFaizVergi, birim)} altNot={t("kutu.odenenFaizNot")} />
            <IstatistikKutusu
              etiket={t("kutu.plan")}
              cocuk={<span className="text-base">{`+${miktar(top.planliGiris, birim)} · −${miktar(top.planliCikis, birim)}`}</span>}
              altNot={<Link href="/nakit-takvimi" className="text-primary underline">{t("kutu.planNot")}</Link>}
            />
          </div>
        </section>
      ))}

      {fiyatBirimleri.length > 0 ? (
        <section className="max-w-2xl space-y-2">
          <h2 className="font-medium">{t("fiyatBaslik")}</h2>
          <p className="text-muted-foreground text-sm">{t("fiyatAciklama")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {fiyatBirimleri.map((b) => {
              const f = fiyatlar[b];
              return (
                <li key={b} className="bg-card rounded-lg border p-3 text-sm">
                  <span className="font-medium">{t(`birim.${b}`)}</span>
                  <span className="text-muted-foreground block text-xs">
                    {f ? t("fiyatSon", { fiyat: bicim.para(f.fiyat, "TRY"), gun: bicim.tarih(f.gecerliGun) }) : t("fiyatYok")}
                  </span>
                </li>
              );
            })}
          </ul>
          <FiyatFormu birimler={fiyatBirimleri} />
        </section>
      ) : null}

      {satirlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{arama || tur ? t("bosSuzgec") : t("bos")}</p>
        </div>
      ) : (
        <SatirListesi>
          {satirlar.map((s) => (
            <SatirKarti
              key={s.id}
              baslik={
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/finansman/${s.id}`} className="text-primary underline-offset-2 hover:underline">
                    {s.kaynakAdi}
                  </Link>
                  <Badge variant="outline">{t(`tur.${s.tur}`)}</Badge>
                  {s.birim !== "TRY" ? <Badge variant="outline">{t(`birim.${s.birim}`)}</Badge> : null}
                </span>
              }
              baglam={[
                `${t("giren")}: ${miktar(s.ozet.giren, s.birim)}`,
                s.tur !== "SERMAYE" ? `${t("geriOdenen")}: ${miktar(s.ozet.geriOdenen, s.birim)}` : null,
                s.tur === "ORTAK_BORCU" ? `${t("mahsup")}: ${miktar(s.ozet.mahsup, s.birim)}` : null,
                s.ozet.odenenFaizVergi !== 0 ? `${t("odenenFaiz")}: ${miktar(s.ozet.odenenFaizVergi, s.birim)}` : null,
                t("hareketSayisi", { sayi: s.hareketSayisi }),
              ]}
              sag={
                <>
                  <span className="flex flex-col items-end">
                    <span className="text-muted-foreground text-xs">{s.ozet.kalanBorc === null ? t("sermaye") : t("kalanBorc")}</span>
                    <span className="text-base font-semibold tabular-nums whitespace-nowrap">
                      {miktar(s.ozet.kalanBorc ?? s.ozet.sermayeKatkisi, s.birim)}
                    </span>
                  </span>
                  <SatirEylemleri>
                    <SatirEylemi href={`/finansman/${s.id}`} ikon={FolderOpen} etiket={ortak("detay")} />
                  </SatirEylemleri>
                </>
              }
            />
          ))}
        </SatirListesi>
      )}
    </div>
  );
}
