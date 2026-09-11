import { GoogleGenAI } from "@google/genai";

import { ikiKatmanliAnahtarOku } from "./ortak-anahtar";
import type { LlmCevap, LlmSaglayici } from "./tipler";

/**
 * ⚠ MODEL ADI DOĞRULANMADI, YALNIZ ARAŞTIRILDI — `OZET_GEMINI_MODEL` İLE
 * EZİLEBİLİR. Google'ın kendi API belgesinden (11.09.2026, ai.google.dev)
 * en ucuz "flash-lite" katmanı olarak okundu; bu depoyu üreten oturumun
 * EĞİTİM KESİM TARİHİ bu isimden önce olduğu için ADI DOĞRULAYAMADI —
 * çalışmazsa ortam değişkeniyle güncel bir model adı yazın.
 */
const MODEL_VARSAYILAN = "gemini-3.5-flash-lite";
const MAX_TOKEN = 1500;

const MODEL = process.env.OZET_GEMINI_MODEL?.trim() || MODEL_VARSAYILAN;

async function metinUret(
  sistemPromptu: string,
  kullaniciMesaji: string,
  anahtar: string,
): Promise<LlmCevap> {
  const client = new GoogleGenAI({ apiKey: anahtar });
  try {
    const yanit = await client.models.generateContent({
      model: MODEL,
      contents: kullaniciMesaji,
      config: {
        systemInstruction: sistemPromptu,
        maxOutputTokens: MAX_TOKEN,
      },
    });
    return {
      tamam: true,
      ham: yanit.text ?? "",
      girdiTokenSayisi: yanit.usageMetadata?.promptTokenCount ?? 0,
      ciktiTokenSayisi: yanit.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (e) {
    return { tamam: false, sebep: "API_HATASI", detay: [(e as Error).message] };
  }
}

export const geminiSaglayici: LlmSaglayici = {
  ad: "gemini",
  modelAdi: MODEL,
  anahtarOku: () => ikiKatmanliAnahtarOku("GEMINI_API_KEY"),
  metinUret,
};
