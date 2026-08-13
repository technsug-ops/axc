import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { elKitabiParcalari } from "@/lib/el-kitabi/uret";

/**
 * EL KİTABI — uygulamanın içinde.
 *
 * Canlı veriyi okuduğu için her istekte yeniden çizilir. Raf eklediğinizde
 * el kitabındaki raf listesi de değişir; belge sistemden KOPUK değildir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("elKitabi") };
}

export default async function ElKitabiSayfasi() {
  await sayfaIzni("elkitabi.gor");

  const t = await getTranslations("ElKitabi");
  const bicim = await bicimlendirici();

  const uretimTarihi = bicim.tarih(new Date());
  const { bicem, govde } = await elKitabiParcalari(uretimTarihi);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button variant="outline" asChild>
          <a href="/api/el-kitabi" download>
            <Download />
            {t("dosyaIndir")}
          </a>
        </Button>
      </div>

      {/* Belge kendi biçemini taşır; uygulamanın stilleriyle çakışmasın diye
          bütün seçiciler `.ek` altında sınırlandırılmıştır. */}
      <style dangerouslySetInnerHTML={{ __html: bicem }} />
      <div
        className="-mx-4 md:-mx-6"
        dangerouslySetInnerHTML={{ __html: govde }}
      />
    </div>
  );
}
