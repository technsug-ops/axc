import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { pushAyari } from "@/lib/bildirim/push-gonder";
import { BuCihaz, CihazKaldir } from "./bu-cihaz";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";
/** Gecikmeli deneme cevaptan sonra 10 sn bekler (`after`) — süre sınırı ona yetmeli. */
export const maxDuration = 60;

export async function generateMetadata() {
  const t = await getTranslations("AnlikBildirim");
  return { title: t("baslik") };
}

/**
 * ANLIK BİLDİRİMLER (20.10.2026) — telefon kilitliyken / sekme kapalıyken yeni
 * sipariş haberi. Cihaz başına açılır. Bildirimi yalnız satışları görme izni
 * olan alır (`satis.gor`) — ekran da aynı izinle açılır.
 */
export default async function BildirimlerSayfasi() {
  const baglam = await sayfaIzni("satis.gor");
  const t = await getTranslations("AnlikBildirim");
  const bicim = await bicimlendirici();
  const ayar = pushAyari();
  const [cihazlar, son] = await Promise.all([
    prisma.pushAboneligi.findMany({ where: { userId: baglam.kullaniciId }, orderBy: { createdAt: "desc" }, select: { id: true, cihaz: true, createdAt: true } }),
    prisma.auditLog.findFirst({ where: { action: "ANLIK_BILDIRIM_SIPARIS" }, orderBy: { createdAt: "desc" }, select: { createdAt: true, detail: true } }),
  ]);
  let sonSayi: number | null = null;
  try { sonSayi = son?.detail ? Number(JSON.parse(son.detail).sayi) : null; } catch { sonSayi = null; }

  return <div className="min-w-0 max-w-3xl space-y-6">
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
      <p className="text-sm text-muted-foreground">{t("aciklama")}</p>
    </div>

    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">{t("buCihaz")}</h2>
      {ayar ? <BuCihaz genelAnahtar={ayar.genel} /> : <p role="alert" className="text-destructive text-sm font-medium">{t("kurulmadi")}</p>}
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("cihazlarim", { sayi: cihazlar.length })}</h2>
      {!cihazlar.length ? <p className="text-sm text-muted-foreground">{t("cihazYok")}</p> : <ul className="divide-y rounded-lg border">
        {cihazlar.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="min-w-0"><p className="font-medium">{c.cihaz ?? t("bilinmeyenCihaz")}</p><p className="text-sm text-muted-foreground">{t("acildiTarih", { tarih: bicim.tarih(c.createdAt) })}</p></div>
          <CihazKaldir id={c.id} />
        </li>)}
      </ul>}
    </section>

    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t("sonGonderim")}</h2>
      <p className="text-sm">{son ? t("sonGonderimMetni", { an: bicim.tarihSaat(son.createdAt), sayi: sonSayi ?? 0 }) : t("sonGonderimYok")}</p>
    </section>

    {/* BİLDİRİM SESİ (kullanıcı 20.10.2026): varsayılan telefonun sesi; isteyen kasa sesini
        seçer. Seçim TELEFONDA yapılır — web bildirimi ses dosyası taşıyamaz; burada dosya + tarif. */}
    <section className="space-y-3 rounded-lg border p-4 text-sm">
      <h2 className="text-lg font-semibold">{t("sesBaslik")}</h2>
      <p><strong>{t("sesVarsayilanBaslik")}</strong> — {t("sesVarsayilan")}</p>
      <p><strong>{t("sesKasaBaslik")}</strong> — {t("sesKasa")}</p>
      <a href="/bildirimler/kasa-sesi" download className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-medium hover:bg-accent"><Download className="size-4" />{t("sesIndir")}</a>
      <ol className="list-decimal space-y-1 pl-5">
        <li>{t("sesAdim1")}</li>
        <li>{t("sesAdim2")}</li>
        <li>{t("sesAdim3")}</li>
        <li>{t("sesAdim4")}</li>
      </ol>
      <p className="text-muted-foreground">{t("sesIphone")}</p>
    </section>

    <section className="space-y-2 text-sm">
      <h2 className="text-lg font-semibold">{t("sinirlarBaslik")}</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>{t("sinirAndroid")}</li>
        <li>{t("sinirIphone")}</li>
        <li>{t("sinirBilgisayar")}</li>
        <li>{t("sinirGecikme")}</li>
        <li>{t("sinirSes")}</li>
      </ul>
    </section>
  </div>;
}
