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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("Yonetim");
  await yonetimSayfasi();
  const { id } = await params;
  const p = (await paketler()).find((x) => x.id === id);
  return { title: p ? p.ad : t("paketler") };
}

/**
 * PAKET — bilgi · içerik (özellik seçimi) · bu paketteki firmalar.
 * Firmaya özel pakette (Individuel) içerik firma kartında seçilir.
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
    <div className="max-w-3xl space-y-6">
      <div>
        <ListeyeDon href={`${YONETIM_YOLU}/paketler`}>{t("paketler")}</ListeyeDon>
        <h1 className="mt-1 text-2xl font-semibold">{p.ad}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("paketBilgisi")}</h2>
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

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("paketIcerigi")}</h2>
        {p.firmayaOzel ? (
          <p className="text-muted-foreground text-sm">{t("firmayaOzelIcerikNotu")}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t("paketIcerigiNotu", { sayi: p.firmaSayisi })}</p>
            <OzellikSecici hedef={{ tur: "paket", id: p.id }} baslangic={p.ozellikler} />
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("paketFirmalari", { sayi: firmalar.length })}</h2>
        {firmalar.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("paketFirmasiYok")}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {firmalar.map((f) => (
              <li key={f.id} className="px-3 py-2">
                <Link href={`${YONETIM_YOLU}/firmalar/${f.id}#paket`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                  {f.name} ({f.code})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
