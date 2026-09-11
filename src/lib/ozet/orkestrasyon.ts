import { prisma } from "@/lib/prisma";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";

import { ozetVeriPaketiOlustur } from "./veri-toplama";
import { anlatiUret } from "./anlati-uret";
import type { AiOzetDurumu } from "@/generated/prisma/enums";
/** Diğer cron koşumlarıyla (hbCekimKos) AYNI kilit ölçütü — tek gövde. */
import { kilitDurumu } from "../../../scripts/bekci-kilit";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET — ÜRETİM KOŞUMU (K-OZET)
 * ----------------------------------------------------------------------------
 *  Veri toplama + LLM çağrısı + doğrulama + yazım — TEK yerde. Cron rotası
 *  (`api/cron/ozet-uret`) bu fonksiyonu çağırır; kendisi hiçbir iş mantığı
 *  taşımaz (TY/N11/HB cron rotalarıyla aynı desen — `hbCekimKos`).
 *
 *  ⚠ İDEMPOTENT — BUGÜNÜN SATIRI ZATEN YAYINDAYSA İKİNCİ TETİK ATLAR.
 *  Çift tetik (cron-job.org + GitHub Actions yedeği aynı gün ikinci kez
 *  vurursa) zararsız olmalı — gerçek API parası ikinci kez harcanmaz.
 * ============================================================================
 */

export type OzetUretimSonucu =
  | { atlandi: "ZATEN_YAYINDA" | "BEKCI_TURU" }
  | { yazildi: true; durum: AiOzetDurumu };

export async function ozetUretKos(): Promise<OzetUretimSonucu> {
  /**
   * ⛔ BEKÇİ TURU SIRASINDA GERÇEK API ÇAĞRISI YAPILMAZ — `hbCekimKos`
   * deseninin AYNISI. CI/bekçi turu canlıya yazmamalı, gerçek para
   * harcamamalı.
   */
  if (kilitDurumu().canli) return { atlandi: "BEKCI_TURU" };

  const bugun = gunDegeri(isTakvimGunu(new Date()));

  const mevcut = await prisma.aiOzet.findFirst({
    where: { isGunu: bugun },
    orderBy: { createdAt: "desc" },
    select: { durum: true },
  });
  if (mevcut?.durum === "YAYINDA") return { atlandi: "ZATEN_YAYINDA" };

  const paket = await ozetVeriPaketiOlustur();
  const sonuc = await anlatiUret(paket);
  const girdiJson = JSON.stringify(paket);

  if (sonuc.tamam) {
    await prisma.aiOzet.create({
      data: {
        isGunu: bugun,
        girdiJson,
        anlatiMetni: sonuc.metin,
        durum: "YAYINDA",
        dogrulamaJson: JSON.stringify({ tamam: true }),
        modelAdi: `${sonuc.saglayiciAdi}:${sonuc.modelAdi}`,
        girdiTokenSayisi: sonuc.girdiTokenSayisi,
        ciktiTokenSayisi: sonuc.ciktiTokenSayisi,
      },
    });
    return { yazildi: true, durum: "YAYINDA" };
  }

  /** ANAHTAR_YOK/API_HATASI → HATA; doğrulama reddi → REDDEDILDI. */
  const durum: AiOzetDurumu =
    sonuc.sebep === "ANAHTAR_YOK" || sonuc.sebep === "API_HATASI"
      ? "HATA"
      : "REDDEDILDI";

  await prisma.aiOzet.create({
    data: {
      isGunu: bugun,
      girdiJson,
      anlatiMetni: null,
      durum,
      dogrulamaJson: JSON.stringify({
        tamam: false,
        sebep: sonuc.sebep,
        detay: sonuc.detay ?? [],
      }),
      modelAdi: `${sonuc.saglayiciAdi}:${sonuc.modelAdi}`,
      girdiTokenSayisi: null,
      ciktiTokenSayisi: null,
    },
  });
  return { yazildi: true, durum };
}
