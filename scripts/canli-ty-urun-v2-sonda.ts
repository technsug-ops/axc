import { apiGet, baslikKur, kimlikOku, tumSayfalar, UCLAR } from "./ty/istemci";

/** `--kiyas` · v1 ile v2 AYNI kümeyi mi kapsıyor — v1 ölmeden önce. */
const KIYAS = process.argv.includes("--kiyas");

/**
 * ============================================================================
 *  K181 — ÜRÜN v2 UÇ SONDASI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-ty-urun-v2-sonda.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — v2 geçişinin ALAN ADLARINI ölçer, rutin
 *  koşmaz. Geçiş bitince yerinde kalır (şekil değişirse yeniden ölçülür).
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ — ne veritabanına ne Trendyol'a. Yalnız GET.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  Trendyol 15.09.2026'da eski ürün ucunu kapatıyor. v2'ye geçerken alan
 *  adları **belgeden okunup varsayılmaz, UÇTAN ölçülür** — v1 sondası da
 *  01.09.2026'da böyle yapılmıştı (`size=3`). Belge ile ucun söylediği
 *  ayrışabilir; ayrışırsa normalleştirici sessizce boş alan okur ve
 *  sınıflandırma "BILINMIYOR"a düşer.
 *
 *  ⚠ ÇIKTI ALAN ADLARIDIR, VERİ DEĞİL: barkod/başlık gibi içerik basılmaz;
 *  yalnız hangi anahtarların GELDİĞİ ve tiplerinin ne olduğu yazılır.
 * ============================================================================
 */

function tip(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return `dizi[${v.length}]`;
  return typeof v;
}

/** Bir kaydın anahtarlarını tipiyle basar — DEĞER basmaz. */
function anahtarlar(ad: string, kayit: Record<string, unknown>) {
  console.log(`\n   ${ad} — ${Object.keys(kayit).length} alan`);
  for (const k of Object.keys(kayit).sort()) {
    console.log(`     ${k.padEnd(28)} ${tip(kayit[k])}`);
  }
}

async function main() {
  const kimlik = kimlikOku();
  if (kimlik === null) {
    console.log("⛔ TY kimliği okunamadı (.env.canli) — sonda yapılamaz.");
    process.exitCode = 1;
    return;
  }

  console.log("\nK181 — ÜRÜN v2 UÇ SONDASI");
  console.log("  satıcı  " + kimlik.saticiId);
  console.log("  kip     SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an      " + new Date().toISOString());
  console.log("=".repeat(72));

  const baslik = baslikKur(kimlik);

  for (const [ad, yol] of [
    ["ONAYLI  (v2)", UCLAR.onayliUrunler(kimlik.saticiId, 0, 2)],
    ["ONAYSIZ (v2)", UCLAR.onaysizUrunler(kimlik.saticiId, 0, 2)],
    ["ESKİ    (v1)", UCLAR.urunlerV1(kimlik.saticiId, 0, 2)],
  ] as const) {
    const s = await apiGet(yol, baslik);
    console.log("\n" + "-".repeat(72));
    console.log(`  ${ad}  →  ${s.tur}`);
    if (s.tur !== "VERI") {
      /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
      console.log("  " + JSON.stringify(s));
      continue;
    }
    const govde = s.govde as Record<string, unknown>;
    /**
     * ⚠ `totalElements` DEĞERİYLE BASILIR — sayfalama kararının girdisi.
     * v2 belgesi 10.000 kaydı aşan sorgularda `nextPageToken` istiyor;
     * `page`/`size` ile gezmek o sınırın üstünde SESSİZCE kesilir.
     * Kaç kaydımız olduğunu bilmeden "sayfa gezinmesi yeter" denemez.
     */
    console.log(
      "  sayfalama: " +
        ["totalElements", "totalPages", "page", "size"]
          .map((k) => `${k}=${typeof govde[k] === "number" ? String(govde[k]) : "YOK"}`)
          .join("  ") +
        `  nextPageToken=${"nextPageToken" in govde ? tip(govde.nextPageToken) : "YOK"}`,
    );
    const dizi = Array.isArray(govde.content) ? (govde.content as unknown[]) : [];
    console.log("  content: " + dizi.length + " kayıt");
    if (dizi.length === 0) {
      /** ⚠ BOŞ İLE OKUNAMADI AYRI: uç çalıştı ama bu sayfada kayıt yok. */
      console.log("  ⚠ BOŞ — uç çalışıyor, bu sayfada kayıt yok; şekil ÖLÇÜLEMEDİ.");
      continue;
    }
    const ilk = dizi[0] as Record<string, unknown>;
    anahtarlar("ÜRÜN", ilk);

    /**
     * ⚠ İÇ İÇE İNİLİR — ÖLÇÜM İLK YAZIMDA YARIM KALDI (07.09.2026).
     * v2 onaylı uçta adet `variants[0].stock.quantity`, yani ÜRÜN
     * seviyesinde `stock` diye bir alan YOK. Yalnız ürün anahtarlarına bakan
     * sonda "stock alanı yok" der ve normalleştirici adedi hiç bulamazdı.
     */
    const kaz = (kayit: Record<string, unknown>, onek: string) => {
      for (const alan of Object.keys(kayit).sort()) {
        const v = kayit[alan];
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null) {
          anahtarlar(`${onek}${alan}[0]`, v[0] as Record<string, unknown>);
        } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          anahtarlar(`${onek}${alan}`, v as Record<string, unknown>);
        }
      }
    };
    kaz(ilk, "");
    const varyantlar = ilk.variants;
    if (Array.isArray(varyantlar) && varyantlar.length > 0) {
      kaz(varyantlar[0] as Record<string, unknown>, "variants[0].");
    }
  }

  console.log("\n" + "=".repeat(72));
  if (KIYAS) await kiyasla(kimlik.saticiId, baslik);

  console.log("  SALT OKUMA — hiçbir yazma ucuna dokunulmadı.");
}

/**
 * ============================================================================
 *  --kiyas  ·  v1 ↔ v2 KAPSAM KIYASI (AYNI AN)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE ŞART: geçişte sorulacak soru "v2 çalışıyor mu" değil, **"v2 aynı
 *  kümeyi mi kapsıyor"**dur. Kapsam sessizce daralsaydı tarama daha az ürün
 *  görür ve "TY'de yok" kovası haksız yere şişerdi.
 *
 *  ⚠ VE KIYASIN İKİ TARAFI AYNI BİRİMDEN OLMALI. v1 zaten BARKOD bazlıydı
 *  (bir satır = bir barkod); v2 onaylı uçta bir İÇERİK birden çok barkod
 *  taşıyor. v1'in ÜRÜN sayısını v2'nin ÜRÜN sayısıyla kıyaslamak BİRİM
 *  HATASIDIR — ilk okumada tam bu yapıldı ve "42 kayıt kayboluyor" diye
 *  yanlış bir alarm üretildi. Kıyas BARKOD KÜMESİ üzerinden kurulur.
 *  _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli — biçim değil kimlik
 *  süzer".)_
 *
 *  ⏳ ÖMÜRLÜ: v1 ucu 15.09.2026'da kapanıyor. O tarihten sonra bu kip
 *  kıyası KURAMAZ ve öyle yazar — sessizce "fark yok" DEMEZ.
 * ============================================================================
 */
async function kiyasla(saticiId: string, baslik: Record<string, string>) {
  console.log("\n" + "=".repeat(72));
  console.log("  v1 ↔ v2 KAPSAM KIYASI — barkod kümesi üzerinden");

  const barkodlar = async (
    ad: string,
    yolKur: (sayfa: number) => string,
    cikar: (k: Record<string, unknown>) => string[],
  ) => {
    const s = await tumSayfalar(yolKur, baslik, 60);
    if (s.tur === "HATA") {
      console.log(`  ⛔ ${ad} okunamadı — KIYAS KURULMAZ: ${JSON.stringify(s.sonuc)}`);
      return null;
    }
    const kume = new Set<string>();
    for (const k of s.kayitlar as Record<string, unknown>[]) {
      for (const b of cikar(k)) if (b.trim() !== "") kume.add(b.trim());
    }
    console.log(`  ${ad.padEnd(12)} ${s.kayitlar.length} kayıt → ${kume.size} barkod`);
    return kume;
  };

  const v1 = await barkodlar("v1", (s) => UCLAR.urunlerV1(saticiId, s, 200), (k) => [
    String(k.barcode ?? ""),
  ]);
  const onayli = await barkodlar(
    "v2 onaylı",
    (s) => UCLAR.onayliUrunler(saticiId, s),
    (k) =>
      (Array.isArray(k.variants) ? k.variants : []).map((v) =>
        String(((v ?? {}) as Record<string, unknown>).barcode ?? ""),
      ),
  );
  const onaysiz = await barkodlar(
    "v2 onaysız",
    (s) => UCLAR.onaysizUrunler(saticiId, s),
    (k) => [String(k.barcode ?? "")],
  );

  /** ⛔ Taraflardan biri okunamadıysa FARK ÜRETİLMEZ — "0 fark" demek olurdu. */
  if (v1 === null || onayli === null || onaysiz === null) {
    console.log("  ⛔ Bir taraf okunamadı — FARK ÜRETİLMEZ (hüküm değil).");
    return;
  }

  const v2 = new Set([...onayli, ...onaysiz]);
  const yalnizV1 = [...v1].filter((b) => !v2.has(b));
  const yalnizV2 = [...v2].filter((b) => !v1.has(b));

  console.log("");
  console.log(`  v1 barkod          ${v1.size}`);
  console.log(`  v2 barkod          ${v2.size}`);
  console.log(`  ⛔ YALNIZ v1'de    ${yalnizV1.length}   ← geçişte KAYBEDİLECEK olan`);
  console.log(`  ⭐ YALNIZ v2'de    ${yalnizV2.length}   ← v1'in göstermediği`);
  if (yalnizV1.length > 0) console.log("     örnek: " + yalnizV1.slice(0, 8).join(" · "));
  if (yalnizV2.length > 0) console.log("     örnek: " + yalnizV2.slice(0, 8).join(" · "));
}

void main();
