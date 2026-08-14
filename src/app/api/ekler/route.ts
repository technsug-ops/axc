import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ekHedefiGecerliMi,
  ekYolu,
  ekiDogrula,
  EK_SINIRLARI,
  type EkHatasi,
} from "@/lib/ekler";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  EK YÜKLEME — ROUTE HANDLER (SERVER ACTION DEĞİL)
 * ----------------------------------------------------------------------------
 *  NEDEN SERVER ACTION DEĞİL — 14.08.2026 canlı çökmesi (T5):
 *
 *  Yükleme `ekYukle` adlı bir Server Action'daydı. Server Action gövdesi
 *  VARSAYILAN 1 MB ile sınırlı ve bu sınır ÇERÇEVE KATMANINDA uygulanıyor:
 *  aşan istek bizim kodumuza HİÇ ULAŞMIYOR, fonksiyon 500 dönüyor ve ekran
 *  "This page couldn't load" ile düşüyordu. Action'ın içindeki `try/catch`
 *  ve kibar hata mesajları hiç çalışmıyordu — çünkü hata onlardan ÖNCE
 *  oluyordu. Kullanıcı 2-4 MB'lık telefon fotoğrafı yüklemeye çalıştı ve
 *  her seferinde sayfayı çökertti.
 *
 *  Sınırı büyütmenin yolu `experimental.serverActions.bodySizeLimit` — ama
 *  anayasa deneysel özellik yasaklıyor. Route Handler o sınıra TABİ DEĞİL;
 *  sıradan bir HTTP ucu olarak gövdeyi okur. Üstelik hata yolu bizde kalır:
 *  her başarısızlık JSON hata KODU olarak döner, istisna olarak değil.
 *
 *  JETON SUNUCUDA KALIR: `BLOB_READ_WRITE_TOKEN` yalnız burada okunuyor.
 *  Bu dosya istemci paketine girmez; jeton tarayıcıya asla gitmez.
 *
 *  DOĞRULAMA İKİ KEZ: istemci hızlı geri bildirim için, sunucu KARAR için.
 *  Uç dışarıdan çağrılabilir; sınırlar burada yeniden ölçülür.
 * ============================================================================
 */

export const runtime = "nodejs";

type Sonuc = { hata?: EkHatasi | "YUKLENEMEDI" | "DEPO_YOK" | "COK_BUYUK" };

function hataDon(hata: Sonuc["hata"], durum = 200) {
  // DURUM KODU 200: hata İÇERİKTE taşınır. 4xx/5xx dönmek istemcide
  // "beklenmeyen çöküş" gibi ele alınmaya davetiye olurdu; burada her
  // sonuç OKUNABİLİR bir cevaptır.
  return NextResponse.json({ hata } satisfies Sonuc, { status: durum });
}

export async function POST(istek: Request) {
  try {
    await yetkiIste("iade.yaz");

    const govde = await istek.formData();
    const hedefTipi = String(govde.get("hedefTipi") ?? "");
    const hedefId = String(govde.get("hedefId") ?? "");
    const dosya = govde.get("dosya");

    if (!ekHedefiGecerliMi(hedefTipi)) return hataDon("HEDEF_GECERSIZ");
    if (!(dosya instanceof File)) return hataDon("DOSYA_BOS");

    const mevcutEkSayisi = await prisma.attachment.count({
      where: { targetType: hedefTipi, targetId: hedefId },
    });

    const hatalar = ekiDogrula({
      dosyaAdi: dosya.name,
      mimeType: dosya.type,
      sizeBytes: dosya.size,
      mevcutEkSayisi,
      hedefTipi,
    });
    if (hatalar.length > 0) return hataDon(hatalar[0]);

    /**
     * BLOB JETONU YOKSA SESSİZ BAŞARISIZLIK OLMAZ. "Yükledim" deyip hiçbir
     * şey yazmamak, kullanıcının kanıtını kaybettiğini aylar sonra
     * öğrenmesi demektir.
     */
    if (!process.env.BLOB_READ_WRITE_TOKEN) return hataDon("DEPO_YOK");

    const yol = ekYolu(hedefTipi, hedefId, dosya.name, Date.now());
    const yuklenen = await put(yol, dosya, {
      access: "public",
      addRandomSuffix: false,
      contentType: dosya.type,
    });

    const kullanici = await oturumdakiKullanici();
    await prisma.attachment.create({
      data: {
        targetType: hedefTipi,
        targetId: hedefId,
        blobPath: yuklenen.url,
        fileName: dosya.name,
        mimeType: dosya.type,
        sizeBytes: dosya.size,
        userId: kullanici?.id ?? null,
      },
    });

    revalidatePath("/iadeler");
    return NextResponse.json({} satisfies Sonuc);
  } catch (e) {
    /**
     * SON KALE: buraya kadar gelen HER hata kibar bir cevaba dönüşür.
     * İstisnanın dışarı taşması, ekranı error boundary'ye düşürür ve
     * kullanıcı "sayfa çöktü" görür — T5'te tam olarak bu yaşandı.
     */
    console.error("[ek] yükleme hatası:", e);
    return hataDon("YUKLENEMEDI");
  }
}

/** İstemcinin sınırı sunucudan okuyabilmesi için — tek kaynak. */
export async function GET() {
  return NextResponse.json({ sinirlar: EK_SINIRLARI });
}
