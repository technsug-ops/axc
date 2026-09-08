import { NextRequest, NextResponse } from "next/server";

import { hbCekimKos } from "../../../../../scripts/canli-hb-ice-aktar";

/**
 * ============================================================================
 *  K-HB-CRON — HB ÇEKİMİNİN SUNUCU UCU (TY/N11 ile AYNI SİSTEM)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU — ÖLÇÜLDÜ (08.09.2026). Hepsiburada içe aktarması canlıda
 *  **2 kez** koşmuştu ve ikisi de elle; aynı gün Trendyol **817 kez**
 *  koşmuştu. Sebep basitti ve hiçbir yerde yazmıyordu: **HB için bir
 *  tetikleyici hiç kurulmamıştı.**
 *
 *      src/app/api/cron/  →  ty-cekim · n11-cekim        ⛔ hb-cekim YOK
 *
 *  Halil siparişleri elle giriyordu ve iki sipariş (₺9.078) aylarca defterde
 *  yoktu. Elle giriş bir alışkanlık değil, sistemin bıraktığı boşluğun
 *  kapatılmasıydı.
 *
 *  ⚠ TETİKLEYİCİ VERCEL CRON DEĞİL — TY ile aynı gerekçe (anayasa dersi
 *  18-19.08.2026): Vercel Cron iki gün sessizce hiç tetiklenmedi ve Hobby
 *  planında logu olmadığı için sebebi ÖĞRENİLEMEDİ. "Yönetilemeyen
 *  bağımlılığa üçüncü şans verilmez." Tetikleyici GitHub Actions
 *  (`.github/workflows/ty-cekim.yml` — üç kanalı da o çağırıyor); her
 *  koşumun logu Actions sekmesinde duruyor.
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış tutan
 *  istek **404** alır — rotanın varlığı bile sızmaz (anayasa: "yetkiniz yok"
 *  demek orada bir şey OLDUĞUNU söyler). `CRON_SECRET` tanımsızsa uç herkese
 *  kapalıdır — güvenli varsayılan.
 *
 *  ⚠ ONAY SÜZGECİ BURADA KULLANILMAZ (`sadece` verilmez): süzgeç, mimarın
 *  onayladığı DAR bir kapsamı yazmak içindi. Rutin çekimin işi tersi —
 *  kanalda olup defterde olmayan HER siparişi getirmek. Süzgeci buraya
 *  koymak, rutini kendi amacının tersine çevirirdi.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/**
 * ⚠ SÜRE: enumerasyon üç uç (açık · kargoda · teslim) + YALNIZ kaçakların
 * detayı. Kaçak yoksa detay çağrısı hiç yapılmaz. Hobby tavanı 60 sn.
 */
export const maxDuration = 60;

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const dbAdresi = process.env.DATABASE_URL?.trim() ?? "";
  if (dbAdresi === "") {
    return NextResponse.json({ hata: "VERITABANI_TANIMSIZ" }, { status: 500 });
  }
  /**
   * ⛔ `yaz: true` — VE BU BİLİNÇLİ. Rutin çekim önizleme koşarsa hiçbir şey
   * yazılmaz ve boşluk kapanmaz; TY/N11 uçları da aynı şekilde yazıyor.
   * Güvenlik yazımın kendisinde: çakışan ATLANIR (ezme yok), `Sale.code`
   * global `@unique`, ve her koşum `importBatch` ile geri alınabilir.
   */
  const ozet = await hbCekimKos({ yaz: true, dbAdresi });
  return NextResponse.json(ozet);
}
