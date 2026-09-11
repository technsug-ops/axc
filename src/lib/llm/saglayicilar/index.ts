import { anthropicSaglayici } from "./anthropic";
import { openaiSaglayici } from "./openai";
import { geminiSaglayici } from "./gemini";
import { ikiKatmanliAnahtarOku } from "./ortak-anahtar";
import type { LlmSaglayici } from "./tipler";

export type { LlmCevap, LlmSaglayici } from "./tipler";
export { ikiKatmanliAnahtarOku } from "./ortak-anahtar";

/**
 * ============================================================================
 *  SAĞLAYICI SEÇİMİ — `LLM_SAGLAYICI` ORTAM DEĞİŞKENİ
 * ----------------------------------------------------------------------------
 *  Mimar kararı 11.09.2026: "Taban olarak ChatGPT ve Gemini altyapısı
 *  olmalı, istediğimi kullanabilmeliyim." Değer `.env.canli`ye (yerelde)
 *  ya da Vercel ortam değişkenlerine (canlıda) yazılır:
 *
 *      LLM_SAGLAYICI=openai     (varsayılan)
 *      LLM_SAGLAYICI=gemini
 *      LLM_SAGLAYICI=anthropic
 *
 *  ⚠ VARSAYILAN `openai` — mimarın "taban ChatGPT ve Gemini" cümlesinde
 *  ilk andığı sağlayıcı. Değiştirmek TEK SATIRLIK bir ortam değişkeni işi,
 *  kod değişikliği gerekmez.
 *
 *  ⚠ AD DEĞİŞTİ (K-TAVSIYE, 11.09.2026) — ESKİ ADI `OZET_LLM_SAGLAYICI`İDİ.
 *  Bu katman artık K-OZET (günlük özet) ile K-TAVSIYE (ürün tavsiyesi)
 *  arasında PAYLAŞILIYOR; adında tek bir özelliğin (K-OZET) izini taşıması
 *  "belge yalanı" olurdu — hangisinin sağlayıcıyı yönettiği yanlış anlaşılır.
 *  ⚠ GERİYE UYUM BİLEREK KORUNDU: `LLM_SAGLAYICI` bulunamazsa eski
 *  `OZET_LLM_SAGLAYICI` okunur — mimarın bugün `.env.canli`'ye yazdığı
 *  değer sessizce bozulmasın diye (İlke #5: sessiz başarısızlık yasak).
 * ============================================================================
 */
const SAGLAYICILAR: Record<LlmSaglayici["ad"], LlmSaglayici> = {
  openai: openaiSaglayici,
  gemini: geminiSaglayici,
  anthropic: anthropicSaglayici,
};

const VARSAYILAN_SAGLAYICI: LlmSaglayici["ad"] = "openai";

/**
 * ⚠ İKİ KATMANLI OKUMA — API anahtarlarıyla AYNI desen. `LLM_SAGLAYICI`
 * yalnız süreç ortamına bakılsaydı, `.env.canli`ye yazan (yerel geliştirme)
 * hiçbir zaman etkisini göremezdi — anahtar seçimi ile sağlayıcı seçimi
 * FARKLI kurallarla okunursa biri diğerini sessizce geçersiz kılardı.
 */
export function aktifSaglayici(): LlmSaglayici {
  const secim = (ikiKatmanliAnahtarOku("LLM_SAGLAYICI") ??
    ikiKatmanliAnahtarOku("OZET_LLM_SAGLAYICI") ??
    VARSAYILAN_SAGLAYICI) as LlmSaglayici["ad"];
  return SAGLAYICILAR[secim] ?? SAGLAYICILAR[VARSAYILAN_SAGLAYICI];
}
