"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { type EkHatasi } from "@/lib/ekler";
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

/**
 * ⚠ EK YÜKLEME BURADA DEĞİL — `src/app/api/ekler/route.ts` içinde.
 *
 * 14.08.2026 (T5): yükleme bu dosyada bir Server Action'dı ve canlıda sayfayı
 * çökertiyordu. Server Action gövdesi varsayılan 1 MB ile sınırlı; sınır
 * ÇERÇEVE KATMANINDA uygulandığı için 2-4 MB'lık telefon fotoğrafı buradaki
 * `try/catch`e HİÇ ULAŞMIYOR, fonksiyon 500 dönüyordu. Kibar hata mesajı
 * yazmak çözmüyordu — hata mesajdan önce oluyordu.
 *
 * Yükleme Route Handler'a taşındı (o sınıra tabi değil). Burada YALNIZ silme
 * kaldı: gövdesi küçük, Server Action'a uygun.
 */

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

