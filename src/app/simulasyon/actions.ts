"use server";

import { getTranslations } from "next-intl/server";

import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { urunZemini, type UrunZemini } from "@/lib/simulasyon/urun-zemini";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  ÜRÜN ARAMA — FİYAT DENEMESİ İÇİN
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: barkod/EAN/pazaryeri SKU girilince ortalama
 *  alım-satım ve komisyon kendiliğinden dolsun.
 *
 *  ⚠ İZİN SUNUCUDA SORULUR. Ekranın `sayfaIzni` ile korunuyor olması bu
 *  action'ı korumaz: server action'lar kendi başına çağrılabilir bir uçtur.
 *  İzin kapısı burada da var.
 *
 *  ⚠ HİÇBİR ŞEY YAZMAZ. Salt okuma; bir deneme besleniyor, kayıt üretilmiyor.
 * ============================================================================
 */
export type AramaSonucu =
  | { tur: "BULUNDU"; zemin: UrunZemini }
  | { tur: "BULUNAMADI"; mesaj: string }
  | { tur: "YETKISIZ"; mesaj: string };

export async function urunAra(kod: string): Promise<AramaSonucu> {
  const t = await getTranslations("Simulasyon");

  if (!(await izinVarMi("satis.kar.gor"))) {
    return { tur: "YETKISIZ", mesaj: t("yetkisiz") };
  }

  /**
   * ⚠ "BUGÜN" İŞ TAKVİMİNDEN — sunucunun saatinden değil. Tarife penceresi
   * kıyası buna bağlı; yanlış gün bir tarifeyi "bitmiş" ya da "geçerli"
   * gösterebilir (anayasa: Europe/Istanbul sabit).
   */
  const zemin = await urunZemini(kod, gunDegeri(isTakvimGunu(new Date())));

  /**
   * BULUNAMADI SESSİZ KALMAZ — ne aradığı ekranda yazar (İlke #5).
   * "Bulunamadı" ile "yanlış kod girdin" farklı şeyler değil; kullanıcı
   * hangi kodların denendiğini bilmeli.
   */
  if (zemin === null) {
    return { tur: "BULUNAMADI", mesaj: t("bulunamadi", { kod: kod.trim() }) };
  }
  return { tur: "BULUNDU", zemin };
}
