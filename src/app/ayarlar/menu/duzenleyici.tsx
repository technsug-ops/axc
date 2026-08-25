"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, RotateCcw, Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
import { DURUM_KUTUSU } from "@/lib/renkler";

import {
  menuDuzeniniKaydet,
  menuDuzeniniSifirla,
  type MenuDurumu,
} from "./eylemler";

/**
 * ============================================================================
 *  MENÜ DÜZENİ DÜZENLEYİCİSİ (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ SÜRÜKLE-BIRAK YOK — BİLEREK. Telefonda sürükle-bırak hem kütüphane
 *  ister hem de 44 px dokunma hedefiyle çakışır: parmakla tutup kaydırmak
 *  sayfayı da kaydırır. Ok düğmeleri her cihazda aynı çalışır (İlke #8,
 *  #10) ve tek tıkla tek adım — geri alması da bir tık.
 *
 *  ⚠ GRUP SEÇİCİ AYRI: "yukarı/aşağı" sırayı, açılır liste YERİ değiştirir.
 *  İkisini tek etkileşime sıkıştırmak (sürükleyip başka kutuya bırakmak)
 *  telefonda en zor hareket olurdu.
 *
 *  ⚠ KAYDEDİLMEDEN HİÇBİR ŞEY DEĞİŞMEZ. Her ok tıklamasında sunucuya
 *  yazsaydık, deneyerek sıralamak isteyen kullanıcı yarım kalmış bir menüyle
 *  kalırdı. Değişiklik bekliyorsa ekran bunu SÖYLÜYOR.
 * ============================================================================
 */

export type Kalem = { anahtar: string; etiket: string };
export type GrupBilgisi = { anahtar: string; etiket: string };

export type BaslangicDuzeni = {
  gunluk: string[];
  gruplar: { anahtar: string; ogeler: string[] }[];
};

/** Günlük listenin yer tutucusu — grup seçicide "grupsuz" karşılığı. */
const GUNLUK = "__gunluk__";

export function MenuDuzenleyici({
  etiketler,
  gruplar,
  baslangic,
  dusurulemez,
}: {
  /** anahtar → ekranda görünen ad. Sözlükten SUNUCUDA çözüldü. */
  etiketler: Record<string, string>;
  gruplar: GrupBilgisi[];
  baslangic: BaslangicDuzeni;
  /** Menüden düşürülemeyecek anahtarlar — rozetle gösterilir. */
  dusurulemez: string[];
}) {
  const t = useTranslations("MenuDuzeni");
  const ortak = useTranslations("Ortak");

  const [durum, kaydet, bekliyor] = useActionState<MenuDurumu, FormData>(
    menuDuzeniniKaydet,
    {},
  );
  const [sifirlaDurumu, sifirla, sifirlaniyor] = useActionState<
    MenuDurumu,
    FormData
  >(menuDuzeniniSifirla, {});

  const [onayAcik, setOnayAcik] = useState(false);
  const [duzen, setDuzen] = useState<BaslangicDuzeni>(baslangic);
  const [degisti, setDegisti] = useState(false);

  /** Sıfırlama başarılıysa diyalog kapanır; menü zaten tazelenmiş olur. */
  const [sonSifirla, setSonSifirla] = useState(sifirlaDurumu);
  if (sonSifirla !== sifirlaDurumu) {
    setSonSifirla(sifirlaDurumu);
    if (sifirlaDurumu.basari) setOnayAcik(false);
  }

  /**
   * ⚠ KAYIT BAŞARILIYSA "DEĞİŞİKLİK VAR" İŞARETİ DÜŞER. Düşmeseydi ekran
   * kaydettikten sonra da "kaydedilmemiş değişiklik" derdi ve kullanıcı
   * kaydın gitmediğini sanardı — sessiz başarısızlığın tersi: sessiz
   * başarı.
   */
  const [sonKayit, setSonKayit] = useState(durum);
  if (sonKayit !== durum) {
    setSonKayit(durum);
    if (durum.basari) setDegisti(false);
  }

  /** Bir anahtarın şu anki yeri: `GUNLUK` ya da grup anahtarı. */
  function yeri(anahtar: string): string {
    if (duzen.gunluk.includes(anahtar)) return GUNLUK;
    const g = duzen.gruplar.find((x) => x.ogeler.includes(anahtar));
    return g?.anahtar ?? GUNLUK;
  }

  /** Listeyi tek adım kaydır. Uçtaysa hiçbir şey yapmaz. */
  function kaydir(liste: string[], anahtar: string, yon: -1 | 1): string[] {
    const i = liste.indexOf(anahtar);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= liste.length) return liste;
    const yeni = [...liste];
    [yeni[i], yeni[j]] = [yeni[j]!, yeni[i]!];
    return yeni;
  }

  function tasi(anahtar: string, yon: -1 | 1) {
    setDegisti(true);
    setDuzen((o) => {
      if (o.gunluk.includes(anahtar)) {
        return { ...o, gunluk: kaydir(o.gunluk, anahtar, yon) };
      }
      return {
        ...o,
        gruplar: o.gruplar.map((g) =>
          g.ogeler.includes(anahtar)
            ? { ...g, ogeler: kaydir(g.ogeler, anahtar, yon) }
            : g,
        ),
      };
    });
  }

  /**
   * YER DEĞİŞTİR — hedefin SONUNA eklenir.
   *
   * ⚠ ARAYA SOKULMAZ: kullanıcı nereye koyacağını ok düğmeleriyle
   * söyleyecek. Tahmin edip araya sokmak, iki karar birden vermek olurdu.
   */
  function yereTasi(anahtar: string, hedef: string) {
    setDegisti(true);
    setDuzen((o) => {
      const gunluk = o.gunluk.filter((a) => a !== anahtar);
      const gruplar = o.gruplar.map((g) => ({
        ...g,
        ogeler: g.ogeler.filter((a) => a !== anahtar),
      }));
      if (hedef === GUNLUK) return { gunluk: [...gunluk, anahtar], gruplar };
      return {
        gunluk,
        gruplar: gruplar.map((g) =>
          g.anahtar === hedef ? { ...g, ogeler: [...g.ogeler, anahtar] } : g,
        ),
      };
    });
  }

  function satir(anahtar: string, liste: string[]) {
    const i = liste.indexOf(anahtar);
    const kilitli = dusurulemez.includes(anahtar);
    return (
      <li
        key={anahtar}
        className="flex flex-wrap items-center gap-2 rounded-md border p-2"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {etiketler[anahtar] ?? anahtar}
          {kilitli ? (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {t("kilitli")}
            </span>
          ) : null}
        </span>

        {/* ⚠ 44 px DOKUNMA HEDEFİ (İlke #8) — `icon-sm` mobilde tek başına
            kullanılmaz; bu yüzden `size-11` ve masaüstünde küçülüyor. */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 p-0 md:size-8"
            onClick={() => tasi(anahtar, -1)}
            disabled={i <= 0}
            aria-label={t("yukariTasi", { ad: etiketler[anahtar] ?? anahtar })}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 p-0 md:size-8"
            onClick={() => tasi(anahtar, 1)}
            disabled={i < 0 || i >= liste.length - 1}
            aria-label={t("asagiTasi", { ad: etiketler[anahtar] ?? anahtar })}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>

        <select
          value={yeri(anahtar)}
          onChange={(e) => yereTasi(anahtar, e.target.value)}
          aria-label={t("yerSec", { ad: etiketler[anahtar] ?? anahtar })}
          className="border-input bg-background h-11 rounded-md border px-2 text-sm md:h-8"
        >
          <option value={GUNLUK}>{t("gunlukListe")}</option>
          {gruplar.map((g) => (
            <option key={g.anahtar} value={g.anahtar}>
              {g.etiket}
            </option>
          ))}
        </select>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={formGonderimi(kaydet)} className="space-y-5">
        <input type="hidden" name="duzen" value={JSON.stringify(duzen)} />

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t("gunlukListe")}</h2>
          <p className="text-muted-foreground text-xs">{t("gunlukNotu")}</p>
          {/*
            ⚠ AÇIK SIFIR: liste boşalırsa satır gizlenmez, ne olduğu yazar.
            Kullanıcı her şeyi gruplara taşıyabilir ve bu MEŞRUDUR — menü
            yine çalışır, yalnız hep açık liste boş kalır.
          */}
          {duzen.gunluk.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("gunlukBos")}</p>
          ) : (
            <ul className="space-y-2">
              {duzen.gunluk.map((a) => satir(a, duzen.gunluk))}
            </ul>
          )}
        </section>

        {duzen.gruplar.map((g) => (
          <section key={g.anahtar} className="space-y-2">
            <h2 className="text-sm font-semibold">
              {gruplar.find((x) => x.anahtar === g.anahtar)?.etiket ?? g.anahtar}
            </h2>
            {g.ogeler.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("grupBos")}</p>
            ) : (
              <ul className="space-y-2">
                {g.ogeler.map((a) => satir(a, g.ogeler))}
              </ul>
            )}
          </section>
        ))}

        <HataOzeti hatalar={durum.hatalar} />
        {durum.basari ? (
          <p
            className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
            role="status"
          >
            {durum.basari}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={bekliyor || !degisti}>
            <Save />
            {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
          </Button>
          {/*
            ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): niye basılamadığı
            yazılı. "Değişiklik yok" bir hata değil, bir durumdur.
          */}
          {!degisti ? (
            <span className="text-muted-foreground text-xs">
              {t("degisiklikYok")}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              {t("kaydedilmemis")}
            </span>
          )}
        </div>
      </form>

      {/*
        ⚠ AYRI FORM: sıfırlama, kaydetmeyi tetiklememeli.
        ⚠ YIKICI EYLEM = ONAY (İlke #6): kullanıcının dizdiği sıra tek tıkla
        gitmez, Türkçe onay diyaloğu sorar.
      */}
      <div className="border-t pt-4">
        <p className="text-muted-foreground mb-2 text-xs">{t("sifirlaNotu")}</p>
        <AlertDialog open={onayAcik} onOpenChange={setOnayAcik}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline">
              <RotateCcw />
              {t("sifirla")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("sifirlaOnayBaslik")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("sifirlaOnayMetni")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={sifirlaniyor}
                onClick={() =>
                  startTransition(() => sifirla(new FormData()))
                }
              >
                {sifirlaniyor ? ortak("kaydediliyor") : t("sifirla")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <HataOzeti hatalar={sifirlaDurumu.hatalar} />
        {sifirlaDurumu.basari ? (
          <p
            className={`mt-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
            role="status"
          >
            {sifirlaDurumu.basari}
          </p>
        ) : null}
      </div>
    </div>
  );
}
