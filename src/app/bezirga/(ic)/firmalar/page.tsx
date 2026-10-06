import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PanelRightOpen, Plus } from "lucide-react";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { bicimlendirici } from "@/lib/bicim";
import { etiketSayilari, etiketSinifi, firmaEtiketiMi, firmaOzetleri, FIRMA_ETIKETLERI, type FirmaEtiketi } from "@/lib/yonetim/durumlar";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";
import { FirmaCekmecesi } from "./firma-cekmecesi";
import { FirmaEylemleri } from "./firma-eylemleri";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("firmalar") };
}

/** Liste adresi — arama, durum süzgeci ve açık çekmece birlikte taşınır. */
function adres(g: { q?: string; durum?: string; ac?: string }): string {
  const p = new URLSearchParams();
  if (g.q) p.set("q", g.q);
  if (g.durum) p.set("durum", g.durum);
  if (g.ac) p.set("ac", g.ac);
  const s = p.toString();
  return `${YONETIM_YOLU}/firmalar${s ? `?${s}` : ""}`;
}

/**
 * FİRMALAR — referans iskeletin `families` sayfası BİREBİR (HA-Kompass admin):
 * `.toolbar` (arama) + `.segbar` (durum çipleri) + `.tablewrap` tablo; satıra
 * tıklayınca sayfa DEĞİŞMEZ, sağdan çekmece açılır (`?ac=`), seçili satır
 * `tr.sel`. Durum süzgeci «Bugün» ve menü rozetleriyle AYNI etiketten
 * (`lib/yonetim/durumlar`) — sayı = liste (İlke #16).
 * Yalnız KAYIT bilgisi — ticari veri YOK (kullanıcı kararı 04.10.2026).
 * İlke #17: arama kutusu; kaç sonuç bulunduğu yazar.
 */
export default async function FirmalarSayfasi({ searchParams }: { searchParams: Promise<{ q?: string; durum?: string; ac?: string }> }) {
  await yonetimSayfasi();
  const sp = await searchParams;
  const arama = (sp.q ?? "").trim();
  const durum: FirmaEtiketi | undefined = firmaEtiketiMi(sp.durum) ? sp.durum : undefined;
  const t = await getTranslations("Yonetim");
  const tf = await getTranslations("FirmaDurumu");
  const bicim = await bicimlendirici();

  const tumu = await firmaOzetleri();
  const sayilar = etiketSayilari(tumu);
  const aranan = arama.toLocaleLowerCase("tr");
  const firmalar = tumu.filter(
    (f) => (!durum || f.etiketler.includes(durum)) && (!aranan || `${f.ad} ${f.kod}`.toLocaleLowerCase("tr").includes(aranan)),
  );
  const acik = sp.ac && tumu.some((f) => f.id === sp.ac) ? sp.ac : undefined;

  return (
    <>
      <SayfaBasligi
        baslik={t("firmalar")}
        aciklama={t("firmalarAciklama")}
        eylemler={
          <Link href={`${YONETIM_YOLU}/firmalar/yeni`} className="yn-btn primary">
            <Plus aria-hidden />
            {t("yeniFirma")}
          </Link>
        }
      />

      <div className="yn-toolbar">
        <KodAramaKutusu temelAdres={`${YONETIM_YOLU}/firmalar`} baslangic={arama} tasinanlar={durum ? { durum } : {}} ipucu={t("firmaAramaIpucu")} />
      </div>

      {/* DURUM ÇİPLERİ — sayı = liste; seçili olan sıfır olsa da görünür */}
      <nav aria-label={t("durumSuzgeci")} className="yn-card yn-segbar">
        <div className="yn-segrow">
          <Link href={adres({ q: arama })} aria-current={!durum ? "true" : undefined} className={`yn-chip${!durum ? " on" : ""}`}>
            {t("tumu")} <b>{tumu.length}</b>
          </Link>
          {FIRMA_ETIKETLERI.filter((e) => (sayilar.get(e) ?? 0) > 0 || e === durum).map((e) => (
            <Link key={e} href={adres({ q: arama, durum: e })} aria-current={durum === e ? "true" : undefined} className={`yn-chip ${etiketSinifi(e)}${durum === e ? " on" : ""}`}>
              {tf(e)} <b>{sayilar.get(e) ?? 0}</b>
            </Link>
          ))}
        </div>
      </nav>

      <p className="yn-muted yn-small" style={{ margin: "0 0 10px" }}>
        {arama || durum ? t("aramaSonucu", { bulunan: firmalar.length, toplam: tumu.length }) : t("firmaSayisi", { toplam: tumu.length })}
      </p>

      {firmalar.length === 0 ? (
        <div className="yn-card yn-muted">{arama || durum ? t("aramaBos") : t("firmaYok")}</div>
      ) : (
        <div className="yn-tablewrap">
          <table>
            <thead>
              <tr>
                <th>{t("sutunFirma")}</th>
                <th>{t("sutunDurum")}</th>
                <th>{t("sutunPaket")}</th>
                <th className="num">{t("sutunKullanici")}</th>
                <th>{t("sutunAcilis")}</th>
                <th>{t("sutunEylem")}</th>
              </tr>
            </thead>
            <tbody>
              {firmalar.map((f) => (
                <tr key={f.id} className={`click${acik === f.id ? " sel" : ""}`}>
                  <td>
                    <Link href={adres({ q: arama, durum, ac: f.id })} scroll={false} className="yn-rowlink">{f.ad}</Link>
                    <div><KopyalanabilirKod deger={f.kod} etiket={t("firmaKodu")} /></div>
                  </td>
                  <td>
                    {f.etiketler.filter((e) => e !== "AKTIF" || f.etiketler.length === 1).map((e) => (
                      <Link key={e} href={adres({ q: arama, durum: e })} className={`yn-pill ${etiketSinifi(e)}`}>{tf(e)}</Link>
                    ))}
                  </td>
                  <td>{f.paket ? <span className="yn-pill acc">{f.paket}</span> : <span className="yn-muted">—</span>}</td>
                  <td className="num">{bicim.sayi(f.uyeSayisi)}</td>
                  <td className="nw yn-muted">{bicim.tarih(f.acilis)}</td>
                  <td>
                    <div className="yn-row">
                      <Link href={adres({ q: arama, durum, ac: f.id })} scroll={false} className="yn-btn sm">
                        <PanelRightOpen aria-hidden />
                        {t("kartiAc")}
                      </Link>
                      <FirmaEylemleri firmaId={f.id} firmaAdi={f.ad} durum={f.kurulum} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {acik ? <FirmaCekmecesi firmaId={acik} kapatAdresi={adres({ q: arama, durum })} /> : null}
    </>
  );
}
