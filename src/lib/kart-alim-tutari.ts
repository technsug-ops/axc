import { alimKartTutari, faturaOku } from "@/lib/alim-maliyeti";

/**
 * ============================================================================
 *  BİR ALIMIN KARTA YAZILAN TUTARI — TEK GÖVDE (K308, 29.09.2026 → K309)
 * ----------------------------------------------------------------------------
 *  Kart borcunu kuran dört yer (kart borcu ekranı · panel özeti · nakit
 *  takvimi · geçmiş ekstre) alım tutarını AYRI AYRI hesaplıyordu: ikisi
 *  kargo ve vergi alanlarını EKLİYOR, ikisi eklemiyordu. Aynı alım iki
 *  ekranda iki farklı borç gösterebilirdi. _(Anayasa: "iki yerde iki ölçüt
 *  olmaz".)_
 *
 *  ⛔ ESKİ KARAR (K308, 29.09.2026) — SİLİNMEDİ, ÇEVRİLDİ:
 *  _«alımda sadece alım tutarı var; kargo, vergi hepsi o tutarın içinde»_ →
 *  tutar = Σ birim × adet, kargo/vergi alanları HİÇ eklenmez. O gün doğruydu:
 *  alanlar hiç yazılmıyordu (625/625 boş) ve eklemek, fiyatın içindeki KDV'yi
 *  ikinci kez saymak olurdu.
 *
 *  ⭐ ÇEVİREN KARAR (K309, 30.09.2026): _«hep bu şekilde olmaz — toptan alımda
 *  KDV ve kargo ayrı yazılabilir.»_ Alım artık fatura yapısını TAŞIYOR
 *  (`fiyatKdvDahil` · `kargoDahil`). Kural «ASLA ekleme» değil **«AYRI
 *  yazılmışsa ekle»**: KDV yalnız hariç alımda, kargo yalnız ayrı iken eklenir;
 *  dahil alımda (bütün eski alımlar) tutar AYNEN Σ birim × adet kalır —
 *  K308'in koruduğu çift sayım hâlâ imkânsız. Gümrük karta YAZILMAZ.
 *  Hesap `lib/alim-maliyeti.ts`te; burası kart kurucularının tek kapısı.
 * ============================================================================
 */
export function kartAlimTutari(
  alim: Parameters<typeof faturaOku>[0],
  kalemler: { quantity: number; unitCostAmount: { toString(): string }; unitCostCurrency: string }[],
  paraBirimi: string,
): { tutar: number; farkliVar: boolean } {
  return alimKartTutari(
    faturaOku(alim),
    kalemler.map((k, i) => ({
      anahtar: String(i),
      adet: k.quantity,
      birim: Number(k.unitCostAmount.toString()),
      paraBirimi: k.unitCostCurrency,
    })),
    paraBirimi,
  );
}
