import { canliYapilandirma } from "./canli-ortak";

/**
 * K195 — KANALLAR KARGO/TESLİM İÇİN HANGİ ALANLARI VERİYOR? (SALT OKUMA)
 *      npm run canli:kargo-alan-olcum
 *
 * BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ, yalnız alan ADLARINI basar.
 *
 * ⚠ DEĞER BASILMAZ, ALAN ADI BASILIR: müşteri adı/adresi gibi kişisel veri
 * ekrana dökülmesin. Soru "hangi alanlar var", "içinde ne yazıyor" değil.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }

  const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./hb/istemci");
  const k = kimlikOku();
  if (!k) { console.log("⛔ HB kimlikleri okunamadı"); process.exitCode = 1; return; }
  const baslik = baslikKur(k);

  for (const [ad, uc] of [
    ["KARGODA (shipped)", UCLAR.paketlerGonderilen(k, 0, 3)],
    ["TESLIM (delivered)", UCLAR.paketlerTeslim(k, 0, 3)],
  ] as const) {
    const s = await apiGet(uc, baslik);
    console.log("\n=== HB " + ad + " ===");
    if (s.tur !== "VERI") { console.log("  ⛔ " + s.tur); continue; }
    const g = s.govde as Record<string, unknown>;
    const liste = (g.items ?? g.Items ?? g.content ?? g) as unknown;
    const ilk = Array.isArray(liste) ? liste[0] : undefined;
    if (!ilk) { console.log("  (kayit yok — zarf anahtarlari: " + Object.keys(g).join(", ") + ")"); continue; }
    const alanlar = Object.keys(ilk as Record<string, unknown>);
    console.log("  alan sayisi: " + alanlar.length);
    console.log("  ALANLAR: " + alanlar.join(" · "));
    /** ⚠ Yalnız TARİH gibi görünen alanların TİPİ — değeri değil. */
    for (const a of alanlar) {
      if (/date|time|at$|tarih/i.test(a)) {
        const v = (ilk as Record<string, unknown>)[a];
        console.log("    ⏱ " + a + " → tip " + typeof v + (v === null ? " (null)" : ""));
      }
    }
  }
}
main();
