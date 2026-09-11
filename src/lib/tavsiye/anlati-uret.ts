import { llmMetniDogrula } from "@/lib/llm/dogrulama";
import { aktifSaglayici } from "@/lib/llm/saglayicilar";

import type { TavsiyeVeriPaketi } from "./veri-toplama";

/**
 * ============================================================================
 *  ÜRÜN TAVSİYESİ — LLM ANLATISI (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *  K-OZET ile AYNI güvenlik katmanını paylaşır (`@/lib/llm/dogrulama`,
 *  `@/lib/llm/saglayicilar`) — bu dosya yalnız BU ÖZELLİĞE özel sistem
 *  promptunu tanımlar ve seçili sağlayıcıyı çağırır.
 *
 *  ⛔ EK KURAL, K-OZET'TE YOK: "ALIM KAMPANYA DÖNGÜSÜNE BAĞLIDIR — FİYATIN
 *  YÖNÜ YOKTUR" (CLAUDE.md, mimar beyanı 02.09.2026). Model, iki alım
 *  arasındaki fiyat farkını ASLA bir "al/alma" sinyali olarak yorumlayamaz.
 *
 *  ⚠ BİLİNEN SINIR: bu kural `llmMetniDogrula` tarafından DOĞRULANAMAZ —
 *  kapı yalnız uydurma/serbest RAKAMI yakalar, doğru bir rakamın YANLIŞ
 *  YORUMLANMASINI değil. Yalnızca prompt disiplinine dayanır; arayüzdeki
 *  "bu bir öneridir" uyarısı bu artık riski görünür kılan ikinci katman.
 * ============================================================================
 */

const SISTEM_PROMPTU = `Sen bir Türk e-ticaret arbitraj işletmesinde, tek bir
ürünün geçmiş verisine bakarak alım tavsiyesi veren bir yardımcısın.
Okuyucu teknik değil, işi yöneten kişi.

KESİN KURALLAR:
- Sana verilen SAYI ANAHTARLARI dışında HİÇBİR rakam yazma. Hesap yapma,
  toplama, yüzde çıkarma, tahmin etme. Bir rakamı belirtmek istediğinde
  YALNIZ {{anahtar}} biçimini kullan — anahtarı SANA VERİLEN listeden HARF
  HARF, KISALTMADAN, HİÇBİR PARÇASINI ATLAMADAN kopyala. Emin değilsen o
  kalemden hiç bahsetme.
- Madde numarası KULLANMA ("1.", "2." gibi). Madde işareti gerekiyorsa "-"
  kullan. Tarih, yıl, gün sayısı gibi hiçbir rakamı DÜZ METİNLE yazma.
- Ürünün adını, SKU'sunu, barkodunu YAZMA — sana hiç verilmedi, zaten
  ekranda görünüyor.
- ⛔ FİYATIN YÖNÜ YOKTUR: son alım maliyeti yalnız bir GERÇEKTİR. Alım
  kampanya döngüsüne bağlıdır — iki alım arasındaki fiyat farkı bir
  SİNYAL DEĞİLDİR. "Fiyat yükseldi/düştü, bu yüzden alın/almayın" gibi
  bir YÖN yorumu ASLA kurma.
- Bu bir ÖNERİDİR, otomatik bir karar değildir. Kesin dille
  ("kesinlikle alın/almayın") yazma; nihai kararın işletme sahibine ait
  olduğu bir tonda, gerekçeli bir değerlendirme sun.
- Stok bağı şüpheli olarak işaretlenmişse, stok yaşı ve elde kalan
  maliyetle ilgili ifadelerini temkinli kur.
- Hiçbir konu için veri verilmemişse o konudan hiç bahsetme.
- Kısa, sade Türkçe. Kısa paragraflar.`;

function kullaniciMesaji(paket: TavsiyeVeriPaketi): string {
  const satirlar = paket.baglamlar
    .map((b) => {
      const sayi = paket.sayilar.find((s) => s.anahtar === b.anahtar);
      if (!sayi) return null;
      return `- ${b.aciklama}: {{${sayi.anahtar}}} (ham değer: ${sayi.ham})`;
    })
    .filter((s): s is string => s !== null)
    .join("\n");

  const supheNotu = paket.stokBagiSupheli
    ? "\n\nNOT: Bu ürünün stok bağlantısı şüpheli işaretli — stok yaşı ve elde kalan maliyetle ilgili ifadelerini temkinli kur."
    : "";

  return `Bu ürünün geçmiş verisi:
${satirlar}${supheNotu}

Bu verilere dayanarak, bu ürünün tekrar alınıp alınmaması konusunda kısa,
gerekçeli bir değerlendirme yaz. Her rakamı yalnız ilgili {{anahtar}} ile
işaret et.`;
}

export type TavsiyeSonucu =
  | {
      tamam: true;
      metin: string;
      saglayiciAdi: string;
      modelAdi: string;
      girdiTokenSayisi: number;
      ciktiTokenSayisi: number;
    }
  | {
      tamam: false;
      sebep: "ANAHTAR_YOK" | "API_HATASI" | "COZULMEYEN_ANAHTAR" | "SERBEST_SAYI";
      saglayiciAdi: string;
      modelAdi: string;
      detay?: string[];
    };

export async function tavsiyeUret(paket: TavsiyeVeriPaketi): Promise<TavsiyeSonucu> {
  const saglayici = aktifSaglayici();
  const saglayiciAdi = saglayici.ad;
  const modelAdi = saglayici.modelAdi;

  const anahtar = saglayici.anahtarOku();
  if (anahtar === null) {
    return { tamam: false, sebep: "ANAHTAR_YOK", saglayiciAdi, modelAdi };
  }

  const cevap = await saglayici.metinUret(
    SISTEM_PROMPTU,
    kullaniciMesaji(paket),
    anahtar,
  );
  if (!cevap.tamam) {
    return {
      tamam: false,
      sebep: cevap.sebep,
      saglayiciAdi,
      modelAdi,
      detay: cevap.detay,
    };
  }

  const dogrulama = llmMetniDogrula(cevap.ham, paket.sayilar);
  if (!dogrulama.tamam) {
    return {
      tamam: false,
      sebep: dogrulama.sebep,
      saglayiciAdi,
      modelAdi,
      detay: dogrulama.detay,
    };
  }

  return {
    tamam: true,
    metin: dogrulama.metin,
    saglayiciAdi,
    modelAdi,
    girdiTokenSayisi: cevap.girdiTokenSayisi,
    ciktiTokenSayisi: cevap.ciktiTokenSayisi,
  };
}
