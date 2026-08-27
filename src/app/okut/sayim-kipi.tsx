"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, ScanLine, TriangleAlert } from "lucide-react";

import { KameraDugmesi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import {
  BOS_KILIT,
  okumaKarari,
  type OkumaKilidi,
} from "@/lib/sayim/okuma";

import { sayimaOkut, sayimiKapat, type SayimOkumasi } from "./sayim-actions";

/**
 * ============================================================================
 *  SAYIM KİPİ — TAM GÜN, TELEFONDA, TEK ELLE (K57)
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN BİR MASAÜSTÜ EKRANI DEĞİL. Ölçüldü: sayım bir gün sürüyor
 *  (202 varyant · 768 adet · varyantların %65'i tek "DEPO" konumunda —
 *  okutmak hızlı, ÜRÜNÜ BULMAK yavaş). Tasarım kararlarının hepsi buradan:
 *
 *   · SAYAÇ ÇUBUĞU YAPIŞIK (`sticky top-0`) — kaydırmayla kaybolmaz.
 *     Depoda elinde telefonla yürüyen biri "kaç kaldı"yı aramak zorunda
 *     kalmamalı.
 *   · DOKUNMA ALANLARI BÜYÜK — `−`/`+` düğmeleri `size="lg"`, en az 44 px
 *     (Kullanıcı Kolaylığı #8). Yanlış okumayı düzeltmek İKİ dokunuş.
 *   · KAMERA AÇIK KALIR — `surekli` kipi. Her okumada kapansaydı 768 kez
 *     yeniden kurulurdu (10–25 dk sadece kamera açılışı, artı batarya).
 *   · EKRAN UYKUSU ENGELLENİR — `wakeLock`, YALNIZ oturum açıkken.
 *
 *  ⛔ HÜKÜM BU DOSYADA DEĞİL. "Aynı kod iki kez sayılır mı" kararını saf
 *  gövde veriyor (`lib/sayim/okuma.ts`); burası yalnız olayları ona taşıyor.
 *  Kural burada yazılsaydı veritabanısız sınanamazdı.
 * ============================================================================
 */

type Satir = {
  variantId: string;
  sku: string;
  urunAdi: string;
  adet: number;
  kapsamDisi: boolean;
};

export function SayimKipi({
  sayimId,
  kod,
  kapsam,
  sayilanBaslangic,
  bugunHareketVar,
}: {
  sayimId: string;
  kod: string;
  kapsam: number;
  /** Oturuma daha önce girilmiş satır sayısı — araya verilen molalar için. */
  sayilanBaslangic: number;
  bugunHareketVar: boolean;
}) {
  const t = useTranslations("Sayim");
  /**
   * ⛔ KOD → METİN SABİT EŞLEME. anahtar çalışma anında birleştirilseydi (ön ek + kod) DİNAMİK
   * olurdu: `i18n:kontrol` onu göremez, eksik anahtar ancak canlıda ve
   * kullanıcının karşısında patlardı. Aynı desen `stok/duzeltme-actions`ta da
   * bu gerekçeyle sabit.
   */
  const hataMetni = (kod: string) =>
    kod === "ZATEN_ACIK"
      ? t("hataZatenAcik")
      : kod === "SAYIM_KAPALI"
        ? t("hataSayimKapali")
        : kod === "BULUNAMADI"
          ? t("hataBulunamadi")
          : kod === "BOS_KOD"
            ? t("hataBosKod")
            : t("hataSayimYok");
  const ortak = useTranslations("Ortak");
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [sayilanVaryant, setSayilanVaryant] = useState(sayilanBaslangic);
  const [mesaj, setMesaj] = useState<{ hata?: string; bilgi?: string } | null>(null);
  const [bekliyor, basla] = useTransition();

  /**
   * ⛔ KİLİT `useRef`TE — `useState`TE DEĞİL. Kamera döngüsü saniyede dört kez
   * çalışıyor; durum güncellemesi asenkron olduğu için bir sonraki kare eski
   * kilidi görür ve kural sessizce çalışmaz olurdu.
   * _(Anayasa: "bir okuma, okunan değeri doğrudan taşır" — durum EKRANI
   * besler, KARARI değil.)_
   */
  const kilit = useRef<OkumaKilidi>(BOS_KILIT);

  // ── EKRAN UYKUSU ────────────────────────────────────────────────────────
  //  ⛔ YALNIZ OTURUM AÇIKKEN. Bırakılmazsa batarya SESSİZCE biter — ve
  //  kullanıcı bunu sayımdan saatler sonra, telefon ölünce fark eder.
  useEffect(() => {
    let kilitNesnesi: WakeLockSentinel | null = null;
    let iptal = false;

    async function tut() {
      try {
        /** Desteklemeyen tarayıcıda sessizce atlanır — kritik değil. */
        kilitNesnesi = (await navigator.wakeLock?.request("screen")) ?? null;
        if (iptal) void kilitNesnesi?.release();
      } catch {
        /* İzin verilmedi ya da desteklenmiyor; sayım yine çalışır. */
      }
    }
    void tut();

    return () => {
      iptal = true;
      /** ⛔ TEMİZLİKTE BIRAKILIR — oturum kapanınca ekran normale döner. */
      void kilitNesnesi?.release();
      kilitNesnesi = null;
    };
  }, []);

  const satirlariGuncelle = useCallback((s: SayimOkumasi) => {
    if (!s.variantId) return;
    setSatirlar((onceki) => {
      const yeni: Satir = {
        variantId: s.variantId!,
        sku: s.sku ?? "—",
        urunAdi: s.urunAdi ?? "—",
        adet: s.adet ?? 0,
        kapsamDisi: s.kapsamDisi ?? false,
      };
      const kalan = onceki.filter((x) => x.variantId !== s.variantId);
      /** En son dokunulan satır EN ÜSTE — depoda göz onu arıyor. */
      return [yeni, ...kalan];
    });
  }, []);

  /**
   * KAMERADAN GELEN KOD.
   * ⚠ `okumaKarari` çağrılıyor: aynı kod, arada BOŞ KARE geçmeden ikinci kez
   * sayılmaz. Süre eşiği YOK.
   */
  const kameradanOkundu = useCallback(
    (ham: string) => {
      const karar = okumaKarari(kilit.current, ham);
      kilit.current = karar.kilit;
      if (!karar.say) return;
      basla(async () => {
        const sonuc = await sayimaOkut(sayimId, ham);
        if (sonuc.hata) {
          setMesaj({ hata: hataMetni(sonuc.hata) });
          return;
        }
        setMesaj(null);
        if (!satirlar.some((x) => x.variantId === sonuc.variantId)) {
          setSayilanVaryant((n) => n + 1);
        }
        satirlariGuncelle(sonuc);
      });
    },
    [sayimId, t, satirlar, satirlariGuncelle],
  );

  /** Kadraj boş — kilidi açacak olay. Saf gövde hükmü veriyor. */
  const bosKare = useCallback(() => {
    kilit.current = okumaKarari(kilit.current, null).kilit;
  }, []);

  /** `−` / `+` — yanlış okumayı düzeltmek İKİ dokunuş. */
  const duzelt = useCallback(
    (satir: Satir, delta: number) => {
      basla(async () => {
        const sonuc = await sayimaOkut(sayimId, satir.sku, delta);
        if (sonuc.hata) {
          setMesaj({ hata: hataMetni(sonuc.hata) });
          return;
        }
        satirlariGuncelle(sonuc);
      });
    },
    [sayimId, t, satirlariGuncelle],
  );

  const kalan = Math.max(0, kapsam - sayilanVaryant);

  return (
    <div className="space-y-3">
      {/* ═══ YAPIŞIK SAYAÇ ÇUBUĞU — kaydırmayla KAYBOLMAZ ═══ */}
      <div className="bg-background sticky top-0 z-20 -mx-4 border-b px-4 py-3 md:mx-0 md:rounded-lg md:border">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-lg font-semibold tabular-nums">
            {t("sayac", { sayilan: sayilanVaryant, kapsam })}
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {t("kalan", { sayi: kalan })}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{t("kodEtiketi", { kod })}</p>
      </div>

      {/* ═══ AÇILIŞ HATIRLATMASI — KAPANIŞTA DEĞİL, BURADA ═══ */}
      {bugunHareketVar ? (
        <div className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className={`size-4 shrink-0 ${DURUM_YAZISI.uyari}`} aria-hidden />
          <span>{t("bugunHareketUyarisi")}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <KameraDugmesi
          onOkundu={kameradanOkundu}
          onBosKare={bosKare}
          surekli
          baslik={t("kameraBaslik")}
          etiket={t("kameraEtiket")}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-11"
          disabled={bekliyor}
          onClick={() => {
            basla(async () => {
              const sonuc = await sayimiKapat(sayimId);
              if (sonuc.hata) setMesaj({ hata: hataMetni(sonuc.hata) });
            });
          }}
        >
          {t("kapat")}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{t("araVerNotu")}</p>

      {mesaj?.hata ? (
        <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{mesaj.hata}</p>
      ) : null}

      {/* ═══ OKUNANLAR — en son dokunulan en üstte ═══ */}
      {satirlar.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <ScanLine className="size-4" aria-hidden />
          {t("henuzOkunmadi")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {satirlar.map((s) => (
            <li key={s.variantId} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.urunAdi}</p>
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {s.sku}
                  {s.kapsamDisi ? " · " + t("kapsamDisiRozet") : ""}
                </p>
              </div>
              {/* ⚠ DOKUNMA ALANI 44 px — mobil birincil cihaz (İlke #8). */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={bekliyor}
                aria-label={t("azalt", { urun: s.urunAdi })}
                onClick={() => duzelt(s, -1)}
              >
                <Minus className="size-5" />
              </Button>
              <span className="w-10 text-center text-lg font-semibold tabular-nums">
                {s.adet}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={bekliyor}
                aria-label={t("artir", { urun: s.urunAdi })}
                onClick={() => duzelt(s, 1)}
              >
                <Plus className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">{ortak("kayitSayisi", { sayi: satirlar.length })}</p>
    </div>
  );
}
