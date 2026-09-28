import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { SatirEylemleri } from "@/components/satir-eylemi";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { miktarMetni } from "@/lib/finansman/gosterim";
import { FINANSMAN_FAIZ_KATEGORI_ONERISI, IZINLI_HAREKETLER, borcMu, giderDogrudanMi, tlKarsiligi } from "@/lib/finansman/kural";
import { finansmanDetayi } from "@/lib/finansman/veri";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { GerceklestirDugmesi, HareketFormu, KaynakSilDugmesi, PlanSilDugmesi, PlanYapistirFormu, TersKayitDugmesi } from "./bilesenler";

/**
 * FİNANSMAN KAYNAĞI — DETAY (K304). Özet · hareketler · hareket ekleme ·
 * banka ödeme planı yapıştırma. Her satırın eylemi SATIRDA görünür (İlke #1);
 * yıkıcı eylemler (ters kayıt, plan silme) onay diyaloğu ister (İlke #6).
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("finansman") };
}

export default async function FinansmanDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  await sayfaIzni("finansman.yonet");
  const { id } = await params;
  const detay = await finansmanDetayi(id);
  if (!detay) notFound();
  const { kaynak, ozet, fiyat } = detay;

  const t = await getTranslations("Finansman");
  const bicim = await bicimlendirici();
  const para = (n: number) => miktarMetni(n, kaynak.birim, bicim, (b, m) => t(`birimMiktar.${b}`, { miktar: m }));
  const kalanTl = borcMu(kaynak.tur) && kaynak.birim !== "TRY" ? tlKarsiligi(ozet.kalanBorc ?? 0, kaynak.birim, fiyat?.fiyat ?? null) : null;
  const kategoriler = (
    await prisma.expenseCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ).map((k) => ({ id: k.id, ad: k.name, onerilenMi: k.name === FINANSMAN_FAIZ_KATEGORI_ONERISI }));
  const sayi = (d: { toString(): string }) => Number(d.toString());
  const gunMetni = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <ListeyeDon href="/finansman">{t("baslik")}</ListeyeDon>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
          {kaynak.kaynakAdi}
          <Badge variant="outline">{t(`tur.${kaynak.tur}`)}</Badge>
          <Badge variant="outline">{t(`birim.${kaynak.birim}`)}</Badge>
        </h1>
        {kaynak.note ? <p className="text-muted-foreground max-w-2xl text-sm">{kaynak.note}</p> : null}
        <p className="text-muted-foreground max-w-2xl text-xs">{t("karaDokunmaz")}</p>
        {/* Yalnız hiç gerçekleşmiş/ters hareketi OLMAYAN kaynak silinebilir (yanlış açılmış kayıt). */}
        {kaynak.hareketler.every((h) => h.gerceklestiAt === null && !h.isReversal) ? (
          <div className="mt-2">
            <KaynakSilDugmesi finansmanId={kaynak.id} ozet={`${kaynak.kaynakAdi} · ${t(`tur.${kaynak.tur}`)}`} />
          </div>
        ) : null}
      </div>

      <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
        <IstatistikKutusu etiket={t("giren")} cocuk={para(ozet.giren)} />
        {borcMu(kaynak.tur) ? (
          <>
            <IstatistikKutusu etiket={t("geriOdenen")} cocuk={para(ozet.geriOdenen)} />
            {kaynak.tur === "ORTAK_BORCU" ? <IstatistikKutusu etiket={t("mahsup")} cocuk={para(ozet.mahsup)} /> : null}
            <IstatistikKutusu
              bas
              etiket={t("kalanBorc")}
              cocuk={para(ozet.kalanBorc ?? 0)}
              altNot={
                kaynak.birim === "TRY"
                  ? undefined
                  : kalanTl !== null && fiyat
                    ? t("tlKarsiligiNot", { tl: bicim.para(kalanTl, "TRY"), gun: bicim.tarih(fiyat.gecerliGun) })
                    : t("tlKarsiligiYok")
              }
            />
            <IstatistikKutusu etiket={t("odenenFaiz")} cocuk={para(ozet.odenenFaizVergi)} altNot={t("kutu.odenenFaizNot")} />
          </>
        ) : null}
        <IstatistikKutusu etiket={t("kutu.plan")} cocuk={<span className="text-base">{`+${para(ozet.planliGiris)} · −${para(ozet.planliCikis)}`}</span>} altNot={t("planNotu")} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("hareketler", { sayi: kaynak.hareketler.length })}</h2>
        {kaynak.hareketler.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">{t("hareketYok")}</p>
        ) : (
          <SatirListesi>
            {kaynak.hareketler.map((h) => {
              const anapara = sayi(h.anapara);
              const faiz = sayi(h.faiz);
              const vergi = sayi(h.vergi);
              const toplam = h.tur === "GERI_ODEME" ? anapara + faiz + vergi : anapara;
              const durum = h.isReversal ? "TERS" : h.gerceklestiAt ? (h.reversedBy ? "TERSLENDI" : "GERCEKLESTI") : "PLANLI";
              return (
                <SatirKarti
                  key={h.id}
                  baslik={
                    <span className="flex flex-wrap items-center gap-2">
                      {t(`hareketTuru.${h.tur}`)}
                      <Badge variant="outline">{t(`durum.${durum}`)}</Badge>
                    </span>
                  }
                  baglam={[
                    `${t("vade")}: ${bicim.tarih(h.vade)}`,
                    h.gerceklestiAt ? `${t("gerceklesti")}: ${bicim.tarih(h.gerceklestiAt)}` : null,
                    h.tur === "GERI_ODEME" ? `${t("anapara")}: ${para(anapara)} · ${t("faiz")}: ${para(faiz)} · ${t("vergi")}: ${para(vergi)}` : null,
                    h.faizGider ? `${t("giderYazildi")}: ${h.faizGider.category.name} · ${bicim.para(Number(h.faizGider.amount.toString()), h.faizGider.currency)}` : null,
                    h.note,
                  ]}
                  sag={
                    <>
                      <span className="text-base font-semibold tabular-nums whitespace-nowrap">{para(toplam)}</span>
                      {durum === "PLANLI" || durum === "GERCEKLESTI" ? (
                        <SatirEylemleri>
                          {durum === "PLANLI" ? (
                            <>
                              <GerceklestirDugmesi
                                hareketId={h.id}
                                varsayilanTarih={gunMetni(h.vade)}
                                giderVar={h.tur === "GERI_ODEME" && faiz + vergi > 0}
                                giderTlSorulur={!giderDogrudanMi(kaynak.birim)}
                                kategoriler={kategoriler}
                              />
                              <PlanSilDugmesi hareketId={h.id} ozet={`${t(`hareketTuru.${h.tur}`)} · ${bicim.tarih(h.vade)} · ${para(toplam)}`} />
                            </>
                          ) : (
                            <TersKayitDugmesi hareketId={h.id} ozet={`${t(`hareketTuru.${h.tur}`)} · ${bicim.tarih(h.vade)} · ${para(toplam)}`} />
                          )}
                        </SatirEylemleri>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </SatirListesi>
        )}
      </section>

      <HareketFormu finansmanId={kaynak.id} izinliTurler={[...IZINLI_HAREKETLER[kaynak.tur]]} kategoriler={kategoriler} giderTlSorulur={!giderDogrudanMi(kaynak.birim)} />
      {borcMu(kaynak.tur) ? <PlanYapistirFormu finansmanId={kaynak.id} /> : null}
    </div>
  );
}
