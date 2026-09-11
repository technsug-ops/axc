import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { Sparkles, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { ozetTazeligi } from "@/lib/ozet/tazelik";
import { yedekAnlatiOlustur } from "@/lib/ozet/yedek-anlati";
import type { OzetVeriPaketi } from "@/lib/ozet/veri-toplama";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET SAYFASI (K-OZET)
 * ----------------------------------------------------------------------------
 *  Bu sayfa ÜRETMEZ, yalnız OKUR. LLM çağrısı ve doğrulama cron işinde
 *  (`api/cron/ozet-uret` → `ozetUretKos`) olup bitiyor; burası son üretilen
 *  `AiOzet` satırını gösteriyor.
 *
 *  ⚠ DURUM YAYINDA DEĞİLSE PROSE YERİNE YAPISAL LİSTE — `yedekAnlatiOlustur`
 *  aynı `girdiJson`den (zaten biçimlenmiş, doğrulanmış rakamlarla) türer;
 *  LLM hiç karışmaz, sayı güvenliği yapı gereği korunur.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("gunlukOzet") };
}

export default async function GunlukOzetSayfasi() {
  await sayfaIzni("ozet.gor");

  const t = await getTranslations("GunlukOzet");
  const bicim = await bicimlendirici();

  const son = await prisma.aiOzet.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      durum: true,
      anlatiMetni: true,
      girdiJson: true,
      createdAt: true,
      isGunu: true,
    },
  });

  const tazelik = ozetTazeligi(son?.createdAt ?? null, new Date());
  const paket = son ? (JSON.parse(son.girdiJson) as OzetVeriPaketi) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6" aria-hidden />
          {t("baslik")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("aciklama")}</p>
      </div>

      {/* ── TAZELİK ROZETİ ────────────────────────────────────────────── */}
      {tazelik.durum === "ESKI" ? (
        <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {t("tazelikEski", { saat: Math.round(tazelik.saat) })}
          </p>
        </div>
      ) : tazelik.durum === "YOK" ? (
        <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.notr}`}>
          <p className={DURUM_YAZISI.notr}>{t("hicUretimYok")}</p>
        </div>
      ) : null}

      {son === null ? null : (
        <>
          {/* ── İÇERİK ──────────────────────────────────────────────────── */}
          {son.durum === "YAYINDA" && son.anlatiMetni ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                {bicim.tarihSaat(son.createdAt)}
              </p>
              <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line">
                {son.anlatiMetni}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
                <p className={DURUM_YAZISI.uyari}>
                  {son.durum === "REDDEDILDI"
                    ? t("durumReddedildi")
                    : t("durumHata")}
                </p>
              </div>
              <pre className="bg-muted/40 rounded-md border p-3 text-sm whitespace-pre-wrap">
                {paket ? yedekAnlatiOlustur(paket) : ""}
              </pre>
            </div>
          )}

          {/* ── KAYNAKLAR — İlke #16: her kalem kendi ekranına gider ────── */}
          {paket && paket.baglamlar.length > 0 ? (
            <div className="space-y-1 border-t pt-3">
              <p className="text-muted-foreground text-xs font-medium">
                {t("kaynagaGit")}
              </p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {paket.baglamlar.map((b) => (
                  <li key={b.anahtar}>
                    <Baglanti href={b.adres}>{b.baslik}</Baglanti>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
