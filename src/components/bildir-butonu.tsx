"use client";

import { useActionState, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { talepOlustur, type TalepSonucu } from "@/app/talepler/eylemler";

/**
 * ============================================================================
 *  "BİLDİR" — ÜST ÇUBUKTA KALICI
 * ----------------------------------------------------------------------------
 *  Mimar sözleşmesi 15.08.2026. Eksikler ve istekler Telegram'dan dağınık
 *  geliyordu: kayıt kalmıyor, durum takip edilemiyordu.
 *
 *  ── HER EKRANDA, İZİNSİZ ────────────────────────────────────────────────
 *  Düğme her sayfada duruyor ve izin istemiyor. Sorunun YAŞANDIĞI anda
 *  bildirilmesi esas; "ayarlara git, talepler'i aç, yeni ekle" zinciri
 *  kurulunca kimse bildirmez ve bildirim yine Telegram'a kaçar.
 *
 *  ── BAĞLAM OTOMATİK AMA GİZLİ DEĞİL ─────────────────────────────────────
 *  Sayfa adresi ve tarayıcı bilgisi kendiliğinden yakalanıyor — kullanıcı
 *  "hangi ekrandaydım" diye yazmak zorunda kalmasın. Ama NE YAKALANDIĞI
 *  formda AÇIKÇA yazıyor (mimar şartı 16.08.2026): sessizce toplanan bilgi,
 *  toplandığını öğrenildiği gün güveni bitirir.
 * ============================================================================
 */

export function BildirButonu() {
  const t = useTranslations("Talep");
  const ortak = useTranslations("Ortak");
  const pathname = usePathname();
  const aramaParametreleri = useSearchParams();

  const [acik, setAcik] = useState(false);
  const [tur, setTur] = useState<"HATA" | "ISTEK">("HATA");
  const [tarayici, setTarayici] = useState("");

  const [durum, formAction, bekliyor] = useActionState<
    TalepSonucu | null,
    FormData
  >(talepOlustur, null);

  /**
   * TARAYICI BİLGİSİ PANEL AÇILIRKEN OKUNUR — efektte DEĞİL.
   *
   * `navigator` sunucu çiziminde yok; ilk hâli `useEffect` ile alınıyordu
   * ama ESLint haklı olarak itiraz etti (`set-state-in-effect`). Açılış bir
   * OLAYDIR; olay işleyicisinde okumak hem kurala uygun hem de fazladan bir
   * çizim turu yaratmıyor. Panel açılmadan bu bilgiye zaten ihtiyaç yok.
   */
  function panelDurumu(yeni: boolean) {
    if (yeni && tarayici === "") setTarayici(navigator.userAgent);
    setAcik(yeni);
  }

  const sorgu = aramaParametreleri.toString();
  const rota = sorgu ? `${pathname}?${sorgu}` : pathname;


  return (
    <Sheet open={acik} onOpenChange={panelDurumu}>
      <SheetTrigger asChild>
        {/* 44px mobil dokunma hedefi (İlke #8); masaüstünde küçülüyor. */}
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0 md:size-8"
          aria-label={t("bildirEtiketi")}
          title={t("bildirEtiketi")}
        >
          <MessageSquarePlus className="size-4" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("bildirBaslik")}</SheetTitle>
          <SheetDescription>{t("bildirAciklama")}</SheetDescription>
        </SheetHeader>

        {/**
         * BAŞARIDA PANEL KENDİLİĞİNDEN KAPANMIYOR — ONAY GÖSTERİYOR.
         *
         * İlk hâli kaydedince paneli kapatıyordu (bir efektle). Kapanan
         * panel "oldu mu?" sorusunu cevapsız bırakır; kullanıcı listeye
         * gidip aramak zorunda kalır. Şimdi talep NUMARASI ekranda yazıyor
         * ve ekran görüntüsü eklemek için doğrudan bağlantı veriliyor —
         * hem İlke #5 (görünür geri bildirim) hem bir tık az.
         */}
        {durum?.tamam ? (
          <div className="space-y-3 px-4 pb-6">
            <p className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumlu}`}>
              {t("kaydedildi", { kod: durum.kod })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-11 md:h-10">
                <Link href="/talepler" onClick={() => setAcik(false)}>
                  {t("taleplereGit")}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 md:h-10"
                onClick={() => setAcik(false)}
              >
                {ortak("kapat")}
              </Button>
            </div>
          </div>
        ) : (
        <form action={formAction} className="space-y-4 px-4 pb-6">
          <input type="hidden" name="tur" value={tur} />
          <input type="hidden" name="rota" value={rota} />
          <input type="hidden" name="tarayici" value={tarayici} />

          {durum && !durum.tamam ? (
            <p
              className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}
            >
              {durum.hata}
            </p>
          ) : null}

          {/* --------------------------- TÜR ---------------------------- */}
          <div className="space-y-2">
            <Label>{t("turEtiketi")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tur === "HATA" ? "default" : "outline"}
                className="h-11 flex-1 md:h-10"
                onClick={() => setTur("HATA")}
              >
                {t("turHATA")}
              </Button>
              <Button
                type="button"
                variant={tur === "ISTEK" ? "default" : "outline"}
                className="h-11 flex-1 md:h-10"
                onClick={() => setTur("ISTEK")}
              >
                {t("turISTEK")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {tur === "HATA" ? t("turHATANotu") : t("turISTEKNotu")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="talep-baslik">{t("baslikEtiketi")} *</Label>
            <Input
              id="talep-baslik"
              name="baslik"
              placeholder={t("baslikIpucu")}
              autoComplete="off"
              className="h-11 md:h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="talep-aciklama">{t("aciklamaEtiketi")} *</Label>
            <Textarea
              id="talep-aciklama"
              name="aciklama"
              rows={5}
              placeholder={t("aciklamaIpucu")}
            />
          </div>

          {/**
           * ── YAKALANAN BAĞLAM: GÖRÜNÜR AMA KATLANMIŞ ──────────────────
           *
           * İlk hâli üç satırlık ham user-agent metnini formun ortasına
           * seriyordu ve kullanıcı haklı olarak "bunu bana niye
           * gösteriyorsun?" dedi (16.08.2026).
           *
           * İKİ ŞART BİRDEN KORUNUYOR: gizli toplama YOK — ne
           * gönderildiği tek satırda yazıyor ve isteyen açıp GÖRÜYOR.
           * Ama varsayılan kapalı: bilgi ulaşılabilir olmalı, dayatılan
           * değil. Kullanıcının işi hata bildirmek, tarayıcı sürümünü
           * okumak değil.
           */}
          <details className="bg-muted/40 rounded-lg border px-3 py-2">
            <summary className="cursor-pointer text-xs">
              {t("baglamOzet")}
            </summary>
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground text-xs break-all">
                {t("baglamSayfa")}: <span className="font-mono">{rota}</span>
              </p>
              <p className="text-muted-foreground text-xs break-all">
                {t("baglamTarayici")}:{" "}
                <span className="font-mono">{tarayici || "—"}</span>
              </p>
              <p className="text-muted-foreground text-xs">{t("baglamNotu")}</p>
            </div>
          </details>

          {/* EKRAN GÖRÜNTÜSÜ KAYITTAN SONRA: ek polimorfik olarak kayda
              bağlanıyor, kayıt yokken bağlanacak kimlik de yok. */}
          <p className="text-muted-foreground text-xs">{t("ekNotu")}</p>

          <div className="flex gap-2">
            <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
              {bekliyor ? ortak("kaydediliyor") : t("gonder")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-10"
              onClick={() => setAcik(false)}
            >
              {ortak("vazgec")}
            </Button>
          </div>
        </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
