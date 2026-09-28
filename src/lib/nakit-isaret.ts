/**
 * NAKİT TAKVİMİ — TUTARIN İŞARETİ (K297, kullanıcı 28.09.2026 ekran görüntüsü:
 * «4114618000 +-₺4.472,69»). Saf; ekran ve bekçi aynı gövdeyi çağırır.
 *
 * Eski hâl işareti YALNIZ yönden yazıyordu (girecek → «+», çıkacak → «−») ve
 * tutarı kendi işaretiyle biçimliyordu. Hakedişte bazı GİRECEK kalemler EKSİdir
 * (kesinti, iade mahsubu): önüne «+» konup biçimleyicinin «-»si eklenince ekranda
 * «+-₺4.472,69» çıkıyordu. Yürüyen bakiye zaten doğruydu; kusur yalnız gösterimde.
 *
 * Kural: kasaya ETKİ = girecekse tutar, çıkacaksa −tutar. İşaret ve renk etkiden;
 * tutar MUTLAK değerle yazılır — ekranda tek işaret olur.
 */
export function nakitEtkisi(yon: "CIKACAK" | "GIRECEK", tutar: number): { isaret: "+" | "−"; mutlak: number; azaltir: boolean } {
  const etki = yon === "GIRECEK" ? tutar : -tutar;
  const azaltir = etki < 0;
  return { isaret: azaltir ? "−" : "+", mutlak: Math.abs(tutar), azaltir };
}
