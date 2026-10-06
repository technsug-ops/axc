import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { OZELLIKLER } from "@/lib/paket/ozellikler";
import { paketler } from "@/lib/paket/yonetim";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { PaketBilgisiFormu } from "./paket-bilgisi-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("paketler") };
}

/**
 * PAKETLER — süper admin (K303 ②, kullanıcı kararı 30.09 + 06.10.2026).
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
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("paketler")}</h1>
        <p className="text-muted-foreground text-sm">{t("paketlerAciklama")}</p>
      </div>
      <ul className="divide-y rounded-lg border">
        {liste.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 text-sm">
            <Link href={`${YONETIM_YOLU}/paketler/${p.id}`} className="min-w-28 font-medium underline-offset-4 hover:underline">
              {p.ad}
            </Link>
            {p.firmayaOzel ? (
              <Badge variant="outline">{t("firmayaOzelRozet")}</Badge>
            ) : (
              <span className="text-muted-foreground">{t("ozellikSayisi", { secili: p.ozellikler.length, toplam: OZELLIKLER.length })}</span>
            )}
            <span className="text-muted-foreground">{t("paketFirmaSayisi", { sayi: p.firmaSayisi })}</span>
            {p.onerilenTutar !== null && p.onerilenParaBirimi && p.onerilenDonem ? (
              <span className="tabular-nums">{t("onerilenFiyatKisa", { tutar: bicim.para(p.onerilenTutar, p.onerilenParaBirimi), donem: t(`donem${p.onerilenDonem}`) })}</span>
            ) : (
              <span className="text-muted-foreground text-xs">{t("onerilenFiyatYok")}</span>
            )}
            <Button asChild size="sm" variant="outline" className="ml-auto min-h-11">
              <Link href={`${YONETIM_YOLU}/paketler/${p.id}`}>
                <FolderOpen />
                {t("paketiAc")}
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("yeniPaket")}</h2>
        <PaketBilgisiFormu paket={null} />
      </section>
    </div>
  );
}
