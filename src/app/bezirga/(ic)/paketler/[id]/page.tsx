import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { paketler } from "@/lib/paket/yonetim";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { OzellikSecici } from "../../ozellik-secici";
import { PaketBilgisiFormu } from "../paket-bilgisi-formu";
import { SayfaBasligi } from "../../sayfa-basligi";
import { SinirFormu } from "../../sinir-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Yonetim");
  await yonetimSayfasi();
  const { id } = await params;
  const p = (await paketler()).find((x) => x.id === id);
  return { title: p ? p.ad : t("paketler") };
}

/**
 * PAKET — bilgi · içerik (özellik seçimi) · sınırlar · bu paketteki firmalar;
 * her bölüm referans `.card` (iskelet BİREBİR). Firmaya özel pakette
 * (Individuel) içerik firma kartında seçilir.
 */
export default async function PaketSayfasi({ params }: { params: Promise<{ id: string }> }) {
  await yonetimSayfasi();
  const { id } = await params;
  const p = (await paketler()).find((x) => x.id === id);
  if (!p) notFound();
  const t = await getTranslations("Yonetim");
  // SISTEM: yönetim katmanı — bu paketteki firmaların KAYDI (ticari veri değil).
  const firmalar = await sistemPrisma.company.findMany({ where: { paketId: p.id }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } });

  return (
    <>
      <SayfaBasligi baslik={p.ad} ust={<ListeyeDon href={`${YONETIM_YOLU}/paketler`}>{t("paketler")}</ListeyeDon>} />

      <div className="yn-grid2">
        <div className="yn-stack">
          <section className="yn-card">
            <h2>{t("paketIcerigi")}</h2>
            {p.firmayaOzel ? (
              <p className="yn-muted yn-small" style={{ margin: 0 }}>{t("firmayaOzelIcerikNotu")}</p>
            ) : (
              <>
                <p className="yn-muted yn-small" style={{ margin: "0 0 10px" }}>{t("paketIcerigiNotu", { sayi: p.firmaSayisi })}</p>
                <OzellikSecici hedef={{ tur: "paket", id: p.id }} baslangic={p.ozellikler} />
              </>
            )}
          </section>

          <section className="yn-card">
            <h2>{t("bolumSinirlar")}</h2>
            {p.firmayaOzel ? (
              <p className="yn-muted yn-small" style={{ margin: 0 }}>{t("firmayaOzelSinirNotu")}</p>
            ) : (
              <>
                <p className="yn-muted yn-small" style={{ margin: "0 0 10px" }}>{t("sinirAciklama")}</p>
                <SinirFormu hedef={{ tur: "paket", id: p.id }} baslangic={p.sinirlar} />
              </>
            )}
          </section>
        </div>

        <div className="yn-stack">
          <section className="yn-card">
            <h2>{t("paketBilgisi")}</h2>
            <PaketBilgisiFormu
              paket={{
                id: p.id,
                ad: p.ad,
                aciklama: p.aciklama,
                tutar: p.onerilenTutar === null ? "" : p.onerilenTutar.toFixed(2).replace(".", ","),
                paraBirimi: p.onerilenParaBirimi ?? "TRY",
                donem: p.onerilenDonem ?? "AYLIK",
              }}
            />
          </section>

          <section className="yn-card">
            <h2>{t("paketFirmalari", { sayi: firmalar.length })}</h2>
            {firmalar.length === 0 ? (
              <p className="yn-muted yn-small" style={{ margin: 0 }}>{t("paketFirmasiYok")}</p>
            ) : (
              <div className="yn-tl" style={{ marginTop: 0 }}>
                {firmalar.map((f) => (
                  <Link key={f.id} href={`${YONETIM_YOLU}/firmalar/${f.id}#paket`} className="yn-rowlink" style={{ minHeight: 44, borderTop: "1px solid var(--line)" }}>
                    {f.name} <span className="yn-muted" style={{ fontWeight: 400, marginLeft: 6 }}>{f.code}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
