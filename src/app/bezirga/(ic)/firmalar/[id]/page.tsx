import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { askiDurumu, bugunIs, surecGecmisi, UYARI_EN_AZ_GUN, UYARI_EN_COK_GUN } from "@/lib/aski-sureci";
import { firmaKarti } from "@/lib/firma-karti";
import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { FirmaEylemleri } from "../firma-eylemleri";
import { AskiSureci, type AskiGorunumu } from "./aski-sureci";
import { FirmaAdiFormu } from "./firma-adi-formu";
import { KartKullanicilari } from "./kart-kullanicilari";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Yonetim");
  await yonetimSayfasi();
  const kart = await firmaKarti((await params).id);
  return { title: kart ? kart.ad : t("firmaKarti") };
}

/**
 * FİRMA KARTI — süper admin paneli ① (05.10.2026). Dört bölüm: kimlik ·
 * kullanıcılar · kayıt sayıları (yalnız ADET — ticari rakam yok, 04.10
 * kararı) · firma ayarları (salt okunur; açıp kapatmak ② paketler işi).
 */
export default async function FirmaKartiSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await yonetimSayfasi();
  const { id } = await params;
  const arama = ((await searchParams).q ?? "").trim();
  const kart = await firmaKarti(id);
  if (!kart) notFound();
  const t = await getTranslations("Yonetim");
  const tm = await getTranslations("MaliyetYontemi");
  const bicim = await bicimlendirici();
  const durum = askiDurumu(
    {
      aktif: kart.aktif,
      uyariSonGun: kart.aski.uyariSonGun,
      uyariSebebi: kart.aski.uyariSebebi as FirmaAskiSebebi | null,
      askiSebebi: kart.aski.askiSebebi as FirmaAskiSebebi | null,
    },
    bugunIs(),
  );
  const askiGorunumu: AskiGorunumu =
    durum.tur === "UYARIDA" ? { tur: "UYARIDA", kalanGun: durum.kalanGun, sonGun: bicim.tarih(durum.sonGun), sebep: durum.sebep }
    : durum.tur === "SURESI_DOLDU" ? { tur: "SURESI_DOLDU", gecenGun: durum.gecenGun, sonGun: bicim.tarih(durum.sonGun), sebep: durum.sebep }
    : durum;
  const gecmis = await surecGecmisi(kart.id);
  const aranan = arama.toLocaleLowerCase("tr");
  const gorunen = aranan
    ? kart.kullanicilar.filter((k) => `${k.ad ?? ""} ${k.eposta}`.toLocaleLowerCase("tr").includes(aranan))
    : kart.kullanicilar;

  const sayilar: { anahtar: string; deger: number }[] = [
    { anahtar: "sayiUrun", deger: kart.sayilar.urun },
    { anahtar: "sayiVaryant", deger: kart.sayilar.varyant },
    { anahtar: "sayiSatis", deger: kart.sayilar.satis },
    { anahtar: "sayiAlim", deger: kart.sayilar.alim },
    { anahtar: "sayiIade", deger: kart.sayilar.iade },
    { anahtar: "sayiKanalHesabi", deger: kart.sayilar.kanalHesabi },
    { anahtar: "sayiKullanici", deger: kart.sayilar.kullanici },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <ListeyeDon href={`${YONETIM_YOLU}/firmalar`}>{t("firmalar")}</ListeyeDon>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{kart.ad}</h1>
          <KopyalanabilirKod deger={kart.kod} etiket={t("firmaKodu")} />
          <Badge variant={kart.kurulum === "TAM" ? "secondary" : kart.kurulum === "YARIM" ? "destructive" : "outline"}>
            {kart.kurulum === "TAM" ? t("aktif") : kart.kurulum === "YARIM" ? t("kurulumYarim") : t("pasif")}
          </Badge>
          <div className="ml-auto">
            <FirmaEylemleri firmaId={kart.id} firmaAdi={kart.ad} durum={kart.kurulum} />
          </div>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{t("acilis", { tarih: bicim.tarih(kart.acilis) })}</p>
      </div>

      {/* ① KİMLİK */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bolumKimlik")}</h2>
        <FirmaAdiFormu firmaId={kart.id} ad={kart.ad} />
        <p className="text-muted-foreground text-xs">{t("kodDegismezNotu")}</p>
      </section>

      {/* ② KULLANICILAR */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bolumKullanicilar")}</h2>
        <KodAramaKutusu
          temelAdres={`${YONETIM_YOLU}/firmalar/${kart.id}`}
          baslangic={arama}
          tasinanlar={{}}
          ipucu={t("kullaniciAramaIpucu")}
        />
        <p className="text-muted-foreground text-sm">
          {arama
            ? t("kullaniciAramaSonucu", { bulunan: gorunen.length, toplam: kart.kullanicilar.length })
            : t("kullaniciSayisi", { toplam: kart.kullanicilar.length })}
        </p>
        <KartKullanicilari
          firmaId={kart.id}
          kullanicilar={gorunen.map((k) => ({
            ...k,
            sonGiris: k.sonGiris ? bicim.tarihSaat(k.sonGiris) : null,
          }))}
        />
      </section>

      {/* ASKI SÜRECİ (05.10.2026) — uyarı → süre → onaylı askı */}
      <section id="aski" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-semibold">{t("bolumAski")}</h2>
        <AskiSureci
          firmaId={kart.id}
          firmaAdi={kart.ad}
          durum={askiGorunumu}
          aciklama={kart.aski.aciklama}
          // Son gün izde ISO gün metni («2026-10-07»); ekranda ortak biçimleyiciyle (İlke #10).
          gecmis={gecmis.map((g) => ({ ...g, an: bicim.tarihSaat(g.an), sonGun: g.sonGun ? bicim.tarih(new Date(`${g.sonGun}T00:00:00.000Z`)) : null }))}
          enAzGun={UYARI_EN_AZ_GUN}
          enCokGun={UYARI_EN_COK_GUN}
        />
      </section>

      {/* ③ KAYIT SAYILARI — yalnız adet */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bolumKayitSayilari")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sayilar.map((s) => (
            <div key={s.anahtar} className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">{t(s.anahtar)}</div>
              <div className="text-xl font-semibold tabular-nums">{bicim.sayi(s.deger)}</div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("sayilarNotu")}</p>
      </section>

      {/* ④ FİRMA AYARLARI — salt okunur */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("bolumAyarlar")}</h2>
        <dl className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="text-muted-foreground">{tm("yontemEtiketi")}</dt>
          <dd>{tm(`yontem${kart.ayarlar.maliyetYontemi}`)}</dd>
          <dt className="text-muted-foreground">{tm("kipEtiketi")}</dt>
          <dd>{kart.ayarlar.maliyetYontemi === "FIFO" ? tm(`kip${kart.ayarlar.lotKipi}`) : tm("kipOrtalamada")}</dd>
          <dt className="text-muted-foreground">{t("ayarCokBirim")}</dt>
          <dd>{kart.ayarlar.finansmanCokBirim ? t("acik") : t("kapali")}</dd>
        </dl>
        <p className="text-muted-foreground text-xs">{t("ayarlarSaltOkunurNotu")}</p>
      </section>
    </div>
  );
}
