import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CircleCheck } from "lucide-react";

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
        adim = <p role="alert" className="yn-msg err">{t(k.hata === "SIR_YOK" || k.hata === "SIR_GECERSIZ" ? "ikiAdimSunucuAyari" : "ikiAdimKurulumHatasi")}</p>;
      }
    }
  }
  return (
    <div className="yn-login">
      {/* Referans giriş ekranı: logo kutusu + ad + alt başlık, altında tek kart. */}
      <div className="yn-row" style={{ justifyContent: "center", gap: 12 }}>
        <span className="yn-brand" style={{ padding: 0 }}>
          <span className="logo">{UYGULAMA.ad.slice(0, 1)}</span>
        </span>
        <div>
          <h1>{t("girisBasligi", { uygulama: UYGULAMA.ad })}</h1>
          <p className="yn-muted yn-small" style={{ margin: 0 }}>{t("girisAltBaslik")}</p>
        </div>
      </div>
      <div className="yn-card yn-stack" style={{ gap: 12 }}>
        {parola === "degisti" ? (
          <p role="status" className="yn-msg ok yn-row" style={{ margin: 0, alignItems: "flex-start", flexWrap: "nowrap" }}>
            <CircleCheck width={16} height={16} style={{ flex: "none", marginTop: 3 }} aria-hidden />
            {t("parolaDegistiBilgi")}
          </p>
        ) : null}
        {adim ?? <YonetimGirisFormu />}
      </div>
    </div>
  );
}
