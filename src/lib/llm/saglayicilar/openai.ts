import OpenAI from "openai";

import { ikiKatmanliAnahtarOku } from "./ortak-anahtar";
import type { LlmCevap, LlmSaglayici } from "./tipler";

/**
 * ⚠ MODEL ADI DOĞRULANMADI, YALNIZ ARAŞTIRILDI — `OZET_OPENAI_MODEL` İLE
 * EZİLEBİLİR. OpenAI'ın kendi API belgesinden (11.09.2026) en ucuz katman
 * olarak okundu; bu depoyu üreten oturumun EĞİTİM KESİM TARİHİ bu isimden
 * önce olduğu için ADI DOĞRULAYAMADI — çalışmazsa ortam değişkeniyle
 * güncel bir model adı yazın.
 */
const MODEL_VARSAYILAN = "gpt-5.6-luna";
const MAX_TOKEN = 1500;

const MODEL = process.env.OZET_OPENAI_MODEL?.trim() || MODEL_VARSAYILAN;

async function metinUret(
  sistemPromptu: string,
  kullaniciMesaji: string,
  anahtar: string,
): Promise<LlmCevap> {
  const client = new OpenAI({ apiKey: anahtar });
  try {
    const yanit = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_TOKEN,
      messages: [
        { role: "system", content: sistemPromptu },
        { role: "user", content: kullaniciMesaji },
      ],
    });
    const ham = yanit.choices[0]?.message?.content ?? "";
    return {
      tamam: true,
      ham,
      girdiTokenSayisi: yanit.usage?.prompt_tokens ?? 0,
      ciktiTokenSayisi: yanit.usage?.completion_tokens ?? 0,
    };
  } catch (e) {
    return { tamam: false, sebep: "API_HATASI", detay: [(e as Error).message] };
  }
}

export const openaiSaglayici: LlmSaglayici = {
  ad: "openai",
  modelAdi: MODEL,
  anahtarOku: () => ikiKatmanliAnahtarOku("OPENAI_API_KEY"),
  metinUret,
};
