import { createHash } from "node:crypto";

import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { varsayilanYedekHedefi, type YedekHedefi } from "@/lib/yedek-hedefi";
import { izYaz } from "@/lib/iz";
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

/**
 * ⛔ DOĞRULANMIŞ YEDEĞİN İZİ — TEK KAYIT YERİ (K193, 09.09.2026).
 *
 * ⚠ NİYE DOĞDU: Blob kotası 30 Eylül'e kadar kapalı ve o güne dek yedek
 * operatörün makinesinde, `npm run canli:yedek-cekirdek` ile alınıyor.
 * Ölçüldü (09.09): yerel klasörde ÜÇ doğrulanmış yedek duruyordu
 * (31.08 · 08.09 · 09.09) ve **sistemde hiçbirinin izi yoktu** — "yedek
 * alındı mı" sorusunun cevabı hiçbir yerde yazmıyordu.
 *
 * ⚠ İZ KANIT DEĞİL, YEDEKTİR. `uyari/topla.ts` haklı olarak şunu diyor:
 * damga veritabanında dursaydı, veritabanının kendisi gittiğinde yedeğin
 * varlığını da kaybederdik. Bu yüzden **dosyanın kendisi tek doğru
 * kanıttır**; iz yalnız depo OKUNAMADIĞINDA başvurulan ikinci kaynaktır ve
 * ekranda öyle beyan edilir.
 */
export const YEDEK_IZI = "YEDEK_ALINDI";

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
      /** Hangi hedefe yazıldı — ekranda ve izde beyan edilir. */
      hedefTuru: YedekHedefi["tur"];
      /** Geri okuma doğrulaması kaç ms sürdü — maliyet ÖLÇÜLÜR, varsayılmaz. */
      dogrulamaMs: number;
    }
  | {
      tamam: false;
      /**
       * ⛔ `OKUNAMADI` AYRI BİR KODDUR — "yazılamadı" ile aynı kefeye konmaz.
       * 31.08.2026'da yazma ÇALIŞIYORDU, kırılan OKUMAYDI; tek kod olsaydı
       * teşhis "yedek alınamadı"da kalır ve askı görünmezdi.
       */
      kod: "DEPO_YOK" | "OKUNAMADI" | "HATA";
      mesaj: string;
    };

/**
 * ============================================================================
 *  YAZ → GERİ OKU → ÖZET KARŞILAŞTIR — TEK GÖVDE, VERİTABANI GEREKTİRMEZ
 * ----------------------------------------------------------------------------
 *  ⭐ NİYE AYRI GÖVDE (K119b, 08.09.2026): bu kural bir BEKÇİ ile korunmak
 *  zorunda ve anayasa şunu söylüyor — _"saf hesap katmanı, desen tarayan
 *  bekçiye muhtaç olmaz"_. `gunlukYedekYaz` veritabanını okuduğu için
 *  değerle sınanamıyordu; buradaki gövde içeriği PARAMETRE olarak alıyor,
 *  dolayısıyla bekçi sahte bir hedefle **çağırarak** sınayabiliyor.
 *
 *  ⛔ VE BAŞARIYI ATLAMAK YAPISAL OLARAK İMKÂNSIZ: `adres` ve `dogrulamaMs`
 *  yalnız buradan çıkıyor. Çağrıyı silen bir mutasyon derlemeyi düşürür —
 *  koruma disipline değil MEKANİZMAYA bağlı.
 * ============================================================================
 */
export type HedefeYazimSonucu =
  | { tamam: true; adres: string; dogrulamaMs: number }
  | { tamam: false; kod: "OKUNAMADI"; mesaj: string };

export async function yedegiHedefeYaz(
  hedef: YedekHedefi,
  ad: string,
  icerik: string,
): Promise<HedefeYazimSonucu> {
  const { adres } = await hedef.yaz(ad, icerik);

  const dogrulamaBasi = Date.now();
  const okunan = await hedef.oku(ad);
  const dogrulamaMs = Date.now() - dogrulamaBasi;

  if (okunan === null) {
    return {
      tamam: false,
      kod: "OKUNAMADI",
      mesaj: `Yedek ${hedef.aciklama} hedefine yazıldı ama geri okunamadı: dosya bulunamadı (${ad}).`,
    };
  }

  /**
   * ⚠ ÖZET KARŞILAŞTIRILIR, UZUNLUK DEĞİL. Aynı boyutta bozuk bir dosya
   * uzunluk testini geçerdi; `sha256` geçmez.
   */
  const ozet = (m: string) =>
    createHash("sha256").update(m, "utf8").digest("hex");
  if (ozet(okunan) !== ozet(icerik)) {
    return {
      tamam: false,
      kod: "OKUNAMADI",
      mesaj: `Yedek ${hedef.aciklama} hedefine yazıldı ama geri okunan içerik yazılanla AYNI DEĞİL (${ad}).`,
    };
  }

  return { tamam: true, adres, dogrulamaMs };
}

/**
 * Günlük yedeği üretir, hedefe yazar ve **GERİ OKUYARAK DOĞRULAR**. Aynı gün
 * ikinci kez çalışırsa ÜZERİNE yazar — gün başına tek dosya.
 *
 * ═══ ⛔ HEDEF ARTIK GÖMÜLÜ DEĞİL (K119b, 08.09.2026) ═══════════════════
 *
 * Burada `put()` DOĞRUDAN çağrılıyordu. K119a soyutlamayı (`YedekHedefi`)
 * kurmuştu ama bu gövde ona hiç bağlanmadı: soyutlamayı yalnız betikler
 * kullanıyordu, **kullanıcının bastığı düğme ve gece cron'u hâlâ tek
 * kütüphaneye kilitliydi.** Depo askıya alınınca ikisi de düştü ve başka
 * hiçbir yol yoktu — K119a'nın çözdüğünü sandığı arıza yerinde duruyordu.
 * _(Anayasa: "düzeltme yolu, TÜM okuyuculara ulaştığı ölçülmeden 'var'
 * sayılmaz" — ölçülmemişti.)_
 *
 * ═══ ⛔ YAZMAK YETMEZ: GERİ OKUNDUĞU DOĞRULANIR ═══════════════════════
 *
 * 31.08.2026'da yazma da listeleme de "çalışıyor" görünüyordu; kırılan
 * OKUMAYDI ve o gün kullanılabilir yedek sayısı **sıfırdı**. Yazma sonucuna
 * bakan bir kontrol bunu göremezdi. Bu yüzden başarı ancak şu üçünden sonra
 * ilan edilir: **yaz → geri oku → özetleri karşılaştır.**
 * _(Kullanıcı kuralı: "okunamayan yedek, yedek değildir".)_
 *
 * ⚠ MALİYETİ VARSAYILMIYOR, ÖLÇÜLÜYOR: geri okuma dosyayı ikinci kez taşır
 * ve `dogrulamaMs` olarak sonuca yazılır. Gece işi 60 sn tavanına dayanırsa
 * bu sayı bunu SÖYLER — tahmin etmek yerine ölçmek için orada.
 *
 * @param hedef Sınama için enjekte edilebilir; verilmezse ortamdan seçilir.
 */
export async function gunlukYedekYaz(
  an: Date = new Date(),
  hedef?: YedekHedefi,
): Promise<YedekYazmaSonucu> {
  let secilen: YedekHedefi;
  if (hedef) {
    secilen = hedef;
  } else {
    const secim = varsayilanYedekHedefi();
    if (!secim.tamam) return { tamam: false, kod: secim.kod, mesaj: secim.mesaj };
    secilen = secim.hedef;
  }

  const gun = gunMetni(gunDegeri(isTakvimGunu(an)));
  const ad = `${YEDEK_KLASORU}/selliora-${gun}.json`;

  try {
    const yedek = await yedekUret(an, true);
    const icerik = yedegiMetneCevir(yedek);

    const yazim = await yedegiHedefeYaz(secilen, ad, icerik);
    if (!yazim.tamam) return yazim;
    const { adres, dogrulamaMs } = yazim;

    /* ═══ SAKLAMA SÜRESİ — eski yedekleri temizle ═════════════════════ */
    const esik = new Date(an.getTime() - SAKLAMA_GUNU * 24 * 60 * 60 * 1000);
    const kayitlar = await secilen.listele(`${YEDEK_KLASORU}/`);
    const eskiler = kayitlar.filter((k) => k.yazildi < esik);
    const silinen = eskiler.length > 0 ? await secilen.sil(eskiler.map((k) => k.ad)) : 0;

    const satir = Object.values(yedek.satirSayilari).reduce((t, n) => t + n, 0);
    const boyutBayt = Buffer.byteLength(icerik, "utf8");

    /**
     * ⛔ İZ BAŞARIDAN SONRA — YANİ GERİ OKUMA TUTTUKTAN SONRA. Yazma
     * sonrasına konsaydı "yedek alındı" diyen bir iz, geri okunamayan bir
     * dosya için de yazılırdı ve 31.08 vakasının aynısını üretirdi.
     *
     * ⚠ HATA YUTULUR AMA SESSİZ DEĞİL: iz tutulamadıysa yedek YİNE DE
     * alınmıştır ve başarı geri alınmaz; günlüğe düşer.
     */
    try {
      await izYaz({
        action: YEDEK_IZI,
        targetType: "Yedek",
        targetId: gun,
        /** ⛔ Oturuma BAKILMAZ: bu yol betikten ve cron'dan koşuyor. */
        userId: null,
        detail: JSON.stringify({
          gun,
          hedefTuru: secilen.tur,
          adres,
          satir,
          boyutBayt,
          dogrulamaMs,
          not: "geri okuma tuttu — dogrulanmis yedek",
        }),
      });
    } catch (e) {
      console.error("[yedek-yaz] iz yazilamadi (yedek YINE DE alindi):", e);
    }

    return {
      tamam: true,
      gun,
      url: adres,
      satir,
      boyutBayt,
      silinenEskiYedek: silinen,
      hedefTuru: secilen.tur,
      dogrulamaMs,
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
