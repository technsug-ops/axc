import { canliYapilandirma } from "./canli-ortak";

/**
 * K195 — TY paketlerinde kargo/teslim bilgisi VAR MI? (SALT OKUMA)
 *      npm run canli:ty-kargo-olcum
 * BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ. Alan ADLARI ve DURUM
 * dağılımı basılır; kişisel veri basılmaz.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./ty/istemci");
  const k = kimlikOku();
  if (!k) { console.log("⛔ TY kimlikleri okunamadı"); process.exitCode = 1; return; }

  const bit = Date.now();
  const bas = bit - 7 * 24 * 60 * 60 * 1000;
  const s = await apiGet(UCLAR.siparisler(k.saticiId, bas, bit, 0, 50), baslikKur(k));
  if (s.tur !== "VERI") { console.log("⛔ " + s.tur); return; }
  const g = s.govde as { content?: Record<string, unknown>[] };
  const liste = g.content ?? [];
  console.log("\nTY — son 7 gun, " + liste.length + " paket");
  if (liste.length === 0) return;

  const alanlar = Object.keys(liste[0]);
  console.log("\nALANLAR: " + alanlar.filter((a) => /status|date|cargo|ship|deliver/i.test(a)).join(" · "));

  const durumlar = new Map<string, number>();
  let gecmisiOlan = 0;
  const gecmisDurumlari = new Map<string, number>();
  for (const p of liste) {
    const d = String(p.status ?? "(yok)");
    durumlar.set(d, (durumlar.get(d) ?? 0) + 1);
    const gecmis = p.packageHistories as { createdDate?: number; status?: string }[] | undefined;
    if (Array.isArray(gecmis) && gecmis.length > 0) {
      gecmisiOlan++;
      for (const h of gecmis) {
        const hd = String(h.status ?? "(yok)");
        gecmisDurumlari.set(hd, (gecmisDurumlari.get(hd) ?? 0) + 1);
      }
    }
  }
  /**
   * ⛔ ALAN ADI LİSTESİ, İLK PAKETTEN OKUNUYORDU — VE BU YANILTTI.
   * (Bulgu 09.09.2026, K195-2.) TY bir alanı BOŞSA hiç göndermiyor:
   * `cargoTrackingLink` sabah ölçümünde listede vardı, öğleden sonrakinde
   * YOKTU. Tek pakete bakan bir ölçüm "alan var" der ve o iddia üstüne
   * sütun açılır. Doğrusu: anahtarların BİRLEŞİMİ + her alanın DOLULUĞU.
   */
  const tumAlanlar = new Set<string>();
  for (const p of liste) for (const a of Object.keys(p as object)) tumAlanlar.add(a);
  console.log("\nALAN DOLULUĞU (dolu/toplam · birleşim kümesinden):");
  for (const a of [...tumAlanlar].sort()) {
    if (!/cargo|track|provider|deliver/i.test(a)) continue;
    const dolu = liste.filter((p) => {
      const v = (p as Record<string, unknown>)[a];
      return v !== null && v !== undefined && v !== "";
    });
    console.log("   " + a.padEnd(24) + String(dolu.length).padStart(3) + "/" + liste.length);
  }
  console.log("\nPAKET DURUMLARI:");
  for (const [d, n] of [...durumlar].sort((a, b) => b[1] - a[1])) console.log("   " + d.padEnd(20) + n);
  console.log("\npackageHistories OLAN paket: " + gecmisiOlan + "/" + liste.length);
  console.log("GECMISTEKI DURUMLAR (tarihli):");
  for (const [d, n] of [...gecmisDurumlari].sort((a, b) => b[1] - a[1])) console.log("   " + d.padEnd(20) + n);

  /** Tarih biçimi — TY epoch ms mi? */
  const ilkGecmis = (liste.find((p) => Array.isArray(p.packageHistories) && (p.packageHistories as unknown[]).length > 0)
    ?.packageHistories as { createdDate?: number; status?: string }[] | undefined)?.[0];
  if (ilkGecmis?.createdDate !== undefined) {
    const d = new Date(ilkGecmis.createdDate);
    console.log(
      "\nTARIH BICIMI: createdDate=" + ilkGecmis.createdDate +
      " tip " + typeof ilkGecmis.createdDate +
      " → " + (Number.isNaN(d.getTime()) ? "⛔ AYRISTIRILAMADI" : d.toISOString() + "  ✓ epoch ms, SAAT DILIMI BELIRSIZLIGI YOK"),
    );
  }
}
main();
