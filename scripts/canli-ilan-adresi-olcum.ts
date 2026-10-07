import * as ty from "./ty/istemci";
import * as hb from "./hb/istemci";
import * as n11 from "./n11/istemci";

/**
 * ============================================================================
 *  İLAN ADRESİ ÖLÇÜMÜ (SALT OKUMA · KOD ÖNCESİ) — 07.10.2026
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-ilan-adresi-olcum.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — «ürünler listesinde pazaryeri linki» isteğinin
 *  (kullanıcı 07.10.2026) veri tabanını ölçer. ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  Soru: her kanalın ürün okuma ucu ilanın HERKESE AÇIK adresini (ya da onu
 *  kurmaya yeten kimliği) veriyor mu — ve kaç kayıtta DOLU? (Anayasa: «bir
 *  alanın varlığı tek kayıttan okunmaz — JSON boş alanı hiç göndermez»:
 *  alan kümesi kayıtların BİRLEŞİMİNDEN, yanında doluluk.)
 * ============================================================================
 */

const ORNEK = 20;
const ADAY = /url|link|slug|productid|contentid|^id$|hepsiburadasku|merchantsku|catalog/i;

function duzlestir(kayit: unknown, onek = "", cikti: Record<string, unknown> = {}): Record<string, unknown> {
  if (kayit === null || typeof kayit !== "object") return cikti;
  for (const [k, v] of Object.entries(kayit as Record<string, unknown>)) {
    const ad = onek ? `${onek}.${k}` : k;
    if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === "object") duzlestir(v[0], `${ad}[0]`, cikti);
      else cikti[ad] = v;
    } else if (v !== null && typeof v === "object") duzlestir(v, ad, cikti);
    else cikti[ad] = v;
  }
  return cikti;
}

function raporla(kanal: string, kayitlar: unknown[]) {
  console.log(`\n${"=".repeat(72)}\n${kanal} — incelenen ${kayitlar.length} kayıt`);
  if (kayitlar.length === 0) {
    console.log("  ⚠ BOŞ — şekil ÖLÇÜLEMEDİ (temiz değil, incelenemedi)");
    return;
  }
  const duz = kayitlar.map((k) => duzlestir(k));
  const birlesim = new Set(duz.flatMap((d) => Object.keys(d)));
  const adaylar = [...birlesim].filter((a) => ADAY.test(a.split(".").pop() ?? a)).sort();
  console.log(`  alan birleşimi: ${birlesim.size} · bağlantı/kimlik adayı: ${adaylar.length}`);
  for (const a of adaylar) {
    const dolu = duz.filter((d) => d[a] !== undefined && d[a] !== null && d[a] !== "").length;
    const ornekler = duz.map((d) => d[a]).filter((v) => v !== undefined && v !== null && v !== "").slice(0, 2);
    console.log(`  ${a.padEnd(36)} ${String(dolu).padStart(3)}/${duz.length}  örn: ${JSON.stringify(ornekler).slice(0, 150)}`);
  }
}

async function main() {
  console.log("İLAN ADRESİ ÖLÇÜMÜ — SALT OKUMA · " + new Date().toISOString());

  const tk = ty.kimlikOku();
  if (!tk) console.log("\n⛔ TY kimliği okunamadı — TY İNCELENEMEDİ");
  else {
    const s = await ty.apiGet(ty.UCLAR.onayliUrunler(tk.saticiId, 0, ORNEK), ty.baslikKur(tk));
    if (s.tur !== "VERI") console.log("\n⛔ TY: " + JSON.stringify(s).slice(0, 200));
    else {
      const g = s.govde as { content?: unknown[] };
      raporla("TRENDYOL (onaylı v2)", g.content ?? []);
    }
  }

  const hk = hb.kimlikOku();
  if (!hk) console.log("\n⛔ HB kimliği okunamadı — HB İNCELENEMEDİ: " + hb.kimlikEksikleri().join(", "));
  else {
    const s = await hb.apiGet(hb.UCLAR.listingler(hk, 0, ORNEK), hb.baslikKur(hk));
    if (s.tur !== "VERI") console.log("\n⛔ HB: " + JSON.stringify(s).slice(0, 200));
    else {
      const d = hb.kayitDizisi(s.govde);
      if (d.tur !== "DIZI") console.log("⛔ HB zarf tanınmadı: " + d.alanlar.join(","));
      else raporla("HEPSIBURADA (listings)", d.kayitlar);
    }
  }

  const nk = n11.kimlikOku();
  if (!nk) console.log("\n⛔ N11 kimliği okunamadı — N11 İNCELENEMEDİ");
  else {
    const s = await n11.apiGet(`/ms/product-query?page=0&size=${ORNEK}`, n11.baslikKur(nk));
    if (s.tur !== "VERI") console.log("\n⛔ N11: " + JSON.stringify(s).slice(0, 200));
    else {
      const g = s.govde as { content?: unknown[] };
      raporla("N11 (product-query)", g.content ?? []);
    }
  }
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
