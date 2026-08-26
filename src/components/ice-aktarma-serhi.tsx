import { FileWarning } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DURUM_KUTUSU } from "@/lib/renkler";
import { iceAktarmaStokAyrismasi } from "@/lib/ice-aktarma-serhi";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  İÇE AKTARMA ŞERHİ — TUTANAK, GÖREV DEĞİL
 * ----------------------------------------------------------------------------
 *  A3-③'te içe aktarılan satışlar stok düşürmedi (bilinçli karar). Bunu
 *  gören ekranlar bunu SÖYLEMELİ; söylemezse stok ekranına bakan biri
 *  sistemin bozuk olduğunu düşünür.
 *
 *  ⚠ BU BİR GÖREV KUTUSU DEĞİL. Okuyanın bugün yapabileceği bir şey yok —
 *  stok bağı ayrı ve sonraki bir karar. Bu yüzden uyarı kutusuna değil
 *  ekranın kendi gövdesine, kalıcı bir TUTANAK olarak konuyor.
 *  _(Anayasa: "kapanamayacak kayıp, görev değil kayıttır".)_
 *
 *  ⚠ VE SIFIRSA HİÇ ÇIKMAZ: sönmeyen bir şerh okunmaz olur.
 * ============================================================================
 */
export async function IceAktarmaSerhi() {
  const adet = await iceAktarmaStokAyrismasi(prisma);
  if (adet === 0) return null;

  const t = await getTranslations("iceAktarma");
  return (
    <div
      className={`flex gap-2 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
    >
      <FileWarning className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <span className="block tabular-nums">{t("stokAyrismasi", { adet })}</span>
        {/*
          ⚠ "KAPANAMAZ" DEĞİL "BEKLİYOR" DENİYOR — ve fark önemli. Tarife
          deliği hiçbir eylemle kapanmıyordu; bu ayrışma kapanabilir, yalnız
          kararı verilmedi. İkisini aynı dille anlatmak, kapanabilir bir işi
          kapanamaz sanmaya yol açardı.
        */}
        <span className="block">{t("stokAyrismasiNiye")}</span>
      </div>
    </div>
  );
}
