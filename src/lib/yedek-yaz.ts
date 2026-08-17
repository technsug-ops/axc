import { del, list, put } from "@vercel/blob";

import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { yedegiMetneCevir, yedekUret } from "@/lib/yedek";

/**
 * ============================================================================
 *  GÜNLÜK YEDEĞİ DEPOYA YAZ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN AYRI DOSYA (17.08.2026)
 *
 *  Bu iş önce yalnız `/api/yedek/otomatik` route'unun içindeydi ve tetikleyeni
 *  Vercel cron'du. Cron 12.08 gecesinden sonra HİÇ çalışmadı; dört gün boyunca
 *  yedek alınmadığını kimse fark etmedi. Uyarı zili eklendi (`uyari/yedek.ts`)
 *  ama uyarı kullanıcıyı ÇÖZÜMSÜZ bir ekrana götürüyordu: "yedeğin eski"
 *  diyordu, gidilen sayfada yedek ALACAK bir düğme yoktu.
 *
 *  Mantık buraya taşındı; route da ekrandaki düğme de AYNI fonksiyonu çağırır.
 *  İkinci bir kopya yazsaydık biri düzeltilip öteki unutulurdu ve "elle aldığım
 *  yedek ile gece yedeği aynı şeyi mi içeriyor" sorusunun cevabı olmazdı.
 *
 *  ── KAPSAM: HAFİF ───────────────────────────────────────────────────────
 *  Kargo tarifeleri (44.841 satır) dosyanın %85'ini kaplıyor ve `prisma db
 *  seed` ile aynen yeniden üretilebilen REFERANS veridir. İş verisinin tamamı
 *  içeride. Ne eksik olduğu dosyaya `kargoTarifesiHaric: true` olarak YAZILIR
 *  ve ekranda da beyan edilir — sessiz varsayım yok.
 * ============================================================================
 */

/** Kaç günlük yedek saklanır. */
export const SAKLAMA_GUNU = 30;
export const YEDEK_KLASORU = "yedek";

export type YedekYazmaSonucu =
  | {
      tamam: true;
      gun: string;
      url: string;
      satir: number;
      boyutBayt: number;
      silinenEskiYedek: number;
    }
  | { tamam: false; kod: "DEPO_YOK" | "HATA"; mesaj: string };

/**
 * Günlük yedeği üretir ve depoya yazar. Aynı gün ikinci kez çalışırsa
 * ÜZERİNE yazar — gün başına tek dosya.
 */
export async function gunlukYedekYaz(
  an: Date = new Date(),
): Promise<YedekYazmaSonucu> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      tamam: false,
      kod: "DEPO_YOK",
      mesaj:
        "Vercel Blob deposu bağlı değil. Vercel → Storage → Blob oluşturup projeye bağlayın.",
    };
  }

  const gun = gunMetni(gunDegeri(isTakvimGunu(an)));

  try {
    const yedek = await yedekUret(an, true);
    const icerik = yedegiMetneCevir(yedek);

    const { url } = await put(`${YEDEK_KLASORU}/selliora-${gun}.json`, icerik, {
      /**
       * ÖZEL (private) — KAMUYA AÇIK DEĞİL. Bu dosyada satış, maliyet ve kâr
       * rakamları AÇIK METİN duruyor; adresin tahmin edilemez olması
       * gizlilik sayılmaz.
       */
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const esik = new Date(an.getTime() - SAKLAMA_GUNU * 24 * 60 * 60 * 1000);
    const { blobs } = await list({ prefix: `${YEDEK_KLASORU}/` });
    const eskiler = blobs.filter((b) => new Date(b.uploadedAt) < esik);
    if (eskiler.length > 0) await del(eskiler.map((b) => b.url));

    return {
      tamam: true,
      gun,
      url,
      satir: Object.values(yedek.satirSayilari).reduce((t, n) => t + n, 0),
      boyutBayt: Buffer.byteLength(icerik, "utf8"),
      silinenEskiYedek: eskiler.length,
    };
  } catch (e) {
    // SESSİZ BAŞARISIZLIK YASAK: hata metni çağırana döner, günlüğe düşer.
    console.error("[yedek-yaz] basarisiz:", e);
    return { tamam: false, kod: "HATA", mesaj: String(e) };
  }
}

/**
 * Bir yedek dosyasının KAPSAMI — ekranda beyan için.
 *
 * ⚠ Kullanıcı 2,6 MB ile 17,5 MB arasında seçim yaparken neyin eksik
 * olduğunu bilmiyordu. Bilgi dosyanın içinde (`kargoTarifesiHaric`) vardı ama
 * ekranda yoktu; listeden seçen kişi dosyayı açmadan karar veriyordu.
 *
 * Ad deseninden çıkarılır: günlük yedekler `selliora-<gün>.json`, elle
 * alınanlar `guvenlik-*`. Kesin bilgi dosyanın kendisindedir ve geri yükleme
 * "Denetle" adımında oradan okunur — bu yalnız LİSTE ipucudur.
 */
export function yedekKapsami(dosyaAdi: string): "GUNLUK" | "TAM" {
  return dosyaAdi.startsWith("selliora-") ? "GUNLUK" : "TAM";
}
