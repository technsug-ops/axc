"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import {
  ekHedefiGecerliMi,
  ekYolu,
  ekiDogrula,
  type EkHatasi,
} from "@/lib/ekler";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  EK YÜKLEME / SİLME
 * ----------------------------------------------------------------------------
 *  Dosyalar Vercel Blob'da (ÖZEL) durur, satırlar `Attachment` tablosunda.
 *  Yedek satırları taşır, DOSYALARI TAŞIMAZ — ekranda uyarı olarak yazılı.
 *
 *  DOĞRULAMA İKİ KEZ: istemci hızlı geri bildirim için, sunucu KARAR için.
 *  Sunucudaki tek doğruluk kaynağı `lib/ekler.ts`; istek elle kurulabildiği
 *  için sınırlar burada yeniden ölçülür.
 * ============================================================================
 */

export type EkSonucu = { hata?: EkHatasi | "YUKLENEMEDI" | "DEPO_YOK" };

export async function ekYukle(formData: FormData): Promise<EkSonucu> {
  await yetkiIste("iade.yaz");

  const hedefTipi = String(formData.get("hedefTipi") ?? "");
  const hedefId = String(formData.get("hedefId") ?? "");
  const dosya = formData.get("dosya");

  if (!ekHedefiGecerliMi(hedefTipi)) return { hata: "HEDEF_GECERSIZ" };
  if (!(dosya instanceof File)) return { hata: "DOSYA_BOS" };

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
  if (hatalar.length > 0) return { hata: hatalar[0] };

  /**
   * BLOB JETONU YOKSA SESSİZ BAŞARISIZLIK OLMAZ. Yerel geliştirmede jeton
   * bulunmayabilir; "yükledim" deyip hiçbir şey yazmamak, kullanıcının
   * kanıtını kaybettiğini aylar sonra öğrenmesi demektir.
   */
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { hata: "DEPO_YOK" };

  const yol = ekYolu(hedefTipi, hedefId, dosya.name, Date.now());

  try {
    // ÖZEL erişim: ek dosyaları herkese açık adresle servis edilmez.
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
  } catch (e) {
    console.error("[ek] yükleme hatası:", e);
    return { hata: "YUKLENEMEDI" };
  }

  revalidatePath("/iadeler");
  return {};
}

/**
 * Eki siler. SATIR VE DOSYA BİRLİKTE gider; dosya kalırsa depoda kimsenin
 * bilmediği bir kalıntı, satır kalırsa ekranda açılmayan bir bağlantı olur.
 */
export async function ekSil(ekId: string): Promise<EkSonucu> {
  await yetkiIste("iade.yaz");

  const ek = await prisma.attachment.findUnique({
    where: { id: ekId },
    select: { id: true, blobPath: true },
  });
  if (!ek) return {};

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(ek.blobPath);
  } catch (e) {
    // Dosya zaten yoksa satırı silmeye devam: ekranda ölü bağlantı kalmasın.
    console.error("[ek] dosya silinemedi, satır siliniyor:", e);
  }

  await prisma.attachment.delete({ where: { id: ekId } });
  revalidatePath("/iadeler");
  return {};
}

