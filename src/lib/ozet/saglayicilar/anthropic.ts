import Anthropic from "@anthropic-ai/sdk";

import { ikiKatmanliAnahtarOku } from "./ortak-anahtar";
import type { LlmCevap, LlmSaglayici } from "./tipler";

/**
 * ⚠ MODEL ADI DOĞRULANMADI — `OZET_ANTHROPIC_MODEL` İLE EZİLEBİLİR.
 * Bu depoyu üreten oturumun kendi model tablosundan alındı (11.09.2026).
 */
const MODEL_VARSAYILAN = "claude-haiku-4-5-20251001";
const MAX_TOKEN = 1500;

const MODEL = process.env.OZET_ANTHROPIC_MODEL?.trim() || MODEL_VARSAYILAN;

async function metinUret(
  sistemPromptu: string,
  kullaniciMesaji: string,
  anahtar: string,
): Promise<LlmCevap> {
  const client = new Anthropic({ apiKey: anahtar });
  try {
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKEN,
      system: sistemPromptu,
      messages: [{ role: "user", content: kullaniciMesaji }],
    });
    const ham = yanit.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      tamam: true,
      ham,
      girdiTokenSayisi: yanit.usage.input_tokens,
      ciktiTokenSayisi: yanit.usage.output_tokens,
    };
  } catch (e) {
    return { tamam: false, sebep: "API_HATASI", detay: [(e as Error).message] };
  }
}

export const anthropicSaglayici: LlmSaglayici = {
  ad: "anthropic",
  modelAdi: MODEL,
  anahtarOku: () => ikiKatmanliAnahtarOku("ANTHROPIC_API_KEY"),
  metinUret,
};
