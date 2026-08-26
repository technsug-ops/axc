import { Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { defterDerinligi } from "@/lib/ice-aktarma-serhi";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  DEFTER DERİNLİĞİ ŞERHİ — "STOK NİYE ŞİŞKİN GÖRÜNÜYOR"
 * ----------------------------------------------------------------------------
 *  Alış defteri satış defterinden derin: o pencerede alınan mal deftere
 *  girdi, SATILDIĞI girmedi. Envanter fotoğrafı onu hâlâ depoda gösteriyor.
 *
 *  ⚠ MEVCUT ŞERHİN YANINA, YERİNE DEĞİL. İki ayrı sebep, iki ayrı çözüm:
 *    · `MarjSerhi`  → satış defterde VAR, maliyet bağı yok
 *    · bu şerh      → satış defterde HİÇ YOK
 *
 *  ⚠ SAYILAR CANLI ve İKİ DEFTER YAN YANA basılıyor — asimetri okunmadan
 *  cümle inandırıcı olmaz. "Alım 1955 / 2024-05-30" ile "satış 556 /
 *  2026-06-17" yan yana görünmezse okuyan rakamı sorgular.
 * ============================================================================
 */
export async function DefterDerinligiSerhi() {
  const d = await defterDerinligi(prisma);
  /**
   * ⚠ SÖNME ÖLÇÜTÜ: kapsanmayan pencerede AÇIK parti kalmadıysa çarpıklık
   * yok. Gün farkına bağlansaydı satış aktarımından sonra da ~18 günlük
   * bir fark kalır ve şerh SÖNMEZDİ.
   */
  if (d.kapsamsizAdet === 0) return null;

  const t = await getTranslations("iceAktarma");
  const bicim = await bicimlendirici();
  return (
    <div
      className={`flex gap-2 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
    >
      <Layers className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <span className="block font-medium">{t("defterDerinligiBaslik")}</span>
        {/*
          ⚠ İKİ DEFTER YAN YANA — asimetri GÖRÜNSÜN. Yalnız sonucu yazmak
          ("stok şişkin") okuyana sebebi vermezdi.
        */}
        <span className="block tabular-nums">
          {t("defterDerinligiSayilar", {
            alim: d.alimSayisi,
            alimTarih: d.alimEnEski ? bicim.tarih(d.alimEnEski) : "—",
            satis: d.satisSayisi,
            satisTarih: d.satisEnEski ? bicim.tarih(d.satisEnEski) : "—",
            gun: d.farkGun,
          })}
        </span>
        <span className="block tabular-nums">
          {t("defterDerinligiSonuc", { adet: d.kapsamsizAdet })}
        </span>
      </div>
    </div>
  );
}
