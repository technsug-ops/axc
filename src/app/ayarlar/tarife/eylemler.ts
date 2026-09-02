"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { ENGEL_ANAHTARI } from "@/lib/komisyon/tarife-engeli";
import { tarifeDenetle, tarifeYaz } from "@/lib/komisyon/tarife-yaz";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  TARİFE YÜKLEME — SUNUCU EYLEMLERİ (K47)
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN YENİ MANTIK YAZMIYOR. Okuma, plan kurma, dilim çözme ve yazma
 *  `lib/komisyon/tarife-yaz.ts`te duruyor ve `npm run canli:tarife-yukle`
 *  betiği de AYNI gövdeyi çağırıyor. İkinci bir yol yazsaydık iki yükleme
 *  yolu iki farklı sonuç üretebilirdi — komisyon paketinin ilk dersi tam
 *  olarak buydu.
 *
 *  ── İKİ ADIM, TEK YAZMA ─────────────────────────────────────────────────
 *  1. `tarifeOnizle` — dosya çözülür, plan gösterilir. HİÇBİR ŞEY YAZMAZ.
 *  2. `tarifeyiYaz`  — kullanıcı planı gördükten SONRA onaylar.
 *  Betikteki `--uygula` bayrağının ekran karşılığı budur; disiplin
 *  değişmiyor, yalnız düğmeye dönüşüyor.
 * ============================================================================
 */

/** Adım 1 — çözüm ve plan. Yazma YOK. */
export async function tarifeOnizle(form: FormData) {
  await yetkiIste("kanalsku.yaz");
  const t = await getTranslations("Tarife");

  const dosya = form.get("dosya");
  const hesapId = String(form.get("hesap") ?? "");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { durum: "HATA" as const, engel: t("hataDosyaSecilmedi") };
  }
  if (!hesapId) {
    return { durum: "HATA" as const, engel: t("hataHesapSecilmedi") };
  }

  const bayt = Buffer.from(await dosya.arrayBuffer());
  /** ⚠ Dosya adı tanımaya geçer — "Önce göster" ile "Yaz" aynı cevabı versin. */
  const sonuc = await tarifeDenetle(bayt, hesapId, bugunku(), dosya.name);
  return ozetle(sonuc, t);
}

/** Adım 2 — yazma. Kullanıcı planı GÖRDÜKTEN sonra. */
export async function tarifeyiYaz(form: FormData) {
  await yetkiIste("kanalsku.yaz");
  const t = await getTranslations("Tarife");

  const dosya = form.get("dosya");
  const hesapId = String(form.get("hesap") ?? "");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { durum: "HATA" as const, engel: t("hataDosyaSecilmedi") };
  }
  if (!hesapId) {
    return { durum: "HATA" as const, engel: t("hataHesapSecilmedi") };
  }

  const bayt = Buffer.from(await dosya.arrayBuffer());
  const sonuc = await tarifeYaz({
    dosya: bayt,
    dosyaAdi: dosya.name,
    channelAccountId: hesapId,
    bugun: bugunku(),
  });

  /**
   * ── HAM DOSYA ARŞİVE ──────────────────────────────────────────────────
   * ⚠ BETİK DİSKE KOPYALIYOR, BU EKRAN KOPYALAYAMAZ: Vercel'de kalıcı disk
   * yok, `veri/ozel/arsiv/` her deploy'da siliniyor. Blob deposu zaten
   * kurulu (`yedek-yaz.ts` · `/api/ekler`) ve aynı desen kullanılıyor.
   *
   * ⚠ ARŞİV, YAZMADAN SONRA VE HATA YUTULARAK YAPILIYOR — bilerek. Arşiv
   * "kaynakta ne vardı" sorusu içindir; deposu bağlı değilse tarifenin
   * kendisi yine de yazılmalıdır. Tersi olsaydı Blob'suz bir ortamda
   * haftalık rutin tamamen dururdu.
   *
   * ⚠ VE ARŞİVİN BAŞARISIZLIĞI SESSİZ KALMIYOR: sonuç `arsiv` alanıyla
   * ekrana çıkıyor. Sessiz yutmak, arşivi olmayan bir yüklemeyi arşivli
   * sanmak olurdu.
   */
  let arsiv: "YAZILDI" | "DEPO_YOK" | "HATA" = "DEPO_YOK";
  if (sonuc.durum === "YAZILDI") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      arsiv = "DEPO_YOK";
    } else {
      try {
        const damga = sonuc.pencere.baslangic.toISOString().slice(0, 10);
        await put(`tarife-arsiv/${damga}-${dosya.name}`, bayt, {
          /** ⚠ ÖZEL — dosyada ürün bazında komisyon oranlarımız var. */
          access: "private",
          addRandomSuffix: true,
        });
        arsiv = "YAZILDI";
      } catch {
        arsiv = "HATA";
      }
    }
    revalidatePath("/ayarlar/tarife");
    revalidatePath("/");
  }

  return { ...ozetle(sonuc, t), arsiv };
}

/**
 * İŞ GÜNÜ — `Europe/Istanbul`.
 *
 * ⚠ `new Date()` DOĞRUDAN GEÇİLMEZ. Tarife penceresi gün bazlı çözülüyor;
 * çalışma ortamının saat dilimi kullanılırsa Almanya'daki bir tarayıcıdan
 * yüklenen dosya bir gün kaymış pencereye düşebilir.
 */
function bugunku(): Date {
  return gunDegeri(isTakvimGunu(new Date()));
}

type Ceviri = Awaited<ReturnType<typeof getTranslations<"Tarife">>>;

/**
 * ENGEL KODU → TÜRKÇE CÜMLE — TEK KAPI.
 *
 * ⚠ NİYE VAR (canlı hata 25.08.2026): `engel` alanı KARIŞIK taşıyordu —
 * dosya/hesap kontrolleri `t(...)` ile Türkçe metin koyuyor, `ozetle` ise
 * `yazilabilirMi`nin KODUNU olduğu gibi geçiriyordu. Kullanıcı Hepsiburada
 * "Avantajlı Teklifler" dosyasını yükleyince ekranda ham `SUTUN_EKSIK`
 * yazdı: bir operasyoncuya hiçbir şey söylemeyen, ne olduğu ve ne yapılacağı
 * belirsiz bir kod (İlke #5 — sessiz başarısızlık yasak; i18n — koda gömülü
 * metin yasak).
 *
 * ⚠ EXHAUSTIVE `switch`: `YazimEngeli`ye dördüncü bir kod eklenirse burası
 * DERLENMEZ. Elle sayılan bir liste, yarın eklenecek kodu sessizce ham
 * hâlde ekrana bırakırdı — "tip listesi değil, BAĞ".
 */
function engelMetni(
  engel: Extract<Awaited<ReturnType<typeof tarifeDenetle>>, { durum: "HATA" }>,
  t: Ceviri,
): string {
  /* Eşleme `lib/komisyon/tarife-engeli.ts`te — bekçi oradan sınıyor. */
  return t(ENGEL_ANAHTARI[engel.kod] as Parameters<Ceviri>[0]);
}

/** Sunucu tipini istemciye taşınabilir düz veriye indirger. */
function ozetle(
  sonuc: Awaited<ReturnType<typeof tarifeDenetle>>,
  t: Ceviri,
):
  | { durum: "HATA"; engel: string; eksikler?: string[] }
  | {
      durum: "ONIZLEME";
      pencere: { baslangic: string; bitis: string } | null;
      /**
       * ⚠ DÖRT SAYI AYRI TAŞINIYOR, TEK "BAŞARILI" RAKAMINA İNDİRİLMİYOR.
       * Anayasa: incelenen · temiz · sapan · İNCELENEMEYEN ayrı sayılır.
       * `bagsizUrun` sıfırdan büyükse yüklemenin kapsamı o kadar dardır ve
       * bunu ekranda GÖRMEK gerekir — "672 kalem yazıldı" cümlesi, 200
       * ürünün eşleşmediğini gizleyebilir.
       */
      rapor: {
        okunanSatir: number;
        yazilacakKalem: number;
        eslesenUrun: number;
        bagsizUrun: number;
        bagsizKalem: number;
        mukerrerElenen: number;
        atlananSatir: number;
      };
      bagsizOrnekler: { barkod: string; urunAdi: string | null }[];
      dahaOnceYuklendi: boolean;
    }
  | {
      durum: "YAZILDI";
      pencere: { baslangic: string; bitis: string };
      kalem: number;
      yuklemeSayisi: number;
    } {
  if (sonuc.durum === "HATA") {
    /* ⚠ KOD DEĞİL CÜMLE. Ham kod ekrana çıkmaz; eksik sütunlar AYRI taşınır
       ki kullanıcı "hangi sütun" sorusunu ekrandan cevaplayabilsin. */
    return {
      durum: "HATA",
      engel: engelMetni(sonuc, t),
      eksikler: sonuc.eksikler,
    };
  }
  if (sonuc.durum === "ONIZLEME") {
    const p = sonuc.okuma.pencere;
    return {
      durum: "ONIZLEME",
      pencere: p
        ? {
            baslangic: p.baslangic.toISOString(),
            bitis: p.bitis.toISOString(),
          }
        : null,
      rapor: sonuc.plan.rapor,
      bagsizOrnekler: sonuc.plan.bagsizOrnekler,
      dahaOnceYuklendi: sonuc.mevcutYukleme !== null,
    };
  }
  return {
    durum: "YAZILDI",
    pencere: {
      baslangic: sonuc.pencere.baslangic.toISOString(),
      bitis: sonuc.pencere.bitis.toISOString(),
    },
    kalem: sonuc.plan.kalemler.length,
    yuklemeSayisi: sonuc.yuklemeSayisi,
  };
}
