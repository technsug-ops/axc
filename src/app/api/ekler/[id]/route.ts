import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  EK İNDİRME — ÖZEL DOSYA, OTURUM KONTROLÜYLE
 * ----------------------------------------------------------------------------
 *  Ek dosyaları PRIVATE bir Blob deposunda duruyor: itiraz kanıtı, müşteri
 *  fotoğrafı, fatura. Tahmin edilebilir bir adresle herkese açık servis
 *  edilmemeli — bu yüzden dosyaya doğrudan bağlantı verilmiyor, akış
 *  buradan geçiyor ve önce yetki soruluyor.
 *
 *  14.08.2026 (T5): eskiden `access: "public"` ile yüklenmeye çalışılıyor ve
 *  depo özel olduğu için her yükleme patlıyordu. Doğru tercih özeldir; o
 *  zaman okuma yolu da bize ait olmak zorunda.
 *
 *  HATA YOLU KİBAR: dosya yoksa 404, yetki yoksa `yetkiIste` karar verir,
 *  depo erişilemezse 502 — hiçbiri istisna olarak dışarı taşmaz.
 * ============================================================================
 */

export const runtime = "nodejs";

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Eki GÖRMEK için okuma izni yeter; yazma izni aranmaz.
  await yetkiIste("iade.gor");

  const { id } = await params;

  const ek = await prisma.attachment.findUnique({
    where: { id },
    select: { blobPath: true, fileName: true, mimeType: true },
  });
  if (!ek) return new NextResponse(null, { status: 404 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const sonuc = await get(ek.blobPath, { access: "private" });
    if (!sonuc) return new NextResponse(null, { status: 404 });

    /**
     * `inline`: fotoğraf ve PDF tarayıcıda açılsın, indirme zorlanmasın.
     * Dosya adı tırnak içinde ve ayraçsız — başlığı bozmasın.
     */
    const guvenliAd = ek.fileName.replace(/["\r\n]/g, "_");
    return new NextResponse(sonuc.stream, {
      headers: {
        "Content-Type": ek.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${guvenliAd}"`,
        // ÖZEL DOSYA ÖNBELLEĞE ALINMAZ: paylaşılan bir vekil sunucuda
        // kalırsa yetkisiz birine servis edilebilirdi.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[ek] okuma hatası:", e);
    return new NextResponse(null, { status: 502 });
  }
}
