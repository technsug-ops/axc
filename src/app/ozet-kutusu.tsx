import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";
import { ozetTazeligi } from "@/lib/ozet/tazelik";
import { DURUM_KUTUSU, DURUM_YAZISI, type DurumRengi } from "@/lib/renkler";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET — PANEL TEASER KUTUSU (K-OZET)
 * ----------------------------------------------------------------------------
 *  İlke #13 ("özet ekranda döküm olmaz"): tam anlatı BURADA çizilmez,
 *  yalnız kısa bir başlık + "Tam özeti gör" bağlantısı durur. Döküm kendi
 *  sayfasına gider (`/ozet`).
 *
 *  ⚠ KENDİ İZNİNİ KENDİ SINAR — `MarjSerhi` deseniyle aynı: sayfa (`page.tsx`)
 *  iznin var olduğunu bilmek zorunda kalmaz, bileşen kendi kapısını taşır.
 *
 *  ⚠ ÜRETMEZ, YALNIZ OKUR. LLM çağrısı burada YAPILMAZ — cron zaten
 *  üretti; bu kutu yalnız `AiOzet`in en son satırını okur (ucuz sorgu).
 * ============================================================================
 */
export async function OzetKutusu() {
  const izinliMi = await izinVarMi("ozet.gor");
  if (!izinliMi) return null;

  const son = await prisma.aiOzet.findFirst({
    orderBy: { createdAt: "desc" },
    select: { durum: true, anlatiMetni: true, createdAt: true },
  });

  const t = await getTranslations("GunlukOzet");
  const tazelik = ozetTazeligi(son?.createdAt ?? null, new Date());

  /** ⚠ HİÇ ÜRETİM YOKSA DA KUTU GÖRÜNÜR — sessizce kaybolmak yerine
   *  "henüz üretilmedi" der (açık sıfır ilkesi). */
  const teaserMetni =
    son?.durum === "YAYINDA" && son.anlatiMetni
      ? son.anlatiMetni.split("\n").find((s) => s.trim() !== "") ?? t("henuzYok")
      : t("henuzYok");

  const durum: DurumRengi = tazelik.durum === "ESKI" ? "uyari" : "bilgi";

  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${
        tazelik.durum === "ESKI" ? DURUM_KUTUSU.uyari : ""
      }`}
    >
      <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t("baslik")}</span>
          {tazelik.durum === "ESKI" ? (
            <span className={`text-xs ${DURUM_YAZISI.uyari}`}>
              {t("bayat")}
            </span>
          ) : null}
        </div>
        <p className={`truncate text-sm ${DURUM_YAZISI[durum]}`}>
          {teaserMetni}
        </p>
        <Link
          href="/ozet"
          className="text-primary inline-block text-xs font-medium hover:underline"
        >
          {t("tamOzetiGor")}
        </Link>
      </div>
    </div>
  );
}
