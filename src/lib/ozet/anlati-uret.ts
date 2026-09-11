import { ozetMetniDogrula } from "./dogrulama";
import { aktifSaglayici } from "./saglayicilar";
import type { OzetVeriPaketi } from "./veri-toplama";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET — LLM ANLATISI (K-OZET)
 * ----------------------------------------------------------------------------
 *  ⛔ BU DEPODAKİ İLK ÜCRETLİ LLM ENTEGRASYONU. Anayasanın "kaynağı
 *  yazılmayan sayı kullanılamaz" kuralı gereği model rakam ÜRETMEZ, yalnız
 *  `veri-toplama.ts`'in ürettiği DOĞRULANMIŞ sayıları `{{anahtar}}` yer
 *  tutucusuyla işaret eder. Gerçek metne dönüşüm ve GÜVENLİK KAPISI
 *  `dogrulama.ts`'te — bu dosya yalnız SEÇİLİ sağlayıcıyı çağırır, hüküm
 *  vermez.
 *
 *  ⚠ SAĞLAYICI SEÇİLEBİLİR (mimar kararı 11.09.2026) — bkz.
 *  `saglayicilar/index.ts`. Bu dosya hangi sağlayıcının aktif olduğunu
 *  BİLMEZ, yalnız `LlmSaglayici` arayüzünü çağırır; ekleme/çıkarma bu
 *  dosyaya hiç dokunmaz.
 * ============================================================================
 */

/**
 * SİSTEM PROMPTU — RAKAM YASAĞI EN BAŞTA VE AÇIKÇA.
 *
 * ⚠ MADDE NUMARASI YASAK: "1. ... 2. ..." biçimi kendi başına serbest-sayı
 * taramasına takılıp doğru bir metni bile reddettirir — yasaklamak, hem
 * güvenli hem ucuz (yeniden deneme gerektirmiyor).
 * ⚠ TARİH/YIL YASAK: aynı gerekçe — kaynağı olmayan bir yıl da rakamdır.
 */
const SISTEM_PROMPTU = `Sen bir Türk e-ticaret arbitraj işletmesinin günlük
özetini yazan bir yardımcısın. Okuyucu teknik değil, işi yöneten kişi.

KESİN KURALLAR:
- Sana verilen SAYI ANAHTARLARI dışında HİÇBİR rakam yazma. Hesap yapma,
  toplama, yüzde çıkarma, tahmin etme. Bir rakamı belirtmek istediğinde
  YALNIZ {{anahtar}} biçimini kullan — anahtarı SANA VERİLEN listeden HARF
  HARF, KISALTMADAN, HİÇBİR PARÇASINI ATLAMADAN kopyala (ör. anahtar
  "kartborcu_acik_TRY" ise "kartborcu_acik" YAZMA — sonundaki para birimi
  eki de anahtarın PARÇASIDIR). Emin değilsen o kalemden hiç bahsetme.
- Madde numarası KULLANMA ("1.", "2." gibi). Madde işareti gerekiyorsa "-"
  kullan.
- Tarih, yıl, gün sayısı gibi hiçbir rakamı DÜZ METİNLE yazma.
- Önem sırası KIRMIZI → AMBER → NÖTR. Her kalemin önem etiketi sana
  verilmiştir; kendi kafandan önem çıkarma.
- Kısa, sade Türkçe. Kısa paragraflar. Sıradan bir gün için de kısa ve
  sakin bir özet yaz — panik yaratma.
- Hiçbir konu için veri verilmemişse o konudan hiç bahsetme.`;

function kullaniciMesaji(paket: OzetVeriPaketi): string {
  const baglamMetni = paket.baglamlar
    .map((b) => {
      const buSayilar = paket.sayilar.filter(
        (s) => s.anahtar === b.anahtar || s.anahtar.startsWith(b.anahtar + "_"),
      );
      const anahtarListesi = buSayilar
        .map((s) => `{{${s.anahtar}}} (ham değer: ${s.ham})`)
        .join(", ");
      return `- [${b.onem.toUpperCase()}] ${b.baslik} — kullanılabilir anahtar(lar): ${anahtarListesi}`;
    })
    .join("\n");

  return `Tarih: ${paket.isGunu}

Bugünkü sinyaller:
${baglamMetni || "(bugün hiçbir kalem yok — her şey temiz)"}

Yukarıdaki kalemleri önem sırasına göre, kısa ve sakin bir Türkçe metinle
anlat. Her rakamı yalnız ilgili {{anahtar}} ile işaret et.`;
}

export type AnlatiSonucu =
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

export async function anlatiUret(paket: OzetVeriPaketi): Promise<AnlatiSonucu> {
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

  const dogrulama = ozetMetniDogrula(cevap.ham, paket.sayilar);
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
