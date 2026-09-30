/**
 * ============================================================================
 *  ALIMIN FATURA YAPISI — FORM OKUMA (K309, 30.09.2026)
 * ----------------------------------------------------------------------------
 *  «Fiyat KDV dahil mi» ve «kargo fiyata dahil mi» bayrakları tedarikçide
 *  (varsayılan) ve alımda (snapshot) durur.
 *
 *  ⛔ İŞARETSİZ ONAY KUTUSU FORMDA HİÇ GÖNDERİLMEZ. «Alan yok = hayır»
 *  okunsaydı, kutuyu ÇİZMEYEN her form (ör. yalnız adı düzelten satır)
 *  bayrağı sessizce «KDV hariç»e çevirirdi. Bu yüzden ekran değeri her zaman
 *  gizli alanla AÇIKÇA gönderir ("1"/"0") ve burada üç hâl ayrılır:
 *     "1" → true · "0" → false · alan YOK → `undefined` (dokunma)
 * ============================================================================
 */
export function bayrakOku(formData: FormData, ad: string): boolean | undefined {
  const deger = formData.get(ad);
  if (deger === null) return undefined;
  return String(deger) === "1";
}

/** Tedarikçi formunun iki bayrağı; alan yoksa `undefined` (güncellemede korunur). */
export function faturaBayraklariniOku(formData: FormData): {
  fiyatKdvDahil: boolean | undefined;
  kargoDahil: boolean | undefined;
} {
  return {
    fiyatKdvDahil: bayrakOku(formData, "fiyatKdvDahil"),
    kargoDahil: bayrakOku(formData, "kargoDahil"),
  };
}
