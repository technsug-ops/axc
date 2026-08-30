import { randomUUID } from "node:crypto";

import { apiIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import {
  iceAktarmaDogrula,
  type Kip,
  type Ozet,
  type SatirHatasi,
  type SatirUyarisi,
} from "@/lib/ice-aktarma/dogrula";
import { sablonMetinleri } from "@/lib/ice-aktarma/metinler";
import { dosyayiOku } from "@/lib/ice-aktarma/oku";
import { referansYukle } from "@/lib/ice-aktarma/referans";
import { planiYaz, type YazimSonucu } from "@/lib/ice-aktarma/yaz";
import {
  SAYIM_ISRAR_SEBEPLERI,
  type SayimIsrarSebebi,
} from "@/lib/sayim-korumasi";
import { SayimKorumasiHatasi } from "@/lib/satis";

/**
 * ============================================================================
 *  YÜKLEME UÇ NOKTASI — ÖNİZLE, SONRA YAZ
 * ----------------------------------------------------------------------------
 *  NEDEN SERVER ACTION DEĞİL: Server Action gövdesi varsayılan 1 MB ile
 *  sınırlı ve bu sınır yalnızca `experimental.serverActions.bodySizeLimit`
 *  ile yükseltiliyor. Anayasa deneysel özellik kullanmayı yasaklıyor
 *  (CLAUDE.md → Teknoloji kuralları), route handler'da böyle bir sınır yok.
 *
 *  NEDEN DOSYA İKİ KEZ GÖNDERİLİYOR: Önizleme ile yazım arasında sunucuda
 *  durum tutulmuyor. Tarayıcı aynı dosyayı `yaz=1` ile ikinci kez gönderir ve
 *  dosya BAŞTAN doğrulanır. Bu bir eksiklik değil, kasıtlı: arada başka bir
 *  yerden aynı SKU açılmışsa yazım anında yakalanır — onayladığınız plan ile
 *  yazılan plan aynı veriye bakar.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

type Yanit =
  | {
      durum: "HATA";
      hatalar: SatirHatasi[];
      eksikSutunlar: { sayfa: string; sutun: string }[];
      /**
       * ⭐ SAYIM KAPISI DURAKSATTI — ekran ısrar bloğunu ÇİZSİN diye.
       * ⚠ Sunucu yine kendi ölçütünü koşar; bu bayrak yalnız GÖSTERİM.
       */
      sayimDuraksatti?: boolean;
    }
  | { durum: "ONIZLEME"; ozet: Ozet; uyarilar: SatirUyarisi[] }
  | { durum: "YAZILDI"; sonuc: YazimSonucu }
  | { durum: "COKTU"; mesaj: string };

export async function POST(istek: Request) {
  const red = await apiIzni("veri.aktar");
  if (red) return red;

  const t = await getTranslations("IceAktarma");

  let form: FormData;
  try {
    form = await istek.formData();
  } catch {
    return yanitla({ durum: "COKTU", mesaj: t("okunamadi") }, 400);
  }

  const dosya = form.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return yanitla({ durum: "COKTU", mesaj: t("dosyaYok") }, 400);
  }

  const kip: Kip = form.get("kip") === "GUNCELLE" ? "GUNCELLE" : "YALNIZ_YENI";
  const yazilsinMi = form.get("yaz") === "1";

  // --- 1) OKU ---
  let okunan;
  try {
    const icerik = Buffer.from(await dosya.arrayBuffer());
    okunan = await dosyayiOku(icerik, await sablonMetinleri());
  } catch (e) {
    console.error("[ice-aktarma] dosya okunamadi:", e);
    return yanitla({ durum: "COKTU", mesaj: t("okunamadi") }, 400);
  }

  if (okunan.eksikSutunlar.length > 0) {
    return yanitla({
      durum: "HATA",
      hatalar: [],
      eksikSutunlar: okunan.eksikSutunlar,
    });
  }

  // --- 2) DOĞRULA ---
  const referans = await referansYukle();
  const sonuc = iceAktarmaDogrula(okunan.veri, referans, kip, randomUUID);

  if (sonuc.hatalar.length > 0) {
    return yanitla({
      durum: "HATA",
      hatalar: sonuc.hatalar,
      eksikSutunlar: [],
    });
  }

  // --- 3) ÖNİZLEME (hiçbir şey yazılmadı) ---
  if (!yazilsinMi) {
    return yanitla({
      durum: "ONIZLEME",
      ozet: sonuc.ozet,
      uyarilar: sonuc.uyarilar,
    });
  }

  // --- 4) YAZ — tek transaction ---
  try {
    /**
     * ⭐ SAYIM KAPISI ISRARI — form gövdesinden okunur.
     * ⚠ Sunucu ekrana GÜVENMEZ: `planiYaz` aynı saf gövdeyi kendisi
     * çağırır ve geçersiz ısrarı reddeder.
     */
    const sebepHam = String(form.get("sayimIsrariSebep") ?? "");
    const yazim = await planiYaz(sonuc.plan, {
      onaylandi: String(form.get("sayimIsrariOnay") ?? "") === "1",
      sebep: (SAYIM_ISRAR_SEBEPLERI as readonly string[]).includes(sebepHam)
        ? (sebepHam as SayimIsrarSebebi)
        : null,
      aciklama: String(form.get("sayimIsrariAciklama") ?? ""),
    });
    return yanitla({ durum: "YAZILDI", sonuc: yazim });
  } catch (e) {
    /**
     * ⭐ SAYIM KAPISI DURAKSATTI — ve mesaj ÇIKIŞI DA SÖYLÜYOR.
     * ⚠ Ham hata ekrana basılmaz; kod SABİT eşlemeyle metne çevrilir.
     */
    if (e instanceof SayimKorumasiHatasi) {
      return yanitla({
        durum: "HATA",
        hatalar: [
          {
            sayfa: "acilisStogu",
            satir: 0,
            alan: "adet",
            kod: "SAYIM_KORUMASI",
            deger: String(e.duraksayanlar.length),
          },
        ],
        eksikSutunlar: [],
        sayimDuraksatti: true,
      });
    }
    console.error("[ice-aktarma] yazim basarisiz:", e);
    return yanitla({ durum: "COKTU", mesaj: t("beklenmeyenHata") }, 500);
  }
}

function yanitla(govde: Yanit, kod = 200) {
  return Response.json(govde, { status: kod });
}
