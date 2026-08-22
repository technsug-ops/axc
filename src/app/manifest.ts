import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

import { MARKA_RENKLERI } from "@/lib/marka/renkler";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  PWA MANİFESTİ — TELEFONA KURULABİLİR HÂL
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.08.2026: _"PWA şeklinde programın mobilde desteklenmesini
 *  istiyorum."_
 *
 *  Bu dosya telefona "ben bir uygulamayım" der: ana ekrana eklenince kendi
 *  simgesiyle, tarayıcı adres çubuğu olmadan açılır. Depo aşamasında
 *  birincil cihaz telefon olacak (İlke #8) ve adres çubuğu her açılışta
 *  ekranın bir bölümünü yiyordu.
 *
 *  ⚠ AD SÖZLÜKTEN DEĞİL SABİTTEN: ürün adı bir ÖZEL İSİMDİR, çevrilmez.
 *  Açıklama ise çevrilir ve sözlükten gelir (anayasa: i18n).
 * ============================================================================
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Uygulama");

  return {
    name: UYGULAMA.ad,
    short_name: UYGULAMA.ad,
    description: t("slogan"),

    /**
     * ⚠ GİRİŞ NOKTASI PANEL, ANA SAYFA DEĞİL — ikisi burada aynı ("/") ama
     * niyet önemli: kullanıcı simgeye bastığında işine baktığı yere düşmeli.
     * Oturum yoksa kapı zaten `/giris`e yönlendirir; manifest'e `/giris`
     * yazmak, oturumu açık kullanıcıyı da her seferinde oraya sokardı.
     */
    start_url: "/",
    scope: "/",

    /** Adres çubuğu olmadan, kendi penceresinde. */
    display: "standalone",

    /**
     * ⚠ DİKEY KİLİT YOK. Depo ekranlarında tablo geniş; kullanıcı telefonu
     * yan çevirebilmeli. `portrait` yazmak, kendi ekranımızı dar bırakırdı.
     */
    orientation: "any",

    /** Açılış ekranı ve sistem çubuğu rengi — sol menü kabuğuyla aynı. */
    background_color: MARKA_RENKLERI.zemin,
    theme_color: MARKA_RENKLERI.zemin,

    /** Arayüz dili; sağdan sola değil. */
    lang: "tr",
    dir: "ltr",

    icons: [
      { src: "/ikon/192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon/512.png", sizes: "512x512", type: "image/png" },
      /**
       * ⚠ MASKELİ AYRI GİRDİ OLMAK ZORUNDA. Aynı dosyaya iki amaç
       * (`"any maskable"`) yazılırsa Android kırparken harfin kenarlarını
       * yer; ayrı çizim, kenardan pay bırakılmış olanı verir.
       */
      {
        src: "/ikon/maskeli-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
