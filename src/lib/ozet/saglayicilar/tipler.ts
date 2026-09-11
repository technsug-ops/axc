/**
 * ============================================================================
 *  LLM SAĞLAYICI ARAYÜZÜ — GÜNLÜK ÖZET (K-OZET)
 * ----------------------------------------------------------------------------
 *  ⚠ MİMAR KARARI 11.09.2026: "Taban olarak ChatGPT ve Gemini altyapısı
 *  olmalı, istediğimi kullanabilmeliyim." Bu yüzden tek bir sağlayıcıya
 *  (yalnız Anthropic) kilitlenmek yerine üç sağlayıcı da aynı arayüzün
 *  arkasında duruyor ve hangisinin kullanılacağı BİR ORTAM DEĞİŞKENİYLE
 *  seçiliyor (`OZET_LLM_SAGLAYICI`).
 *
 *  ⚠ GÜVENLİK KATMANI (dogrulama.ts) SAĞLAYICIDAN TAMAMEN BAĞIMSIZ — yalnız
 *  düz metin çıktısını görür, hangi API'den geldiğini bilmez/bilmesi de
 *  gerekmez. Sağlayıcı değişse bile "kaynağı yazılmayan sayı kullanılamaz"
 *  garantisi AYNI kalır.
 * ============================================================================
 */
export type LlmCevap =
  | {
      tamam: true;
      ham: string;
      girdiTokenSayisi: number;
      ciktiTokenSayisi: number;
    }
  | {
      tamam: false;
      sebep: "ANAHTAR_YOK" | "API_HATASI";
      detay?: string[];
    };

export type LlmSaglayici = {
  ad: "anthropic" | "openai" | "gemini";
  modelAdi: string;
  anahtarOku(): string | null;
  metinUret(
    sistemPromptu: string,
    kullaniciMesaji: string,
    anahtar: string,
  ): Promise<LlmCevap>;
};
