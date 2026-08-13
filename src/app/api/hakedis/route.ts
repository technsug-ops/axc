import { apiIzni } from "@/lib/yetki";
import {
  hakedisDenetle,
  hakedisYaz,
  type HakedisHatasi,
  type HakedisOnizleme,
} from "@/lib/hakedis/yukle";

/**
 * ============================================================================
 *  HAKEDİŞ YÜKLEME UÇ NOKTASI — ÖNİZLE, SONRA YAZ
 * ----------------------------------------------------------------------------
 *  NEDEN SERVER ACTION DEĞİL: Server Action gövdesi 1 MB ile sınırlı ve bu
 *  sınır yalnızca `experimental.serverActions.bodySizeLimit` ile yükseltilir.
 *  Anayasa deneysel özelliği yasaklıyor; route handler'da sınır yok.
 *  (İçe aktarma uç noktasıyla aynı gerekçe.)
 *
 *  DOSYA İKİ KEZ GÖNDERİLİR: önizleme ile yazım arasında sunucuda durum
 *  tutulmuyor. İkinci gönderimde dosya BAŞTAN okunur — arada başka bir
 *  yükleme olduysa "zaten yüklü" sayısı güncel çıkar.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

type Yanit =
  | { durum: "HATA"; hatalar: HakedisHatasi[] }
  | { durum: "ONIZLEME"; onizleme: HakedisOnizleme }
  | { durum: "YAZILDI"; yazilan: number; settlementId: string }
  | { durum: "COKTU"; mesaj: string };

function yanitla(govde: Yanit, durum = 200) {
  return Response.json(govde, { status: durum });
}

export async function POST(istek: Request) {
  const red = await apiIzni("hakedis.gor");
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
    const sonuc = await hakedisDenetle(bayt, hesapId);

    if (sonuc.durum === "HATA") {
      return yanitla({ durum: "HATA", hatalar: sonuc.hatalar });
    }
    if (!yazilsinMi) {
      return yanitla({ durum: "ONIZLEME", onizleme: sonuc.onizleme });
    }

    // Yazacak satır kalmadıysa boş parti açma: tekrar yüklemede hepsi
    // atlanmış olabilir.
    if (sonuc.yazilacaklar.length === 0) {
      return yanitla({ durum: "YAZILDI", yazilan: 0, settlementId: "" });
    }

    const yazim = await hakedisYaz({
      channelAccountId: hesapId,
      dosyaAdi: dosya.name,
      satirlar: sonuc.yazilacaklar,
    });
    return yanitla({ durum: "YAZILDI", ...yazim });
  } catch (e) {
    console.error("[hakedis] beklenmeyen hata:", e);
    return yanitla({ durum: "COKTU", mesaj: "BEKLENMEYEN" }, 500);
  }
}
