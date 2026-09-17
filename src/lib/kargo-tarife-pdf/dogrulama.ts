/**
 * ============================================================================
 *  KARGO TARİFESİ PDF — SAF DOĞRULAMA (K202)
 * ----------------------------------------------------------------------------
 *  ⛔ İMKÂNSIZ GÖRÜNEN DEĞER ÖNCE DOĞRULANIR — DÜZELTİLMEZ. Ayrıştırma bir
 *  boşluk/mükerrer/ters sıra üretirse bu YAZILMAZ; kullanıcıya HATA olarak
 *  gösterilir ve o parti hiç önizlemeye gelmez. Aykırı değer uydurularak
 *  "düzeltilmez" — ekran HATA kodunu gösterir, insan PDF'e bakar.
 * ============================================================================
 */

export type DesiSiraSonucu =
  | { tamam: true }
  | {
      tamam: false;
      kod: "MUKERRER_DESI" | "SIRA_BOZUK" | "DESI_BOSLUGU";
      ayrinti: string;
    };

/** Desi sütununun 0'dan başlayıp ARALIKSIZ arttığını doğrular. */
export function desiDizisiniDogrula(desiler: number[]): DesiSiraSonucu {
  for (let i = 1; i < desiler.length; i++) {
    const onceki = desiler[i - 1]!;
    const su = desiler[i]!;
    if (su === onceki) {
      return {
        tamam: false,
        kod: "MUKERRER_DESI",
        ayrinti: `desi=${su} birden fazla kez görüldü (satır sırası ${i})`,
      };
    }
    if (su < onceki) {
      return {
        tamam: false,
        kod: "SIRA_BOZUK",
        ayrinti: `desi ${onceki} → ${su} (küçüldü, satır sırası ${i})`,
      };
    }
    if (su - onceki > 1) {
      return {
        tamam: false,
        kod: "DESI_BOSLUGU",
        ayrinti: `desi ${onceki} ile ${su} arasında ${su - onceki - 1} satır eksik`,
      };
    }
  }
  return { tamam: true };
}

/**
 * TAŞIYICI BAŞINA AZALAN FİYAT UYARISI — SOFT, ENGELLEMEZ.
 * Kargo tarifeleri neredeyse hep desi arttıkça artar; bir düşüş imkânsız
 * değildir (kanalın kendi kampanya/indirim kararı olabilir) ama görülmeye
 * değerdir — kullanıcı önizlemede görür, karar kendisinindir.
 */
export function monotonlukUyarilari(
  satirlar: { desi: number; degerler: { ad: string; tutar: number }[] }[],
): string[] {
  const sonDeger = new Map<string, { desi: number; tutar: number }>();
  const uyarilar: string[] = [];
  for (const s of satirlar) {
    for (const d of s.degerler) {
      const onceki = sonDeger.get(d.ad);
      if (onceki !== undefined && d.tutar < onceki.tutar - 0.005) {
        uyarilar.push(
          `${d.ad}: desi=${s.desi} tutarı ₺${d.tutar.toFixed(2)}, desi=${onceki.desi} tutarından (₺${onceki.tutar.toFixed(2)}) düşük`,
        );
      }
      sonDeger.set(d.ad, { desi: s.desi, tutar: d.tutar });
    }
  }
  return uyarilar;
}
