import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ExternalLink, X } from "lucide-react";

import { KullanimKutulari } from "@/components/kullanim-kutulari";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { askiDurumu, bugunIs } from "@/lib/aski-sureci";
import { bicimlendirici } from "@/lib/bicim";
import { firmaKarti } from "@/lib/firma-karti";
import { odemeDurumu } from "@/lib/odeme-takibi";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { kullanimGorunumu } from "@/lib/paket/kullanim-gorunumu";
import { firmaPaketi } from "@/lib/paket/yonetim";
import { etiketSinifi, firmaOzetleri } from "@/lib/yonetim/durumlar";

/**
 * FİRMA ÇEKMECESİ — referans iskeletin sağdan açılan `aside.drawer`ı BİREBİR:
 * `.scrim` perde + `.drawer` (beyaz başlık, `.dbody` içinde `.card` bölümler,
 * `.facts` tanım listesi, `.stats` sayılar). Sunucuda çizilir (`?ac=<id>`);
 * kapatmak adresten `ac`yi düşüren bir bağlantıdır (perde de aynı yere gider).
 * Özet: durum etiketleri · paket · abonelik/vade · askı · kullanım ·
 * kullanıcılar · kayıt sayıları. Tam kart bağlantıyla açılır — çekmece
 * YAZMAZ, yalnız gösterir.
 */
export async function FirmaCekmecesi({ firmaId, kapatAdresi }: { firmaId: string; kapatAdresi: string }) {
  const [kart, kg, fp, ozetler] = await Promise.all([firmaKarti(firmaId), kullanimGorunumu(firmaId), firmaPaketi(firmaId), firmaOzetleri()]);
  if (!kart) return null;
  const t = await getTranslations("YonetimCekmece");
  const tf = await getTranslations("FirmaDurumu");
  const ts = await getTranslations("AskiSebebi");
  const ty = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  const bugun = bugunIs();
  const etiketler = ozetler.find((o) => o.id === firmaId)?.etiketler ?? [];
  const od = odemeDurumu(kart.abonelik.vade, bugun);
  const aski = askiDurumu({ aktif: kart.aktif, uyariSonGun: kart.aski.uyariSonGun, uyariSebebi: kart.aski.uyariSebebi as FirmaAskiSebebi | null, askiSebebi: kart.aski.askiSebebi as FirmaAskiSebebi | null }, bugun);
  const kartAdresi = `${YONETIM_YOLU}/firmalar/${kart.id}`;
  const aktifKullanici = kart.kullanicilar.filter((k) => k.aktif);

  const odemeMetni =
    od.tur === "TANIMSIZ" ? t("odemeTanimsiz")
    : od.tur === "GECIKTI" ? t("odemeGecikti", { gecen: od.gecenGun, tarih: bicim.tarih(od.vade) })
    : t("odemeKalan", { kalan: od.kalanGun, tarih: bicim.tarih(od.vade) });
  const askiMetni =
    aski.tur === "NORMAL" ? t("askiYok")
    : aski.tur === "ASKIDA" ? t("askida", { sebep: aski.sebep ? ts(aski.sebep) : "—" })
    : aski.tur === "UYARIDA" ? t("uyarida", { tarih: bicim.tarih(aski.sonGun), sebep: aski.sebep ? ts(aski.sebep) : "—" })
    : t("uyariDoldu", { tarih: bicim.tarih(aski.sonGun) });
  const odemeSinifi = od.tur === "GECIKTI" ? "yn-pill bad" : od.tur === "YAKLASIYOR" ? "yn-pill warn" : "yn-link";

  return (
    <>
      <Link href={kapatAdresi} scroll={false} aria-label={t("kapat")} className="yn-scrim" />
      <aside role="dialog" aria-modal="true" aria-label={kart.ad} className="yn-drawer">
        <header>
          <div style={{ minWidth: 0 }}>
            <h2>{kart.ad}</h2>
            <div className="yn-row">
              <KopyalanabilirKod deger={kart.kod} etiket={ty("firmaKodu")} />
              {etiketler.map((e) => (
                <span key={e} className={`yn-pill ${etiketSinifi(e)}`}>{tf(e)}</span>
              ))}
            </div>
          </div>
          <Link href={kapatAdresi} scroll={false} aria-label={t("kapat")} className="yn-btn">
            <X aria-hidden />
          </Link>
        </header>

        <div className="dbody">
          <section className="yn-card">
            <dl className="yn-facts">
              <dt>{t("paket")}</dt>
              <dd>
                <Link href={`${kartAdresi}#paket`} className="yn-link">{fp?.paket ? fp.paket.ad : t("paketsiz")}</Link>
              </dd>
              <dt>{t("odeme")}</dt>
              <dd>
                <Link href={`${kartAdresi}#odemeler`} className={odemeSinifi}>{odemeMetni}</Link>
              </dd>
              <dt>{t("aski")}</dt>
              <dd>
                <Link href={`${kartAdresi}#aski`} className="yn-link">{askiMetni}</Link>
              </dd>
              <dt>{t("acilis")}</dt>
              <dd>{bicim.tarih(kart.acilis)}</dd>
            </dl>
          </section>

          <section className="yn-card">
            <h3 style={{ marginBottom: 10 }}>{t("kullanim")}</h3>
            <KullanimKutulari kullanim={kg.kullanim} sinirlar={kg.sinirlar} etiketler={kg.etiketler} durumlar={kg.durumlar} sinirsiz={kg.sinirsiz} />
          </section>

          <section className="yn-card">
            <h3>{t("kullanicilar", { aktif: aktifKullanici.length, toplam: kart.kullanicilar.length })}</h3>
            <div className="yn-tl">
              {kart.kullanicilar.slice(0, 6).map((k) => (
                <div key={k.id} className="yn-tlrow">
                  <span><b>{k.ad ?? k.eposta}</b></span>
                  <span className="yn-muted">
                    {k.rol}
                    {!k.aktif ? <span className="yn-pill" style={{ marginLeft: 6 }}>{t("pasif")}</span> : null}
                  </span>
                  <span className="yn-muted yn-small nw">{k.sonGiris ? t("sonGiris", { tarih: bicim.tarihSaat(k.sonGiris) }) : t("hicGirmedi")}</span>
                </div>
              ))}
            </div>
            {kart.kullanicilar.length > 6 ? (
              <Link href={kartAdresi} className="yn-link yn-small" style={{ display: "inline-flex", minHeight: 44, alignItems: "center" }}>{t("tumKullanicilar", { sayi: kart.kullanicilar.length })}</Link>
            ) : null}
          </section>

          <section className="yn-card">
            <h3 style={{ marginBottom: 10 }}>{t("kayitlar")}</h3>
            <div className="yn-stats">
              {[
                { a: ty("sayiUrun"), d: kart.sayilar.urun },
                { a: ty("sayiSatis"), d: kart.sayilar.satis },
                { a: ty("sayiAlim"), d: kart.sayilar.alim },
              ].map((x) => (
                <div key={x.a} className="yn-stat">
                  <b>{bicim.sayi(x.d)}</b>
                  <span>{x.a}</span>
                </div>
              ))}
            </div>
            <p className="yn-muted yn-small" style={{ margin: "10px 0 0" }}>{ty("sayilarNotu")}</p>
          </section>

          <Link href={kartAdresi} className="yn-btn primary" style={{ justifySelf: "start" }}>
            <ExternalLink aria-hidden />
            {t("kartiAc")}
          </Link>
        </div>
      </aside>
    </>
  );
}
