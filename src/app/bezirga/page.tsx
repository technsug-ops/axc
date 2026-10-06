import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CircleCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { UYGULAMA } from "@/lib/uygulama";
import { sistemPrisma } from "@/lib/prisma";
import { araAdimKullanicisi, yonetimOturumu } from "@/lib/yonetim-oturumu";
import { ikiAdimDurumu, kurulumAnahtari } from "@/lib/iki-adim/depo";
import QRCode from "qrcode";

import { YonetimGirisFormu } from "./giris-formu";
import { IkiAdimKodFormu, IkiAdimKurulumFormu } from "./iki-adim-formlari";
import { YONETIM_ANA } from "@/lib/yonetim/menu";

/** Giriş durumu her istekte taze okunmalı. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("sekmeBasligi") };
}

/**
 * SELLİORA YÖNETİM GİRİŞİ (K303 4c-2). Proxy'nin AÇIK bıraktığı tek yönetim
 * yolu. Süper admin zaten girmişse firma listesine geçer.
 */
export default async function YonetimGirisSayfasi({ searchParams }: { searchParams: Promise<{ parola?: string }> }) {
  const { parola } = await searchParams;
  const acik = await yonetimOturumu();
  if (acik) redirect(acik.parolaDegismeli ? `${YONETIM_YOLU}/parola` : YONETIM_ANA);
  const t = await getTranslations("Yonetim");

  /* K303 ⑤ — parola geçtiyse (ara adım çerezi) kod adımı ya da ilk kurulum.
     Oturum bu sayfada değil, kodu doğrulayan eylemde açılır. */
  const ara = await araAdimKullanicisi();
  let adim: React.ReactNode = null;
  if (ara) {
    if ((await ikiAdimDurumu(ara.id)) === "ACIK") {
      adim = <IkiAdimKodFormu eposta={ara.email} />;
    } else {
      const k = await kurulumAnahtari(ara.id, ara.email);
      if (k.durum === "TAMAM") {
        const qr = await QRCode.toDataURL(k.otpauth, { margin: 1, width: 200 });
        // SISTEM: kişinin parola zorunluluğu (devam adresi).
        const p = await sistemPrisma.user.findUnique({ where: { id: ara.id }, select: { mustChangePassword: true } });
        adim = <IkiAdimKurulumFormu qr={qr} anahtar={k.anahtar} devamAdresi={p?.mustChangePassword ? `${YONETIM_YOLU}/parola` : YONETIM_ANA} />;
      } else {
        // Sessiz başarısızlık yok (İlke #5): kurulum neden açılamıyor, ekranda yazar.
        adim = <p role="alert" className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>{t(k.hata === "SIR_YOK" || k.hata === "SIR_GECERSIZ" ? "ikiAdimSunucuAyari" : "ikiAdimKurulumHatasi")}</p>;
      }
    }
  }
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{t("girisBasligi", { uygulama: UYGULAMA.ad })}</h1>
          <p className="text-muted-foreground text-sm">{t("girisAltBaslik")}</p>
        </div>
        <Card>
          <CardContent className="space-y-3">
            {parola === "degisti" ? (
              <p role="status" className={`flex items-start gap-2 rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
                {t("parolaDegistiBilgi")}
              </p>
            ) : null}
            {adim ?? <YonetimGirisFormu />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
