import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";

import { bicimlendirici } from "@/lib/bicim";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { OZELLIKLER } from "@/lib/paket/ozellikler";
import { paketler } from "@/lib/paket/yonetim";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { PaketBilgisiFormu } from "./paket-bilgisi-formu";
import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("paketler") };
}

/**
 * PAKETLER — süper admin (K303 ②, kullanıcı kararı 30.09 + 06.10.2026),
 * referans iskelet BİREBİR (`.tablewrap` tablo + `.card` form).
 * Paket içeriği VERİDİR; her paketin kaç özelliği ve kaç firması olduğu
 * listede yazar. Satır sayısı veriyle pek büyümez (bir avuç paket) — arama
 * kutusu bu yüzden yok (İlke #17 «veriyle büyüyen liste» şartı).
 */
export default async function PaketlerSayfasi() {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  const liste = await paketler();

  return (
    <>
      <SayfaBasligi baslik={t("paketler")} aciklama={t("paketlerAciklama")} />
      <div className="yn-stack">
        <div className="yn-tablewrap">
          <table>
            <thead>
              <tr>
                <th>{t("sutunPaket")}</th>
                <th>{t("sutunIcerik")}</th>
                <th className="num">{t("sutunFirmaSayisi")}</th>
                <th>{t("sutunOnerilenFiyat")}</th>
                <th>{t("sutunEylem")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.id} className="click">
                  <td><Link href={`${YONETIM_YOLU}/paketler/${p.id}`} className="yn-rowlink">{p.ad}</Link></td>
                  <td>
                    {p.firmayaOzel ? (
                      <span className="yn-pill warn">{t("firmayaOzelRozet")}</span>
                    ) : (
                      <span className="yn-pill acc">{t("ozellikSayisi", { secili: p.ozellikler.length, toplam: OZELLIKLER.length })}</span>
                    )}
                  </td>
                  <td className="num">{bicim.sayi(p.firmaSayisi)}</td>
                  <td className="nw">
                    {p.onerilenTutar !== null && p.onerilenParaBirimi && p.onerilenDonem ? (
                      t("onerilenFiyatKisa", { tutar: bicim.para(p.onerilenTutar, p.onerilenParaBirimi), donem: t(`donem${p.onerilenDonem}`) })
                    ) : (
                      <span className="yn-muted yn-small">{t("onerilenFiyatYok")}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`${YONETIM_YOLU}/paketler/${p.id}`} className="yn-btn sm">
                      <FolderOpen aria-hidden />
                      {t("paketiAc")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="yn-card">
          <h2>{t("yeniPaket")}</h2>
          <PaketBilgisiFormu paket={null} />
        </section>
      </div>
    </>
  );
}
