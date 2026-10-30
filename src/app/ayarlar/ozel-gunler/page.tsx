import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { OZEL_GUN_YOLU } from "@/lib/ozel-gun/ozel-gun";
import { ozelGunKayitlari } from "@/lib/ozel-gun/ozel-gun-verisi";
import { prisma } from "@/lib/prisma";
import { REHBER_YOLU } from "@/lib/rapor/alim-rehberi";
import { sayfaIzni } from "@/lib/yetki";

import { OzelGunKarti, YeniOzelGunFormu, type GunVerisi } from "./ozel-gun-eylemleri";

/**
 * ============================================================================
 *  ÖZEL GÜN TAKVİMİ — AYAR EKRANI (K363 Faz 2-b, kullanıcı onayı 24.10.2026)
 * ----------------------------------------------------------------------------
 *  İki tür gün (satış günü · alım kampanyası), her yılın tarihi ayrı satır —
 *  Alım rehberinin «Özel günler» sekmesi bu listeden okur. Takvim VERİDİR:
 *  hangi günün önemli olduğu koda gömülmez, rehber kendi satışımızla ölçer.
 *  Arama adla (İlke #17); sayılar aramadan bağımsız bütün kümeyi gösterir.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("OzelGun");
  return { title: t("baslik") };
}

export default async function OzelGunlerSayfasi({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await sayfaIzni("ayar.yaz");
  const t = await getTranslations("OzelGun");
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const [kayitlar, kanallar] = await Promise.all([
    ozelGunKayitlari(),
    prisma.channel.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const gunler: GunVerisi[] = kayitlar.map((k) => ({
    id: k.id,
    ad: k.ad,
    tur: k.tur,
    aktif: k.aktif,
    aciklama: k.aciklama,
    kanalId: k.kanal?.id ?? null,
    kanalAdi: k.kanal?.ad ?? null,
    tarihler: k.tarihler.map((x) => ({ id: x.id, baslangic: x.baslangic, bitis: x.bitis, kaynak: x.kaynak, dogrulandi: x.dogrulandi })),
    gecmisiVar: k.tarihler.some((x) => x.baslangic.getTime() < bugun.getTime()),
  }));
  const anahtar = arama.toLocaleLowerCase("tr");
  const gorunen = anahtar === "" ? gunler : gunler.filter((g) => g.ad.toLocaleLowerCase("tr").includes(anahtar));
  const dogrulanacak = gunler.reduce((s, g) => s + g.tarihler.filter((x) => !x.dogrulandi).length, 0);
  const kanalSecenekleri = kanallar.map((k) => ({ id: k.id, ad: k.name }));

  return (
    <div className="min-w-0 space-y-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
        <Link href={`${REHBER_YOLU}?liste=ozelGun`} className="text-primary hover:text-primary/80 text-sm font-medium">
          {t("rehbereGit")}
        </Link>
      </div>

      <div className="grid max-w-3xl grid-cols-3 gap-2">
        <IstatistikKutusu etiket={t("kutuGun")} cocuk={gunler.length} altNot={t("kutuAktif", { sayi: gunler.filter((g) => g.aktif).length })} />
        <IstatistikKutusu etiket={t("kutuTarih")} cocuk={gunler.reduce((s, g) => s + g.tarihler.length, 0)} />
        <IstatistikKutusu etiket={t("kutuDogrulanacak")} cocuk={dogrulanacak} />
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>{t("yeniBaslik")}</CardTitle>
        </CardHeader>
        <CardContent>
          <YeniOzelGunFormu kanallar={kanalSecenekleri} />
        </CardContent>
      </Card>

      <div className="max-w-4xl space-y-1">
        <KodAramaKutusu temelAdres={OZEL_GUN_YOLU} baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />
        {arama ? <p className="text-muted-foreground text-xs">{t("aramaSonuc", { q: arama, sayi: gorunen.length })}</p> : null}
      </div>

      <section className="max-w-4xl space-y-3">
        <h2 className="text-lg font-semibold">{t("listeBaslik", { sayi: gorunen.length })}</h2>
        {gorunen.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border p-6 text-center text-sm">{arama ? t("aramaBos") : t("listeBos")}</p>
        ) : (
          gorunen.map((g) => <OzelGunKarti key={g.id} gun={g} kanallar={kanalSecenekleri} />)
        )}
      </section>
    </div>
  );
}
