"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";

import { gorselElleKaydet, gorselKirikBildir } from "@/app/gorsel-eylemleri";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";
import {
  buyukGorselAdresi,
  elleGorselDenetle,
  kucukGorselAdresi,
  onizlemeKonumu,
  ONIZLEME_BOYU,
  type GorselKaynagi,
} from "@/lib/urun-gorseli";

/**
 * ============================================================================
 *  ÜRÜN KÜÇÜK RESMİ (K273) — listelerde adın solunda
 * ----------------------------------------------------------------------------
 *  · Adres KÜÇÜK sürüm (`kucukGorselAdresi` — Trendyol 749 KB → 7,5 KB).
 *  · KUTUYU DOLDURUR (`object-cover`, kullanıcı 25.09: _«resimler kutucuğun
 *    içine dolmalı»_). Pazaryeri görselleri dikey (2:3); `object-contain` kare
 *    kutuda iki yanda boşluk bırakıp ürünü küçültüyordu.
 *  · ÜSTÜNE GELİNCE BÜYÜR (K273-②, kullanıcı 25.09): önizlemede ürün TAM görünür
 *    (`object-contain` — orada kırpma bilgi kaybettirir). Büyük adres YALNIZ
 *    önizleme açıkken istenir: liste açılışı ek yük taşımaz.
 *  · TELEFONDA fare yok → DOKUNUNCA açılır, ikinci dokunuş / başka yere dokunma /
 *    kaydırma kapatır. ⚠ Dokunma tarayıcıda hem "üstüne gelme" hem "tıklama"
 *    üretir; ikisi aynı anda işlenseydi önizleme açılıp hemen kapanırdı. Bu
 *    yüzden fare olayları yalnız `pointerType === "mouse"` iken, tıklama yalnız
 *    fare DEĞİLKEN işlenir.
 *  · Görsel yoksa ya da açılmazsa: adın BAŞ HARFİ ile gri kutu — kırık resim
 *    ikonu çizilmez. Açılmazsa sunucuya bildirilir (sunucu kendisi doğrular),
 *    bir sonraki senkron sırayı baştan işletir.
 *  · Süsleme: ad hemen yanında yazıyor → `alt=""` + `aria-hidden` (ekran
 *    okuyucu adı iki kez okumasın).
 *  · RESİM EKLE (K273-③, kullanıcı 25.09): resmi olmayan (ya da açılmayan)
 *    kutunun SAĞ ALT köşesinde küçük "+" rozeti; kutunun TAMAMI düğmedir
 *    (İlke #8 — rozet tek başına dokunma hedefi olamayacak kadar küçük).
 *    Yalnız `ekleyebilir` (ürün düzenleme izni) iken çizilir. Resim eklenince
 *    kutu resme döner, rozet kendiliğinden gider.
 * ============================================================================
 */
export function UrunGorseli({
  variantId,
  url,
  kaynak,
  ad,
  boyut = 40,
  ekleyebilir = false,
}: {
  variantId: string | null;
  url: string | null;
  kaynak: GorselKaynagi | null;
  ad: string;
  boyut?: number;
  /** Ürün düzenleme izni (`urun.yaz`) — sayfa sunucuda hesaplar. */
  ekleyebilir?: boolean;
}) {
  const [kirik, setKirik] = useState(false);
  const [onizleme, setOnizleme] = useState<{ left: number; top: number } | null>(null);
  const kap = useRef<HTMLSpanElement>(null);
  const dokunma = useRef(false);

  /* Dokunarak açılan önizleme: başka yere dokunma ya da kaydırma kapatır. */
  useEffect(() => {
    if (!onizleme) return;
    const kapat = () => setOnizleme(null);
    const disari = (e: PointerEvent) => {
      if (!kap.current?.contains(e.target as Node)) kapat();
    };
    window.addEventListener("scroll", kapat, true);
    document.addEventListener("pointerdown", disari);
    return () => {
      window.removeEventListener("scroll", kapat, true);
      document.removeEventListener("pointerdown", disari);
    };
  }, [onizleme]);

  const stil = { width: boyut, height: boyut };
  if (!url || !kaynak || kirik) {
    if (ekleyebilir && variantId) {
      return <ResimEkle variantId={variantId} ad={ad} boyut={boyut} />;
    }
    return (
      <span
        aria-hidden
        style={stil}
        className="bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-md border text-xs font-semibold uppercase"
      >
        {ad.trim().charAt(0) || "·"}
      </span>
    );
  }
  const ac = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOnizleme(onizlemeKonumu(r, { genislik: window.innerWidth, yukseklik: window.innerHeight }));
  };
  return (
    <span
      ref={kap}
      aria-hidden
      className="shrink-0"
      onPointerDown={(e) => {
        dokunma.current = e.pointerType !== "mouse";
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") ac(e.currentTarget);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOnizleme(null);
      }}
      onClick={(e) => {
        if (!dokunma.current) return;
        if (onizleme) setOnizleme(null);
        else ac(e.currentTarget);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pazaryeri CDN'i zaten küçük sürüm veriyor; Next görsel iyileştirmesi kota harcardı */}
      <img
        src={kucukGorselAdresi(url, kaynak)}
        alt=""
        width={boyut}
        height={boyut}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={stil}
        className="bg-muted block cursor-zoom-in rounded-md border object-cover"
        onError={() => {
          setKirik(true);
          setOnizleme(null);
          if (variantId) void gorselKirikBildir(variantId);
        }}
      />
      {onizleme ? (
        /* eslint-disable-next-line @next/next/no-img-element -- önizleme de CDN küçültmesinden */
        <img
          src={buyukGorselAdresi(url, kaynak)}
          alt=""
          width={ONIZLEME_BOYU}
          height={ONIZLEME_BOYU}
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ left: onizleme.left, top: onizleme.top, width: ONIZLEME_BOYU, height: ONIZLEME_BOYU }}
          className="pointer-events-none fixed z-50 rounded-lg border bg-white object-contain p-2 shadow-xl"
        />
      ) : null}
    </span>
  );
}

/** Resimsiz kutu + sağ alt "+" rozeti + link yapıştırma diyaloğu (K273-③). */
function ResimEkle({ variantId, ad, boyut }: { variantId: string; ad: string; boyut: number }) {
  const t = useTranslations("UrunGorseli");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [link, setLink] = useState("");
  const [onizleme, setOnizleme] = useState<"YUKLENIYOR" | "ACILDI" | "ACILMADI">("YUKLENIYOR");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const denetim = elleGorselDenetle(link);
  const gecerli = "url" in denetim ? denetim.url : null;
  /* Biçim hatası yalnız bir şey yazılmışken söylenir; boş alan hata değil. */
  const bicimHatasi = link.trim() !== "" && "hata" in denetim ? t(`hata.${denetim.hata}`) : null;

  const kaydet = () => {
    if (!gecerli || onizleme !== "ACILDI") return;
    setHata(null);
    basla(async () => {
      const sonuc = await gorselElleKaydet(variantId, gecerli);
      if ("hata" in sonuc) {
        setHata(t(`hata.${sonuc.hata}`));
        return;
      }
      setAcik(false);
      setLink("");
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label={t("resimEkleEtiket", { ad })}
        title={t("resimEkle")}
        style={{ width: boyut, height: boyut }}
        className="bg-muted text-muted-foreground hover:border-primary focus-visible:ring-ring relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed text-xs font-semibold uppercase focus-visible:ring-2 focus-visible:outline-none"
      >
        <span aria-hidden>{ad.trim().charAt(0) || "·"}</span>
        <span
          aria-hidden
          className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full shadow"
        >
          <ImagePlus className="size-2.5" />
        </span>
      </button>
      <Dialog
        open={acik}
        onOpenChange={(a) => {
          setAcik(a);
          if (!a) setHata(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("baslik")}</DialogTitle>
            <DialogDescription>{t("aciklama")}</DialogDescription>
          </DialogHeader>
          <p className="truncate text-sm font-medium" title={ad}>
            {ad}
          </p>
          <div className="space-y-1">
            <Label htmlFor={`resim-link-${variantId}`}>{t("linkEtiketi")}</Label>
            <Input
              id={`resim-link-${variantId}`}
              value={link}
              inputMode="url"
              autoComplete="off"
              placeholder={t("linkIpucu")}
              onChange={(e) => {
                setLink(e.target.value);
                setOnizleme("YUKLENIYOR");
                setHata(null);
              }}
              className="h-11 md:h-10"
            />
            {bicimHatasi ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{bicimHatasi}</p> : null}
          </div>
          <div className="bg-muted/40 flex h-48 items-center justify-center rounded-lg border">
            {gecerli ? (
              /* eslint-disable-next-line @next/next/no-img-element -- kullanıcının linki; önizleme tarayıcıda */
              <img
                key={gecerli}
                src={gecerli}
                alt=""
                referrerPolicy="no-referrer"
                onLoad={() => setOnizleme("ACILDI")}
                onError={() => setOnizleme("ACILMADI")}
                className={onizleme === "ACILDI" ? "max-h-44 max-w-full object-contain" : "hidden"}
              />
            ) : null}
            {!gecerli ? (
              <span className="text-muted-foreground px-4 text-center text-xs">{t("onizlemeBos")}</span>
            ) : onizleme === "ACILMADI" ? (
              <span className={`px-4 text-center text-xs ${DURUM_YAZISI.olumsuz}`}>{t("onizlemeAcilmadi")}</span>
            ) : onizleme === "YUKLENIYOR" ? (
              <span className="text-muted-foreground px-4 text-center text-xs">{t("onizlemeYukleniyor")}</span>
            ) : null}
          </div>
          {/* ⚠ SESSİZ BAŞARISIZLIK YASAK (İlke #5): düğme kilitliyse NEDENİ yazar. */}
          {gecerli && onizleme !== "ACILDI" ? (
            <p className="text-muted-foreground text-xs">{t("onizlemeBekleniyor")}</p>
          ) : null}
          {hata ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => setAcik(false)}>
              {ortak("vazgec")}
            </Button>
            <Button
              type="button"
              className="h-11 md:h-10"
              disabled={!gecerli || onizleme !== "ACILDI" || bekliyor}
              onClick={kaydet}
            >
              {bekliyor ? t("kaydediliyor") : t("kaydet")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
