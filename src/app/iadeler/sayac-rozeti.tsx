"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI, type DurumRengi } from "@/lib/renkler";
import type { SayacBoslugu, SayacSonucu, SayacTuru } from "@/lib/iade/sayac";

import { bildirimCipasiYaz, bildirimSonTarihiYaz } from "./bildirim-actions";

/**
 * ============================================================================
 *  İADE SAYACI — SON TARİH VE KALAN SÜRE (K31 ①)
 * ----------------------------------------------------------------------------
 *  ⚠ SAYAÇ TEK BAŞINA ANLAM TAŞIMAZ: "3 gün kaldı" cümlesi, süre dolunca NE
 *  OLACAĞI yazılmadan bir uyarı değildir. Her sayaç sonucunu da söyler —
 *  "dolarsa OTOMATİK ONAYLANIR" (para kaybı) ile "dolarsa iade iptal olur"
 *  (lehimize) bambaşka iki şeydir ve kullanıcı ikisine aynı tepkiyi veremez.
 *
 *  ⚠ TÜRETİLMİŞ TARİH NÖTR GÖSTERİLİR (mimar şartı ②). Ekranda duran tarih
 *  bir OLGU değil bir HESAPTIR; pazaryeri paneli başka bir tarih diyorsa
 *  KAZANAN PANELDİR ve kullanıcı onu buradan yazabilir.
 *
 *  ⚠ BOŞ SAYAÇ SEBEBİNİ SÖYLER. "Tarih yok" iki apayrı şey olabilir: süre
 *  hiç ÖLÇÜLMEDİ (geri gönderim) ya da ÇIPA GİRİLMEDİ (kargoya veriliş
 *  tarihi bizde doğmuyor). İkisi tek kefeye konsaydı, ölçülmemiş bir kuralla
 *  eksik bir veri aynı görünür ve ikisi de düzeltilmezdi.
 * ============================================================================
 */
export type SayacGorunumu = {
  bildirimId: string;
  tur: SayacTuru;
  sonuc: SayacSonucu;
  /** ISO tarih; `null` ise `bosluk` sebebini söyler. */
  sonTarih: string | null;
  kalanGun: number | null;
  bosluk: SayacBoslugu | null;
  renk: DurumRengi;
  /** Son tarihin yaşadığı sütun. `null` = hesaplanır, elle yazılamaz. */
  sutun: "otomatikOnayTarihi" | "islemSonTarihi" | null;
  /** Çıpa elle mi giriliyor — kargoya veriliş gibi bizde doğmayan anlar. */
  cipaElle: boolean;
};

export function SayacRozeti({ sayac }: { sayac: SayacGorunumu }) {
  const t = useTranslations("Bildirim2");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);
  const [cipa, setCipa] = useState("");
  const [panel, setPanel] = useState("");

  const calistir = (is: () => Promise<{ hata?: string }>) => {
    setHata(null);
    basla(async () => {
      const sonuc = await is();
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setAcik(false);
        setCipa("");
        setPanel("");
        router.refresh();
      }
    });
  };

  const sure = () => {
    if (sayac.kalanGun === null) return null;
    if (sayac.kalanGun === 0) return t("bugunDoluyor");
    if (sayac.kalanGun < 0) return t("gecti", { gun: Math.abs(sayac.kalanGun) });
    return t("kalanGun", { gun: sayac.kalanGun });
  };

  return (
    <div className="mt-1 flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">{t(`sayac${sayac.tur}`)}</span>

        {sayac.sonTarih ? (
          <>
            <span className={sayac.renk === "olumsuz" ? DURUM_YAZISI.olumsuz : ""}>
              {bicim.tarih(new Date(sayac.sonTarih))} · {sure()}
            </span>
            <span className="text-muted-foreground">
              {t(`sonuc${sayac.sonuc}`)}
            </span>
          </>
        ) : (
          /*
            ⚠ BOŞLUK SEBEBİYLE YAZILIR VE NÖTR DURUR. Kırmızı olsaydı
            "ölçülmemiş bir kural" ile "dolmak üzere olan bir süre" aynı
            aciliyette görünürdü; ikincisi para kaybı, birincisi bir soru.
          */
          <span className="text-muted-foreground">
            {t(`bos${sayac.bosluk ?? "OLCULMEDI"}`)}
          </span>
        )}

        {/* Tarih ELLE yazılabilen sayaçlarda giriş açılır. */}
        {sayac.sutun ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 px-2 md:h-6"
            onClick={() => setAcik((o) => !o)}
          >
            {sayac.sonTarih ? t("panelTarihi") : t("cipaGir")}
          </Button>
        ) : null}
      </div>

      {sayac.sonTarih && sayac.sutun ? (
        <p className="text-muted-foreground">{t("turetilmisNot")}</p>
      ) : null}

      {acik && sayac.sutun ? (
        <div className="flex flex-col gap-2 rounded-md border p-2">
          {sayac.cipaElle ? (
            <label className="flex flex-col gap-1">
              <span className="font-medium">{t("cipaGir")}</span>
              <span className="text-muted-foreground">{t("cipaGirAciklama")}</span>
              <span className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={cipa}
                  onChange={(e) => setCipa(e.target.value)}
                  className="h-11 max-w-44 md:h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={bekliyor || cipa === ""}
                  onClick={() =>
                    calistir(() => bildirimCipasiYaz(sayac.bildirimId, cipa))
                  }
                >
                  {t("panelTarihiKaydet")}
                </Button>
              </span>
            </label>
          ) : null}

          {/*
            PAZARYERİ BEYANI — bizim hesabımızı EZER. Kaynak önceliği:
            kanalın kendi belgesi, bizim türetmemizin üstündedir.
          */}
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t("panelTarihi")}</span>
            <span className="text-muted-foreground">
              {t("panelTarihiAciklama")}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={panel}
                onChange={(e) => setPanel(e.target.value)}
                className="h-11 max-w-44 md:h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={bekliyor}
                onClick={() =>
                  calistir(() =>
                    bildirimSonTarihiYaz(sayac.bildirimId, sayac.sutun!, panel),
                  )
                }
              >
                {t("panelTarihiKaydet")}
              </Button>
            </span>
          </label>
        </div>
      ) : null}

      {hata ? <p className={DURUM_YAZISI.olumsuz}>{hata}</p> : null}
    </div>
  );
}
