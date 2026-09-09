import { canliYapilandirma } from "./canli-ortak";

/**
 * K195 — N11 paketlerinde kargo/teslim bilgisi VAR MI? (SALT OKUMA)
 *      npm run canli:n11-kargo-olcum
 *
 * BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ. Alan ADLARI ve durum
 * dağılımı basılır; kişisel veri (ad, adres, e-posta) BASILMAZ.
 *
 * ⚠ SORU: N11'in geçmiş şekli TY ile AYNI MI? Aynıysa `tyKargoDamgasi`
 * olduğu gibi kullanılabilir; değilse ayrı bir çözücü gerekir. Varsaymak
 * yerine ölçülüyor.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔", y.hata);
    process.exitCode = 1;
    return;
  }
  const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./n11/istemci");
  const k = kimlikOku();
  if (!k) {
    console.log("⛔ N11 kimlikleri okunamadı");
    process.exitCode = 1;
    return;
  }

  const s = await apiGet(UCLAR.paketler(0, 20), baslikKur(k));
  if (s.tur !== "VERI") {
    console.log("⛔ " + s.tur);
    return;
  }
  const g = s.govde as Record<string, unknown>;
  const liste = (g.content ?? g.items ?? []) as Record<string, unknown>[];
  console.log("");
  console.log("N11 — " + liste.length + " paket");
  if (liste.length === 0) return;

  /**
   * ⛔ ALAN KÜMESİ BÜTÜN KAYITLARIN BİRLEŞİMİNDEN — tek kayıttan değil.
   * (K195-2 dersi: TY `cargoTrackingLink`i boşsa HİÇ göndermiyor ve tek
   * pakete bakan ölçüm "alan yok" diyor.) Ayrıca DESİ ayrı aranıyor:
   * "deci" tek başına `cargo|ship|deliver` süzgecine TAKILMIYOR.
   */
  const birlesim = new Set<string>();
  for (const p of liste) for (const a of Object.keys(p)) birlesim.add(a);
  console.log("");
  console.log("DESİ/AĞIRLIK ARAMASI (birleşim kümesinde):");
  const desiAdaylari = [...birlesim].filter((a) => /desi|deci|weight|agirlik|kg/i.test(a));
  console.log(
    "  " + (desiAdaylari.length > 0 ? desiAdaylari.join(" · ") : "HİÇBİRİ — N11 desi VERMİYOR"),
  );
  console.log("  (birleşim kümesi " + birlesim.size + " alan · " + liste.length + " paket)");
  const alanlar = Object.keys(liste[0]);
  console.log("");
  console.log("KARGO/DURUM/TARİH alanları:");
  for (const a of alanlar) {
    if (/status|date|cargo|ship|deliver/i.test(a)) {
      const v = liste[0][a];
      console.log("  " + a.padEnd(28) + " tip " + typeof v + (v === null ? " (null)" : ""));
    }
  }

  const gecmisliler = liste.filter(
    (p) => Array.isArray(p.packageHistories) && (p.packageHistories as unknown[]).length > 0,
  );
  console.log("");
  console.log("packageHistories OLAN paket: " + gecmisliler.length + "/" + liste.length);
  if (gecmisliler.length === 0) return;

  const gec = gecmisliler[0].packageHistories as Record<string, unknown>[];
  console.log("  iç alanlar: " + Object.keys(gec[0]).join(" · "));

  const dagilim = new Map<string, number>();
  for (const p of liste) {
    for (const h of (p.packageHistories ?? []) as Record<string, unknown>[]) {
      const d = String(h.status ?? "(yok)");
      dagilim.set(d, (dagilim.get(d) ?? 0) + 1);
    }
  }
  console.log(
    "  geçmiş durumları: " + [...dagilim].map(([d, n]) => d + "=" + n).join(" · "),
  );

  const cd = gec[0].createdDate;
  console.log(
    "  createdDate tip " +
      typeof cd +
      (typeof cd === "number"
        ? " → " + new Date(cd).toISOString() + "  ✓ EPOCH MS (dilim belirsizliği YOK)"
        : "  ⛔ SAYI DEĞİL — ayrı çözücü gerekir"),
  );
}
main();
