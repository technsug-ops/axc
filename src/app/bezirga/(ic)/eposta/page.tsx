import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { gidenEpostalar } from "@/lib/eposta";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";
import { sorunluEpostalar } from "@/lib/yonetim/durumlar";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("gidenEpostalar") };
}

/**
 * GİDEN E-POSTALAR (K303, kullanıcı kararı 05.10.2026: «mailler super adminde
 * olmalı») — referans iskeletin `mail` sayfası BİREBİR (`.segbar` çipleri +
 * `.tablewrap` tablo, durum `.pill`). Kaynak iz (`EPOSTA_GONDERILDI` ·
 * `EPOSTA_GONDERILEMEDI` · `EPOSTA_AYAR_YOK`); gönderilemeyenin sebebi TAM
 * yazar (İlke #5).
 */
export default async function GidenEpostalarSayfasi({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  /* «sorunlu» süzgeci — «Bugün»deki satır ve menü rozetiyle AYNI ölçüt
     (`sorunluEpostalar`): gönderilemeyen + ayarı olmayan, son 30 gün. */
  const sorunlu = (await searchParams).durum === "sorunlu";
  const liste = sorunlu ? await sorunluEpostalar() : await gidenEpostalar({ adet: 100 });

  return (
    <>
      <SayfaBasligi baslik={t("gidenEpostalar")} aciklama={t("epostaListeNotu")} />
      <nav className="yn-card yn-segbar">
        <div className="yn-segrow">
          <Link href={`${YONETIM_YOLU}/eposta`} aria-current={!sorunlu ? "true" : undefined} className={`yn-chip${!sorunlu ? " on" : ""}`}>{t("epostaSuzgecTumu")}</Link>
          <Link href={`${YONETIM_YOLU}/eposta?durum=sorunlu`} aria-current={sorunlu ? "true" : undefined} className={`yn-chip bad${sorunlu ? " on" : ""}`}>{t("epostaSuzgecSorunlu")}</Link>
        </div>
      </nav>
      <p className="yn-muted yn-small" style={{ margin: "0 0 10px" }}>{t("epostaSayisi", { sayi: liste.length })}</p>
      {liste.length === 0 ? (
        <div className="yn-card yn-muted">{t("epostaYok")}</div>
      ) : (
        <div className="yn-tablewrap">
          <table>
            <thead>
              <tr>
                <th>{t("epostaSutunZaman")}</th>
                <th>{t("epostaSutunDurum")}</th>
                <th>{t("epostaKime")}</th>
                <th>{t("epostaKonu")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((e) => (
                <tr key={e.id}>
                  <td className="nw yn-muted">{bicim.tarihSaat(e.an)}</td>
                  <td>
                    <span className={`yn-pill ${e.durum === "GONDERILDI" ? "ok" : "bad"}`}>
                      {e.durum === "GONDERILDI" ? t("epostaDurumGitti") : e.durum === "AYAR_YOK" ? t("epostaDurumAyarYok") : t("epostaDurumGitmedi")}
                    </span>
                  </td>
                  <td>
                    {e.kime}
                    {e.firma ? <div className="yn-muted yn-small">{t("epostaFirma")}: {e.firma}</div> : null}
                  </td>
                  <td>
                    {e.konu}
                    {e.hata ? <div className="yn-small" style={{ color: "var(--bad)" }}>{e.hata}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
