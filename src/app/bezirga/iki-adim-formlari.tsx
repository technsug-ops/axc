"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { araAdimIptal, ikiAdimDogrulaEylemi, ikiAdimKurulumEylemi, type IkiAdimDurumuSonucu } from "./actions";

function Vazgec() {
  const t = useTranslations("Yonetim");
  return (
    <form action={araAdimIptal}>
      <Button type="submit" variant="ghost" className="min-h-11 w-full">{t("ikiAdimVazgec")}</Button>
    </form>
  );
}

/** Kod adımı — 6 haneli uygulama kodu YA DA yedek kod (tek kutu). */
export function IkiAdimKodFormu({ eposta }: { eposta: string }) {
  const t = useTranslations("Yonetim");
  const [durum, eylem, bekliyor] = useActionState<IkiAdimDurumuSonucu, FormData>(ikiAdimDogrulaEylemi, {});
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5" />{t("ikiAdimKodBaslik")}</p>
        <p className="text-muted-foreground text-sm">{t("ikiAdimKodAciklama", { eposta })}</p>
      </div>
      <form action={eylem} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="iki-adim-kod">{t("ikiAdimKodEtiketi")}</Label>
          <Input id="iki-adim-kod" name="kod" autoComplete="one-time-code" inputMode="text" autoFocus required placeholder={t("ikiAdimKodIpucu")} className="min-h-11 text-center text-lg tracking-widest" />
          <p className="text-muted-foreground text-xs">{t("ikiAdimYedekNotu")}</p>
        </div>
        <HataOzeti hatalar={durum.hatalar} baslik={t("ikiAdimOlmadi")} />
        <Button type="submit" className="min-h-11 w-full" disabled={bekliyor}>{t("ikiAdimDogrula")}</Button>
      </form>
      <Vazgec />
    </div>
  );
}

/**
 * İlk kurulum — QR + elle yazılacak anahtar + ilk kod. Kod doğrulanınca yedek
 * kodlar BİR KEZ gösterilir; «Devam» yalnız bağlantıdır (oturum eylemde açıldı).
 */
export function IkiAdimKurulumFormu({ qr, anahtar, devamAdresi }: { qr: string; anahtar: string; devamAdresi: string }) {
  const t = useTranslations("Yonetim");
  const [durum, eylem, bekliyor] = useActionState<IkiAdimDurumuSonucu, FormData>(ikiAdimKurulumEylemi, {});
  const [kaydettim, setKaydettim] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

  if (durum.yedekKodlar) {
    const metin = durum.yedekKodlar.join("\n");
    return (
      <div className="space-y-4">
        <p className={`flex items-start gap-2 rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {t("ikiAdimAcildi")}
        </p>
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-5" />{t("yedekKodBaslik")}</p>
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("yedekKodUyari")}</p>
          <ul className="bg-muted grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg p-3 font-mono text-sm">
            {durum.yedekKodlar.map((k) => <li key={k}>{k}</li>)}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => {
              void navigator.clipboard?.writeText(metin).then(() => setKopyalandi(true));
            }}
          >
            <Copy />
            {kopyalandi ? t("yedekKopyalandi") : t("yedekKopyala")}
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5" checked={kaydettim} onChange={(e) => setKaydettim(e.target.checked)} />
          {t("yedekKaydettim")}
        </label>
        {kaydettim ? (
          <Button asChild className="min-h-11 w-full"><Link href={devamAdresi}>{t("ikiAdimDevam")}</Link></Button>
        ) : (
          <Button className="min-h-11 w-full" disabled>{t("ikiAdimDevam")}</Button>
        )}
        {!kaydettim ? <p className="text-muted-foreground text-xs">{t("yedekOnayGerekli")}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5" />{t("ikiAdimKurulumBaslik")}</p>
        <p className="text-muted-foreground text-sm">{t("ikiAdimKurulumAciklama")}</p>
      </div>
      <ol className="list-decimal space-y-3 pl-5 text-sm">
        <li>{t("ikiAdimKurulumAdim1")}</li>
        <li className="space-y-2">
          <span>{t("ikiAdimKurulumAdim2")}</span>
          {/* QR sunucuda üretildi (data URL); dış istek yok. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t("ikiAdimQrAlt")} width={200} height={200} className="mx-auto rounded-lg bg-white p-2" />
          <span className="block">{t("ikiAdimElleAnahtar")}</span>
          <KopyalanabilirKod deger={anahtar} etiket={t("ikiAdimAnahtarEtiketi")} />
        </li>
        <li>{t("ikiAdimKurulumAdim3")}</li>
      </ol>
      <form action={eylem} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="iki-adim-ilk-kod">{t("ikiAdimKodEtiketi")}</Label>
          <Input id="iki-adim-ilk-kod" name="kod" autoComplete="one-time-code" inputMode="numeric" required placeholder={t("ikiAdimIlkKodIpucu")} className="min-h-11 text-center text-lg tracking-widest" />
        </div>
        <HataOzeti hatalar={durum.hatalar} baslik={t("ikiAdimOlmadi")} />
        <Button type="submit" className="min-h-11 w-full" disabled={bekliyor}>{t("ikiAdimKurulumuTamamla")}</Button>
      </form>
      <Vazgec />
    </div>
  );
}
