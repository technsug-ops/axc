import { tumKayitlar } from "./hb/istemci";

/**
 * ============================================================================
 *  HB SAYFA GEZİCİSİ BEKÇİSİ (K195-② ön şartı, 02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run hb-sayfa:dogrula
 *
 *  ⛔ VAKA: `/delivered` 100 istense de 50 veriyordu (zarf `limit: 50`,
 *  `totalCount: 122`). Gezici «az geldi = son sayfa» deyip 50'de durdu;
 *  14.09'dan beri HB teslim damgası yazılmadı ve 54 teslim edilmiş paket
 *  «yolda» göründü. Durmasa bile sonraki sayfayı 100'den açıp 50–99'u
 *  atlayacaktı.
 *
 *  Ölçüm DEĞERLE: sahte bir HB (fetch casusu) kanalın gerçek davranışını
 *  taklit eder — ölçülen tavanlar 02.10.2026: `/shipped` · `/delivered` ·
 *  `/cancelled` 50 · `/listings` 100. Ağa çıkılmaz.
 * ============================================================================
 */

console.log("\nHB SAYFA GEZİCİSİ BEKÇİSİ\n");

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK  " + ad);
  } else {
    hata++;
    console.log("  X   " + ad + (ayrinti === undefined ? "" : "  → " + JSON.stringify(ayrinti).slice(0, 300)));
  }
}

type Sahte = { toplam: number; tavan: number; zarf: "SAYFALI" | "BEYANSIZ" | "DIZI"; totalCountYalan?: number };

/** Kanal taklidi: istenen ofset/limit'e göre, tavanı aşmadan kayıt verir. */
function sahteKanal(k: Sahte) {
  const istekler: { offset: number; limit: number }[] = [];
  const fetchSahte = (async (adres: string) => {
    const u = new URL(adres);
    const offset = Number(u.searchParams.get("offset"));
    const limit = Number(u.searchParams.get("limit"));
    istekler.push({ offset, limit });
    const etkin = Math.min(limit, k.tavan);
    const items = Array.from({ length: Math.max(0, Math.min(etkin, k.toplam - offset)) }, (_, i) => ({ Id: "p" + (offset + i) }));
    const govde =
      k.zarf === "DIZI"
        ? items
        : k.zarf === "BEYANSIZ"
          ? { limit: etkin, offset, items }
          : { totalCount: k.totalCountYalan ?? k.toplam, limit: etkin, offset, pageCount: Math.ceil(k.toplam / etkin), items };
    return new Response(JSON.stringify(govde), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { istekler, fetchSahte };
}

async function kos(k: Sahte, istenen: number) {
  const { istekler, fetchSahte } = sahteKanal(k);
  const asil = globalThis.fetch;
  globalThis.fetch = fetchSahte;
  try {
    const r = await tumKayitlar((o, l) => `https://hb.sahte/liste?offset=${o}&limit=${l}`, {}, istenen, 20);
    const idler = r.tur === "TAMAM" ? (r.kayitlar as { Id: string }[]).map((x) => x.Id) : [];
    return { r, idler, tekil: new Set(idler).size, istekler };
  } finally {
    globalThis.fetch = asil;
  }
}

async function main() {
  /* ① ÖLÇÜLEN VAKA — /delivered: tavan 50, toplam 122, biz 100 istiyoruz. */
  const v = await kos({ toplam: 122, tavan: 50, zarf: "SAYFALI" }, 100);
  kontrol("⛔ ÖLÇÜLEN VAKA: tavan 50 · toplam 122 → 122 kaydın HEPSİ okunur", v.idler.length === 122, v.idler.length);
  kontrol("  ...hiçbir kayıt atlanmaz ya da iki kez okunmaz (122 tekil)", v.tekil === 122, v.tekil);
  kontrol("  ...ofset GELEN kayıt kadar ilerler (0 · 50 · 100)", JSON.stringify(v.istekler.map((i) => i.offset)) === "[0,50,100]", v.istekler);
  kontrol("  ...beyan (totalCount) çağırana verilir ve kesik DEĞİL", v.r.tur === "TAMAM" && v.r.beyanToplam === 122 && v.r.kesildiMi === false, v.r.tur === "TAMAM" ? { b: v.r.beyanToplam, k: v.r.kesildiMi } : v.r);

  /* ② Tam katı: toplam 100, tavan 50 → üçüncü (boş) sayfa İSTENMEZ. */
  const t = await kos({ toplam: 100, tavan: 50, zarf: "SAYFALI" }, 100);
  kontrol("toplam tavanın tam katıyken (100/50) beyana ulaşınca durur, boş sayfa istemez", t.idler.length === 100 && t.istekler.length === 2, t.istekler);

  /* ③ /listings: tavan 100 — istenenle aynı. */
  const l = await kos({ toplam: 230, tavan: 100, zarf: "SAYFALI" }, 100);
  kontrol("tavan istenene eşitken (ilanlar) 230 kaydın hepsi · 3 istek", l.idler.length === 230 && l.tekil === 230 && l.istekler.length === 3, l.istekler);

  /* ④ Küçük liste (bugünkü /shipped 3, /cancelled 10) — tek istek. */
  const k = await kos({ toplam: 3, tavan: 50, zarf: "SAYFALI" }, 100);
  kontrol("küçük liste (3) tek istekte biter", k.idler.length === 3 && k.istekler.length === 1, k.istekler);

  /* ⑤ Yalan beyan: totalCount 122 ama kanal 100'den sonra boş dönüyor → sonsuz döngü YOK. */
  const y = await kos({ toplam: 100, tavan: 50, zarf: "SAYFALI", totalCountYalan: 122 }, 100);
  kontrol("beyan 122 ama kanal 100'de bitiyor → boş sayfada durur (sonsuz döngü yok)", y.idler.length === 100 && y.istekler.length === 3, y.istekler);
  kontrol("  ...ve beyan ile sayım AYRIŞIK raporlanır (çağıran karşılaştırabilir)", y.r.tur === "TAMAM" && y.r.beyanToplam === 122 && y.idler.length < 122);

  /* ⑥ Zarf tavanı söylüyor ama toplam söylemiyor — tavan 50, toplam 122. */
  const b = await kos({ toplam: 122, tavan: 50, zarf: "BEYANSIZ" }, 100);
  kontrol("zarf tavanı (50) söyleyip toplam söylemiyorsa: 50'lik sayfa SON sayfa sanılmaz → 122", b.idler.length === 122 && b.tekil === 122, b.istekler);

  /* ⑦ Zarfsız dizi (/packages) — tavan bilinmiyor: istenenden az gelince biter. */
  const d = await kos({ toplam: 7, tavan: 50, zarf: "DIZI" }, 100);
  kontrol("zarfsız dizi: istenenden az gelince durur", d.idler.length === 7 && d.istekler.length === 1, d.istekler);

  console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
  process.exit(hata === 0 ? 0 : 1);
}

main();
