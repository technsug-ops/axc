import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";

import { bicimlendirici } from "@/lib/bicim";
import { askiDurumu, bugunIs, surecGecmisi, UYARI_EN_AZ_GUN, UYARI_EN_COK_GUN } from "@/lib/aski-sureci";
import { firmaKarti } from "@/lib/firma-karti";
import { gunMetni } from "@/lib/donem";
import { firmaOdemeleri, odemeDurumu } from "@/lib/odeme-takibi";
import { firmaPaketi, paketler } from "@/lib/paket/yonetim";
import { kullanimGorunumu } from "@/lib/paket/kullanim-gorunumu";
import { KullanimKutulari } from "@/components/kullanim-kutulari";
import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { FirmaEylemleri } from "../firma-eylemleri";
import { AskiSureci, type AskiGorunumu } from "./aski-sureci";
import { FirmaAdiFormu } from "./firma-adi-formu";
import { KartKullanicilari } from "./kart-kullanicilari";
import { OdemeTakibi, type OdemeGorunumu } from "./odeme-takibi";
import { FirmaPaketi } from "./firma-paketi";
import { SayfaBasligi } from "../../sayfa-basligi";
import { SinirFormu } from "../../sinir-formu";

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
  const bugun = bugunIs();
  const od = odemeDurumu(kart.abonelik.vade, bugun);
  const odemeGorunumu: OdemeGorunumu =
    od.tur === "TANIMSIZ" ? od
    : od.tur === "GECIKTI" ? { tur: "GECIKTI", gecenGun: od.gecenGun, vade: bicim.tarih(od.vade) }
    : { tur: od.tur, kalanGun: od.kalanGun, vade: bicim.tarih(od.vade) };
  const odemeler = await firmaOdemeleri(kart.id);
  const ab = kart.abonelik;
  const [fp, tumPaketler, kg] = await Promise.all([firmaPaketi(kart.id), paketler(), kullanimGorunumu(kart.id)]);
  // Abonelik tanımsızsa paketin önerisi forma öneri olarak düşer (06.10: tutar firma başına elle kalır).
  const oneri = ab.tutar === null && fp?.paket?.onerilenTutar != null ? fp.paket : null;
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
    <>
      <SayfaBasligi
        ust={<ListeyeDon href={`${YONETIM_YOLU}/firmalar`}>{t("firmalar")}</ListeyeDon>}
        baslik={kart.ad}
        aciklama={t("acilis", { tarih: bicim.tarih(kart.acilis) })}
        eylemler={
          <>
            <KopyalanabilirKod deger={kart.kod} etiket={t("firmaKodu")} />
            <span className={`yn-pill ${kart.kurulum === "TAM" ? "ok" : kart.kurulum === "YARIM" ? "bad" : ""}`}>
              {kart.kurulum === "TAM" ? t("aktif") : kart.kurulum === "YARIM" ? t("kurulumYarim") : t("pasif")}
            </span>
            <FirmaEylemleri firmaId={kart.id} firmaAdi={kart.ad} durum={kart.kurulum} />
          </>
        }
      />
      <div className="yn-grid2">
      <div className="yn-stack">

      {/* ① KİMLİK */}
      <section className="yn-card">
        <h2>{t("bolumKimlik")}</h2>
        <FirmaAdiFormu firmaId={kart.id} ad={kart.ad} />
        <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{t("kodDegismezNotu")}</p>
      </section>

      {/* ② KULLANICILAR */}
      <section className="yn-card">
        <h2>{t("bolumKullanicilar")}</h2>
        <KodAramaKutusu
          temelAdres={`${YONETIM_YOLU}/firmalar/${kart.id}`}
          baslangic={arama}
          tasinanlar={{}}
          ipucu={t("kullaniciAramaIpucu")}
        />
        <p className="yn-muted yn-small" style={{ margin: "8px 0" }}>
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

      {/* PAKET (K303 ②, 06.10.2026) */}
      <section id="paket" className="yn-card" style={{ scrollMarginTop: 16 }}>
        <h2>{t("bolumPaket")}</h2>
        <FirmaPaketi
          firmaId={kart.id}
          firmaAdi={kart.ad}
          paketId={fp?.paket?.id ?? null}
          acik={[...(fp?.acik ?? [])]}
          paketler={tumPaketler.map((p) => ({ id: p.id, ad: p.ad, firmayaOzel: p.firmayaOzel, ozellikler: p.ozellikler, sinirlar: p.sinirlar }))}
          kullanim={kg.kullanim}
        />
        <h3 style={{ margin: "14px 0 8px" }}>{t("kullanimBaslik")}</h3>
        <KullanimKutulari kullanim={kg.kullanim} sinirlar={kg.sinirlar} etiketler={kg.etiketler} durumlar={kg.durumlar} sinirsiz={kg.sinirsiz} />
        {fp?.paket?.firmayaOzel ? (
          <>
            <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{t("firmaSinirNotu")}</p>
            <SinirFormu hedef={{ tur: "firma", id: kart.id }} baslangic={kg.sinirlar} />
          </>
        ) : (
          <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{t("paketSinirNotu")}</p>
        )}
      </section>
      </div>

      <div className="yn-stack">
      {/* ÖDEMELER (06.10.2026) — elle takip; gecikme askı sürecine bağlanır */}
      <section id="odemeler" className="yn-card" style={{ scrollMarginTop: 16 }}>
        <h2>{t("bolumOdemeler")}</h2>
        <OdemeTakibi
          firmaId={kart.id}
          firmaAdi={kart.ad}
          durum={odemeGorunumu}
          abonelik={{
            // Form varsayılanı Türkçe yazımla («1500,00») — `turkceSayi` geri okur.
            tutar: ab.tutar !== null ? ab.tutar.toFixed(2).replace(".", ",") : oneri?.onerilenTutar != null ? oneri.onerilenTutar.toFixed(2).replace(".", ",") : "",
            tutarMetni: ab.tutar !== null && ab.paraBirimi ? bicim.para(ab.tutar, ab.paraBirimi) : null,
            paraBirimi: ab.paraBirimi ?? oneri?.onerilenParaBirimi ?? "TRY",
            donem: ab.donem ?? oneri?.onerilenDonem ?? "AYLIK",
            oneriMetni: oneri?.onerilenTutar != null && oneri.onerilenParaBirimi ? `${oneri.ad}: ${bicim.para(oneri.onerilenTutar, oneri.onerilenParaBirimi)}` : null,
            vade: ab.vade ? gunMetni(ab.vade) : "",
          }}
          bugun={gunMetni(bugun)}
          satirlar={odemeler.satirlar.map((s) => ({ ...s, gun: bicim.tarih(s.gun), tutar: bicim.para(s.tutar, s.paraBirimi) }))}
          toplamlar={odemeler.toplamlar.map((x) => bicim.para(x.tutar, x.paraBirimi))}
        />
      </section>

      {/* ASKI SÜRECİ (05.10.2026) — uyarı → süre → onaylı askı */}
      <section id="aski" className="yn-card" style={{ scrollMarginTop: 16 }}>
        <h2>{t("bolumAski")}</h2>
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
      <section className="yn-card">
        <h2>{t("bolumKayitSayilari")}</h2>
        <div className="yn-stats">
          {sayilar.map((s) => (
            <div key={s.anahtar} className="yn-stat">
              <b>{bicim.sayi(s.deger)}</b>
              <span>{t(s.anahtar)}</span>
            </div>
          ))}
        </div>
        <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{t("sayilarNotu")}</p>
      </section>

      {/* ④ FİRMA AYARLARI — salt okunur */}
      <section className="yn-card">
        <h2>{t("bolumAyarlar")}</h2>
        <dl className="yn-facts">
          <dt>{tm("yontemEtiketi")}</dt>
          <dd>{tm(`yontem${kart.ayarlar.maliyetYontemi}`)}</dd>
          <dt>{tm("kipEtiketi")}</dt>
          <dd>{kart.ayarlar.maliyetYontemi === "FIFO" ? tm(`kip${kart.ayarlar.lotKipi}`) : tm("kipOrtalamada")}</dd>
          <dt>{t("ayarCokBirim")}</dt>
          <dd>{kart.ayarlar.finansmanCokBirim ? t("acik") : t("kapali")}</dd>
        </dl>
        <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{t("ayarlarSaltOkunurNotu")}</p>
      </section>
      </div>
      </div>
    </>
  );
}
