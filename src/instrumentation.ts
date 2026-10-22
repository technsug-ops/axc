import type { Instrumentation } from "next";

/**
 * SUNUCU HATASI YAKALAMA (K353, 22.10.2026) — her sunucu hatası uygulamanın
 * kendi iz tablosuna yazılır; ekrandaki «Hata kodu» ile eşleşir. Görüldüğü yer:
 * Ayarlar → Gece bekçi turu → «Son sunucu hataları».
 * Yalnız Node çalışma ortamında (Prisma); kayıt gövdesi içeri gerektiğinde alınır.
 */
export const onRequestError: Instrumentation.onRequestError = async (hata, istek, baglam) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sunucuHatasiniKaydet } = await import("@/lib/hata/sunucu-hatasi-kaydi");
  await sunucuHatasiniKaydet(hata, { path: istek.path, method: istek.method }, baglam);
};
