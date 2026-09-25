import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { ALT_OGELER, MENU_IKONLARI, ONE_CIKAN_ISLEM } from "@/lib/menu/ikonlar";
import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import { menuDuzeni } from "@/lib/menu/okuma";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import { sayfaGirisi } from "@/lib/yetki";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("menu") };
}

/**
 * ============================================================================
 *  MENÜ — TELEFON (K270, kullanıcı 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Alt bardaki «Menü» sekmesinin sayfası: gruplu ikon ızgarası (Trendyol
 *  «Menü ekranı» kalıbı — «tüm ekranlara tek tıkla»). Masaüstünde de açılır;
 *  orada sol menü zaten var, sayfa yalnız bir yedek.
 *  ⛔ TEK GÖVDE: sıra ve gruplar sol menüyle AYNI kaynaktan — `menuDuzeni`
 *  (firma kaydı + katalog), adresler `MENU_ADRESLERI`, ikonlar
 *  `MENU_IKONLARI`, etiketler `Menu.*`. Burada elle liste tutulmaz; kullanıcı
 *  `/ayarlar/menu`den sırayı değiştirince ikisi birlikte değişir.
 *  ⚠ ROZET = BEKLEYEN İŞ: paketle · mal kabul · iadeler · kanal SKU sayıları
 *  panelin görev sayacından (`gorevSayilariniTopla`, aynı gövde). Sıfırda
 *  rozet çizilmez — «0» bir iş değildir.
 *  ⚠ İZİN: sol menü gibi bütün öğeler listelenir; kapı sayfanın kendisinde
 *  (`sayfaIzni` → 404). Menüde eleme yapmak «orada bir şey var» sızıntısını
 *  önlemez, iki yerde iki ölçüt doğururdu.
 * ============================================================================
 */
const ROZET_KAYNAGI: Record<string, "kargoBekleyen" | "malKabulBekleyen" | "iadeBildirimi" | "oransizKanalSku"> = {
  paketle: "kargoBekleyen",
  malKabul: "malKabulBekleyen",
  iadeler: "iadeBildirimi",
  kanalSkulari: "oransizKanalSku",
};

export default async function MenuSayfasi() {
  const baglam = await sayfaGirisi();
  const [duzen, sayilar, t, tMenu] = await Promise.all([
    menuDuzeni(baglam.companyId),
    gorevSayilariniTopla(),
    getTranslations("MobilMenu"),
    getTranslations("Menu"),
  ]);

  const gruplar: { anahtar: string; ogeler: string[] }[] = [
    { anahtar: "operasyon", ogeler: duzen.gunluk },
    ...duzen.gruplar,
  ];

  function oge(anahtar: string, href: string, Ikon: (typeof MENU_IKONLARI)[string]) {
    const kaynak = ROZET_KAYNAGI[anahtar];
    const rozet = kaynak ? sayilar[kaynak] : 0;
    const oneCikan = anahtar === ONE_CIKAN_ISLEM;
    return (
      <Link
        key={anahtar}
        href={href}
        className="text-foreground flex min-h-[76px] flex-col items-center gap-1.5 rounded-lg px-0.5 py-1.5 no-underline"
      >
        <span
          className={`relative flex size-11 items-center justify-center rounded-xl ${
            oneCikan ? "bg-foreground text-background" : "bg-muted text-primary"
          }`}
        >
          <Ikon className="size-[22px]" aria-hidden />
          {rozet > 0 ? (
            <span
              className="bg-destructive ring-card absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold text-white tabular-nums ring-2"
              aria-label={t("bekleyen", { sayi: rozet })}
            >
              {rozet}
            </span>
          ) : null}
        </span>
        <span className="text-center text-[11px] leading-tight">{tMenu(anahtar)}</span>
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">{t("baslik")}</h1>

      {/* Kod arayan her kutu kamera taşır (İlke #7) — ortak bileşen, çıplak input yok. */}
      <KodAramaKutusu
        temelAdres={MENU_ADRESLERI.urunler ?? "/urunler"}
        baslangic=""
        tasinanlar={{}}
        ipucu={t("aramaIpucu")}
      />

      {gruplar.map((grup) => {
        const ogeler = grup.ogeler
          .map((anahtar) => ({ anahtar, href: MENU_ADRESLERI[anahtar], Ikon: MENU_IKONLARI[anahtar] }))
          .filter((o): o is { anahtar: string; href: string; Ikon: (typeof MENU_IKONLARI)[string] } =>
            Boolean(o.href && o.Ikon),
          );
        /* BOŞ GRUP ÇİZİLMEZ — sol menüyle aynı kural. */
        if (ogeler.length === 0) return null;
        return (
          <section
            key={grup.anahtar}
            aria-label={tMenu(grup.anahtar)}
            className="bg-card space-y-2 rounded-lg border px-3 pt-3 pb-2"
          >
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {tMenu(grup.anahtar)}
            </h2>
            <div className="grid grid-cols-4 gap-1.5">
              {ogeler.map((o) => oge(o.anahtar, o.href, o.Ikon))}
            </div>
          </section>
        );
      })}

      <section aria-label={t("grupYardim")} className="grid grid-cols-2 gap-2">
        {ALT_OGELER.map((o) => (
          <Link
            key={o.anahtar}
            href={o.href}
            className="bg-card text-foreground flex min-h-12 items-center gap-2 rounded-lg border px-3 text-xs font-semibold no-underline"
          >
            <o.icon className="text-primary size-[18px]" aria-hidden />
            {tMenu(o.anahtar)}
          </Link>
        ))}
      </section>
    </div>
  );
}
