"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PackageCheck, PauseCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { DURUM_YAZISI } from "@/lib/renkler";
import type { KargolamaDurumu } from "@/lib/iade/kargolama";

import { bildirimKargoKoduYaz } from "./bildirim-actions";

/**
 * ============================================================================
 *  KARGOLANMASI GEREKEN + ASKIDA (K31 ② ve ③)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİSİ DE FİZİKSEL İŞİ GÖRÜNÜR KILAR. Durum rozetinde "İtiraz kabul"
 *  yazması bir SONUÇ gibi okunuyordu; oysa orada elimizde duran bir ürün ve
 *  işleyen bir süre var. Aynı şekilde "Askıda" bir durum değil bir ARIZA:
 *  saat durmuş, sıradaki adım belirsiz.
 *
 *  ⚠ AÇIK SIFIR (13.08.2026 dersi): kutu boşken GİZLENMEZ, "yok" yazar. Bir
 *  şeyin YOKLUĞUNDAN "sorun yok" sonucu çıkarmak imkânsızdır — kullanıcı boş
 *  bir bölümü "ekran bozuk" diye okur.
 *
 *  ⚠ SATIR SAYISI VERİYLE BÜYÜMEZ (İlke #13): buraya yalnız `ITIRAZ_KABUL`
 *  ve `ASKIDA` kayıtları girer; ikisi de akışın DAR uçlarıdır ve birikirse
 *  zaten sorun odur — liste uzuyorsa bakılması gereken şey listenin
 *  kendisidir.
 * ============================================================================
 */
export type KargolanacakSatir = {
  bildirimId: string;
  siparisNo: string | null;
  urun: string;
  kargoKodu: string | null;
  durum: KargolamaDurumu;
};

export type AskidaSatir = {
  bildirimId: string;
  siparisNo: string | null;
  urun: string;
};

export function KargolanacakKutusu({
  satirlar,
  askidakiler,
}: {
  satirlar: KargolanacakSatir[];
  askidakiler: AskidaSatir[];
}) {
  const t = useTranslations("Bildirim2");

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="max-w-3xl rounded-lg border p-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <PackageCheck className="size-4 text-muted-foreground" aria-hidden />
          {t("kargolanacakBaslik")}
          {satirlar.length > 0 ? (
            <span className="text-muted-foreground">({satirlar.length})</span>
          ) : null}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("kargolanacakAciklama")}
        </p>

        {satirlar.length === 0 ? (
          /* AÇIK SIFIR — boşsa gizlenmez, "yok" yazar. */
          <p className="mt-2 text-sm text-muted-foreground">
            {t("kargolanacakYok")}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {satirlar.map((s) => (
              <KargoSatiri key={s.bildirimId} satir={s} />
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-3xl rounded-lg border p-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <PauseCircle className="size-4 text-muted-foreground" aria-hidden />
          {t("askidaBaslik")}
          {askidakiler.length > 0 ? (
            <span className={DURUM_YAZISI.olumsuz}>
              ({askidakiler.length})
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("askidaAciklama")}
        </p>

        {askidakiler.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("askidaYok")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {askidakiler.map((a) => (
              <li key={a.bildirimId} className="flex flex-wrap items-center gap-2">
                {a.siparisNo ? (
                  <KopyalanabilirKod
                    deger={a.siparisNo}
                    etiket={t("kargoKodu")}
                  />
                ) : null}
                <span>{a.urun}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KargoSatiri({ satir }: { satir: KargolanacakSatir }) {
  const t = useTranslations("Bildirim2");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [kod, setKod] = useState(satir.kargoKodu ?? "");
  const [hata, setHata] = useState<string | null>(null);

  const yaz = () => {
    setHata(null);
    basla(async () => {
      const sonuc = await bildirimKargoKoduYaz(satir.bildirimId, kod);
      if (sonuc.hata) setHata(sonuc.hata);
      else router.refresh();
    });
  };

  return (
    <li className="space-y-1 rounded-md border p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {satir.siparisNo ? (
          <KopyalanabilirKod deger={satir.siparisNo} etiket={t("kargoKodu")} />
        ) : null}
        <span>{satir.urun}</span>
        {/*
          ⚠ İKİ HÂL AYRI YAZILIR AMA İKİSİ DE NÖTR. "Gönderime hazır" bir
          gecikme değil bir SIRADAKİ ADIM: pazaryeri kodu henüz atamamış da
          olabilir. Kırmızı göstermek, bizim yapmadığımız bir işi suçlamak
          olurdu.
        */}
        <span className="text-muted-foreground">
          {satir.durum === "KARGODA" ? t("kargoda") : t("gonderimeHazir")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`kk-${satir.bildirimId}`}>
          {t("kargoKodu")}
        </label>
        <Input
          id={`kk-${satir.bildirimId}`}
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          placeholder={t("kargoKoduIpucu")}
          className="h-11 max-w-52 md:h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-11 md:h-8"
          disabled={bekliyor}
          onClick={yaz}
        >
          {t("kargoKoduYaz")}
        </Button>
      </div>

      {hata ? <p className={DURUM_YAZISI.olumsuz}>{hata}</p> : null}
    </li>
  );
}
