import { anthropicSaglayici } from "./anthropic";
import { openaiSaglayici } from "./openai";
import { geminiSaglayici } from "./gemini";
import { ikiKatmanliAnahtarOku } from "./ortak-anahtar";
import type { LlmSaglayici } from "./tipler";

export type { LlmCevap, LlmSaglayici } from "./tipler";

/**
 * ============================================================================
 *  SAĞLAYICI SEÇİMİ — `OZET_LLM_SAGLAYICI` ORTAM DEĞİŞKENİ
 * ----------------------------------------------------------------------------
 *  Mimar kararı 11.09.2026: "Taban olarak ChatGPT ve Gemini altyapısı
 *  olmalı, istediğimi kullanabilmeliyim." Değer `.env.canli`ye (yerelde)
 *  ya da Vercel ortam değişkenlerine (canlıda) yazılır:
 *
 *      OZET_LLM_SAGLAYICI=openai     (varsayılan)
 *      OZET_LLM_SAGLAYICI=gemini
 *      OZET_LLM_SAGLAYICI=anthropic
 *
 *  ⚠ VARSAYILAN `openai` — mimarın "taban ChatGPT ve Gemini" cümlesinde
 *  ilk andığı sağlayıcı. Değiştirmek TEK SATIRLIK bir ortam değişkeni işi,
 *  kod değişikliği gerekmez.
 * ============================================================================
 */
const SAGLAYICILAR: Record<LlmSaglayici["ad"], LlmSaglayici> = {
  openai: openaiSaglayici,
  gemini: geminiSaglayici,
  anthropic: anthropicSaglayici,
};

const VARSAYILAN_SAGLAYICI: LlmSaglayici["ad"] = "openai";

/**
 * ⚠ İKİ KATMANLI OKUMA — API anahtarlarıyla AYNI desen. `OZET_LLM_SAGLAYICI`
 * yalnız süreç ortamına bakılsaydı, `.env.canli`ye yazan (yerel geliştirme)
 * hiçbir zaman etkisini göremezdi — anahtar seçimi ile sağlayıcı seçimi
 * FARKLI kurallarla okunursa biri diğerini sessizce geçersiz kılardı.
 */
export function aktifSaglayici(): LlmSaglayici {
  const secim = (ikiKatmanliAnahtarOku("OZET_LLM_SAGLAYICI") ??
    VARSAYILAN_SAGLAYICI) as LlmSaglayici["ad"];
  return SAGLAYICILAR[secim] ?? SAGLAYICILAR[VARSAYILAN_SAGLAYICI];
}
