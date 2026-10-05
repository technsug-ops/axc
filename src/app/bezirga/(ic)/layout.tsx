import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Building2, Mail } from "lucide-react";

import { CikisButonu } from "@/components/cikis-butonu";
import { UYGULAMA } from "@/lib/uygulama";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { yonetimCikisYap } from "../actions";

/**
 * SELLİORA YÖNETİM KABUĞU (K303 4c-2). Firma menüsü YOK — yönetim katmanı
 * firmaya bağlı değil. Kapı: proxy (jeton + işaret) + burada süper admin
 * işareti veritabanından; sayfalar da kendi kapısını ayrıca çağırır.
 */
export default async function YonetimKabugu({ children }: { children: React.ReactNode }) {
  const k = await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  return (
    <div className="min-h-svh">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-3 md:px-4">
        <Link href={`${YONETIM_YOLU}/firmalar`} className="font-semibold">
          {t("kabukBasligi", { uygulama: UYGULAMA.ad })}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href={`${YONETIM_YOLU}/firmalar`} className="hover:bg-muted flex min-h-11 items-center gap-1.5 rounded-md px-3 underline-offset-4 hover:underline">
            <Building2 className="size-4" />
            {t("firmalar")}
          </Link>
          <Link href={`${YONETIM_YOLU}/eposta`} className="hover:bg-muted flex min-h-11 items-center gap-1.5 rounded-md px-3 underline-offset-4 hover:underline">
            <Mail className="size-4" />
            {t("gidenEpostalar")}
          </Link>
        </nav>
        <div className="ml-auto">
          <CikisButonu eposta={k.email} eylem={yonetimCikisYap} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}
