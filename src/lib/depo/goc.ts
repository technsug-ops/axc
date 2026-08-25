import { kodSablonaUyuyorMu } from "@/lib/depo/sablon";

/**
 * ============================================================================
 *  RAF GÖÇÜ — SAF KURAL (K50 ⑦)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 25.08.2026: etiketler HENÜZ YAPIŞTIRILMADI, o yüzden
 *  _"hepsi yeni şablonla baştan üretilir, eskiler boşaltılır"_ yolu seçildi.
 *
 *  ⚠ AMA KOD YENİDEN ADLANDIRILMAZ — K50'nin kendi kuralı: _"kod yeniden
 *  düzenleme YOK; düzen değişimi = yeni raf aç + TAŞI + boşalanı sil."_
 *  Yeniden adlandırma kimlik kıyımıdır: konum geçmişi kopar ve o rafa dair
 *  her eski kayıt sahipsiz kalır.
 *
 *  ⚠ EŞLEŞTİRMEYİ SİSTEM YAPAMAZ. `A5`in fiziksel olarak hangi yeni rafa
 *  denk geldiğini yalnız DEPOYU BİLEN kişi söyleyebilir. Sistem tahmin
 *  ederse 1090 ürünün konumu sessizce yanlışa döner ve kimse fark etmez.
 *  Bu yüzden eşleme ELLE kurulur, ekran yalnız hazırlar ve sayar.
 * ============================================================================
 */

export type KaynakRaf = {
  id: string;
  kod: string;
  ad: string | null;
  /** O rafa kayıtlı aktif varyant sayısı — taşınacak olan bu. */
  varyant: number;
};

export type HedefRaf = { id: string; kod: string };

/** Bir kaynak rafın hedefi — `null` = bu tur taşınmayacak. */
export type Esleme = { kaynakId: string; hedefId: string | null };

export type GocPlani = {
  /** Eşleştirilmiş ve gerçekten taşınacak satırlar. */
  tasinacak: { kaynak: KaynakRaf; hedefKod: string }[];
  /** Eşleştirilmemiş kaynaklar — dokunulmayacak. */
  atlanacak: KaynakRaf[];
  /** Toplam taşınacak varyant — "önce/sonra sayım"ın ÖNCE tarafı. */
  varyantToplami: number;
  hatalar: GocHatasi[];
};

export type GocHatasi =
  | { tur: "HEDEF_SABLONA_UYMUYOR"; kod: string }
  | { tur: "HEDEF_TEKRAR"; kod: string }
  | { tur: "KAYNAK_HEDEF_AYNI"; kod: string };

/**
 * ESKİ RAF NEDİR — ŞABLONA UYMAYAN.
 *
 * ⚠ ÖLÇÜT "ADI ESKİ GÖRÜNÜYOR" DEĞİL, ŞABLONA UYMAMAK. Göz kararı bir
 * ölçüt değildir; `A5` ile `RAF-OFIS1-2` arasındaki fark deseni sınayarak
 * belirlenir, bakarak değil.
 */
export function eskiRaflar<T extends { kod: string }>(hepsi: readonly T[]): T[] {
  return hepsi.filter((r) => !kodSablonaUyuyorMu(r.kod));
}

export function yeniRaflar<T extends { kod: string }>(hepsi: readonly T[]): T[] {
  return hepsi.filter((r) => kodSablonaUyuyorMu(r.kod));
}

/**
 * PLANI KUR — TAŞIMADAN ÖNCE NE OLACAĞINI SÖYLER.
 *
 * ⚠ İKİ KAYNAK AYNI HEDEFE GÖNDERİLEMEZ. Teknik olarak mümkün ama neredeyse
 * her zaman bir yazım hatasıdır: iki fiziksel raf tek rafa çökerse ürünler
 * karışır ve geri almanın yolu yoktur. Engel değil HATA olarak dönüyor;
 * kullanıcı gerçekten istiyorsa iki turda yapar.
 */
export function gocPlani(
  kaynaklar: readonly KaynakRaf[],
  hedefler: readonly HedefRaf[],
  eslemeler: readonly Esleme[],
): GocPlani {
  const hedefKodu = new Map(hedefler.map((h) => [h.id, h.kod]));
  const kaynakKodu = new Map(kaynaklar.map((k) => [k.id, k.kod]));

  const tasinacak: GocPlani["tasinacak"] = [];
  const atlanacak: KaynakRaf[] = [];
  const hatalar: GocHatasi[] = [];
  const kullanilanHedef = new Set<string>();

  for (const kaynak of kaynaklar) {
    const esleme = eslemeler.find((e) => e.kaynakId === kaynak.id);
    if (!esleme || !esleme.hedefId) {
      atlanacak.push(kaynak);
      continue;
    }

    if (esleme.hedefId === kaynak.id) {
      hatalar.push({ tur: "KAYNAK_HEDEF_AYNI", kod: kaynak.kod });
      continue;
    }

    const hedef = hedefKodu.get(esleme.hedefId);
    if (!hedef || !kodSablonaUyuyorMu(hedef)) {
      hatalar.push({
        tur: "HEDEF_SABLONA_UYMUYOR",
        kod: hedef ?? kaynakKodu.get(esleme.hedefId) ?? esleme.hedefId,
      });
      continue;
    }

    if (kullanilanHedef.has(esleme.hedefId)) {
      hatalar.push({ tur: "HEDEF_TEKRAR", kod: hedef });
      continue;
    }
    kullanilanHedef.add(esleme.hedefId);
    tasinacak.push({ kaynak, hedefKod: hedef });
  }

  return {
    tasinacak,
    atlanacak,
    varyantToplami: tasinacak.reduce((t, x) => t + x.kaynak.varyant, 0),
    hatalar,
  };
}

/**
 * ÖNCE/SONRA SAYIM TUTUYOR MU (K50 ⑦ şartı).
 *
 * ⚠ TAŞIMADA ÜRÜN BAĞI KAYBOLMAMALI ve bu VARSAYILMAZ, SAYILIR. Taşımadan
 * önceki toplam ile sonraki toplam eşit değilse bir bağ düşmüş demektir —
 * ve düşen bağ, ürünü "rafsız" bırakır: depoda aranır, bulunamaz.
 */
export function sayimTutuyorMu(once: number, sonra: number): boolean {
  return once === sonra;
}
