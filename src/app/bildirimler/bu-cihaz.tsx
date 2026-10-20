"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BellOff, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anahtarBaytlari, cihazEtiketi } from "@/lib/bildirim/push-karar";
import { aboneOl, abonelikKaldir, denemeGonder, type BildirimSonucu } from "./eylemler";

/**
 * BU CİHAZ — anlık bildirimi aç/kapat (20.10.2026). Her durum ekranda NEDENİYLE
 * yazar (İlke #5): tarayıcı desteklemiyor · iPhone'da ana ekrana eklenmemiş ·
 * izin reddedilmiş · servis çalışanı yok (yalnız yayındaki sürümde kayıtlı).
 */
type Durum = "yukleniyor" | "desteklenmiyor" | "iosAnaEkran" | "swYok" | "reddedildi" | "acik" | "kapali";

async function kayit(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

export function BuCihaz({ genelAnahtar }: { genelAnahtar: string }) {
  const t = useTranslations("AnlikBildirim");
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [sonuc, setSonuc] = useState<BildirimSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  useEffect(() => {
    let iptal = false;
    const bak = async (): Promise<Durum> => {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua);
      const anaEkranda = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (ios && !anaEkranda) return "iosAnaEkran";
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "desteklenmiyor";
      if (Notification.permission === "denied") return "reddedildi";
      const k = await kayit();
      if (!k) return "swYok";
      return (await k.pushManager.getSubscription()) ? "acik" : "kapali";
    };
    bak()
      .then((d) => { if (!iptal) setDurum(d); })
      .catch((hata) => { console.error("[anlik-bildirim] durum okunamadı:", hata); if (!iptal) setDurum("desteklenmiyor"); });
    return () => { iptal = true; };
  }, []);

  const ac = () => basla(async () => {
    setSonuc(null);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") { setDurum(izin === "denied" ? "reddedildi" : "kapali"); setSonuc({ tamam: false, hata: t("izinVerilmedi") }); return; }
      const k = await kayit();
      if (!k) { setDurum("swYok"); return; }
      const abonelik = (await k.pushManager.getSubscription()) ?? (await k.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtarBaytlari(genelAnahtar) }));
      const cevap = await aboneOl(abonelik.toJSON(), cihazEtiketi(navigator.userAgent));
      setSonuc(cevap);
      if (cevap.tamam) setDurum("acik");
    } catch (hata) {
      console.error("[anlik-bildirim] açılamadı:", hata);
      setSonuc({ tamam: false, hata: t("acilamadi") });
    }
  });

  const kapat = () => basla(async () => {
    setSonuc(null);
    try {
      const k = await kayit();
      const abonelik = await k?.pushManager.getSubscription();
      if (abonelik) {
        const cevap = await abonelikKaldir({ endpoint: abonelik.endpoint });
        await abonelik.unsubscribe();
        setSonuc(cevap);
      }
      setDurum("kapali");
    } catch (hata) {
      console.error("[anlik-bildirim] kapatılamadı:", hata);
      setSonuc({ tamam: false, hata: t("acilamadi") });
    }
  });

  const dene = () => basla(async () => { setSonuc(null); setSonuc(await denemeGonder()); });

  return <div className="space-y-3">
    <p className="text-sm" data-durum={durum}>{t(`durum_${durum}`)}</p>
    <div className="flex flex-wrap gap-2">
      {durum === "kapali" ? <Button type="button" className="min-h-11" disabled={bekliyor} onClick={ac}><BellRing />{t("ac")}</Button> : null}
      {durum === "acik" ? <>
        <Button type="button" variant="outline" className="min-h-11" disabled={bekliyor} onClick={dene}><Send />{t("dene")}</Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={bekliyor} onClick={kapat}><BellOff />{t("kapat")}</Button>
      </> : null}
    </div>
    {sonuc ? <p role={sonuc.tamam ? "status" : "alert"} className={sonuc.tamam ? "text-sm font-medium" : "text-destructive text-sm font-medium"}>{sonuc.tamam ? sonuc.mesaj : sonuc.hata}</p> : null}
  </div>;
}

/** Kayıtlı cihaz satırındaki «Kaldır» — yalnız kendi cihazı; sonucu satırda yazar. */
export function CihazKaldir({ id }: { id: string }) {
  const t = useTranslations("AnlikBildirim");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  return <div className="flex flex-col items-end gap-1">
    <Button type="button" variant="outline" className="min-h-11" disabled={bekliyor} onClick={() => basla(async () => {
      const cevap = await abonelikKaldir({ id });
      setHata(cevap.tamam ? null : cevap.hata ?? null);
    })}><BellOff />{t("cihazKaldir")}</Button>
    {hata ? <p role="alert" className="text-destructive text-sm">{hata}</p> : null}
  </div>;
}
