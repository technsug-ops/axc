import { apiIzni } from "@/lib/yetki";
import {
  bosOranSayisi,
  komisyonDenetle,
  komisyonYaz,
  type KomisyonHatasi,
  type KomisyonOnizlemesi,
} from "@/lib/komisyon/yukle";

/**
 * ============================================================================
 *  KOMİSYON İÇE AKTARMA UÇ NOKTASI — ÖNİZLE, SONRA YAZ
 * ----------------------------------------------------------------------------
 *  NEDEN SERVER ACTION DEĞİL: Server Action gövdesi 1 MB ile sınırlı ve bu
 *  sınır yalnızca `experimental.serverActions.bodySizeLimit` ile yükseltilir.
 *  Anayasa deneysel özelliği yasaklıyor; route handler'da sınır yok. Gerçek
 *  Trendyol ürün listesi 1,2 MB (ölçüldü) — Server Action ile HİÇ çalışmazdı.
 *  (Hakediş ve içe aktarma uç noktalarıyla aynı gerekçe.)
 *
 *  İZİN `kanalsku.yaz`: bu uç nokta komisyon oranı yazıyor, yani doğrudan
 *  kâr hesabını değiştiriyor. /kanal-sku ekranıyla aynı izne bağlı —
 *  SAHİP'te var, Operasyon'da yok.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

type Yanit =
  | { durum: "HATA"; hatalar: KomisyonHatasi[] }
  | { durum: "ONIZLEME"; onizleme: KomisyonOnizlemesi }
  | {
      durum: "YAZILDI";
      guncellenen: number;
      yaratilan: number;
      /** Yazımdan sonra oranı hâlâ boş olan eşleme sayısı — ölçüm. */
      kalanBosOran: number;
    }
  | { durum: "COKTU"; mesaj: string };

function yanitla(govde: Yanit, durum = 200) {
  return Response.json(govde, { status: durum });
}

export async function POST(istek: Request) {
  const red = await apiIzni("kanalsku.yaz");
  if (red) return red;

  let form: FormData;
  try {
    form = await istek.formData();
  } catch {
    return yanitla({ durum: "COKTU", mesaj: "FORM_OKUNAMADI" }, 400);
  }

  const dosya = form.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return yanitla({ durum: "COKTU", mesaj: "DOSYA_YOK" }, 400);
  }

  const hesapId = String(form.get("hesap") ?? "");
  if (!hesapId) return yanitla({ durum: "COKTU", mesaj: "HESAP_YOK" }, 400);

  const yazilsinMi = form.get("yaz") === "1";

  try {
    const bayt = Buffer.from(await dosya.arrayBuffer());
    const sonuc = await komisyonDenetle(bayt, hesapId);

    if (sonuc.durum === "HATA") {
      return yanitla({ durum: "HATA", hatalar: sonuc.hatalar });
    }
    if (!yazilsinMi) {
      return yanitla({ durum: "ONIZLEME", onizleme: sonuc.onizleme });
    }

    // Yazacak satır kalmadıysa boşuna transaction açılmaz: ikinci yüklemede
    // her şey aynı kalmış olabilir. Kapanış rakamı yine söylenir.
    if (sonuc.onizleme.yazilacak === 0) {
      return yanitla({
        durum: "YAZILDI",
        guncellenen: 0,
        yaratilan: 0,
        kalanBosOran: await bosOranSayisi(hesapId),
      });
    }

    const yazim = await komisyonYaz(hesapId, sonuc.yazim);
    return yanitla({ durum: "YAZILDI", ...yazim });
  } catch (e) {
    console.error("[komisyon] beklenmeyen hata:", e);
    return yanitla({ durum: "COKTU", mesaj: "BEKLENMEYEN" }, 500);
  }
}
