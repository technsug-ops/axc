import { kaynakOku } from "./kaynak-oku";

import { engelGrubu, satisaEngel } from "../src/lib/kanal-listeleme";
import {
  n11Adedi,
  n11Anahtari,
  n11ListelemeDurumu,
} from "../src/lib/kanal-listeleme-n11";

/**
 * ============================================================================
 *  N11 LİSTELEME — BEKÇİ (22.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — BEKCI. Hiçbir şey yazmaz, veritabanına gitmez.
 *
 *  HB bekçisinin aynası: ① çeviri DEĞER testi (gövde çağrılır) · ② bilinmeyen
 *  hüküm değil · ③ anahtar · ④ zincir (panel gövdeleri) · ⑤ tarayıcı yalnız
 *  OKUR, yazan gövde src/lib'te, hesap KİMLİKLE.
 *
 *  ⚠ ÖLÇÜLMEMİŞ `status` DEĞERİ PASIF SAYILMAZ. Canlıda yalnız "Active"
 *  görüldü (113/113). Bir mutasyon bunu PASIF'e çevirirse kırmızı yanmalı:
 *  ölçmediğimiz şey hakkında hüküm kurulmaz.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 5;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log(`         ${JSON.stringify(gorulen)}`);
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** Ölçülen tipik satır: Active · On_Sale · adet 3. */
const ornek = (ek: Record<string, unknown> = {}) => ({
  status: "Active",
  saleStatus: "On_Sale",
  quantity: 3,
  stockCode: "HBCV00004U1QOR",
  ...ek,
});

console.log("\nN11 LİSTELEME — BEKÇİ");
console.log("=".repeat(70));

// ═══ 1) ÇEVİRİ ═══════════════════════════════════════════════════════════
console.log("\n1) ÇEVİRİ (gövde çağrılır)");
kontrol("Active · On_Sale · stoklu → ACIK", n11ListelemeDurumu(ornek()).durum === "ACIK");
kontrol("stok 0 → STOKSUZ", n11ListelemeDurumu(ornek({ quantity: 0, saleStatus: "Out_Of_Stock" })).durum === "STOKSUZ");
kontrol(
  "stoklu ama On_Sale değil → PASIF (STOKSUZ DEĞİL), izi 'satista-degil'",
  n11ListelemeDurumu(ornek({ saleStatus: "Passive" })).durum === "PASIF" &&
    n11ListelemeDurumu(ornek({ saleStatus: "Passive" })).kaynak === "satista-degil",
);
kontrol(
  "stok 0 + On_Sale değil → STOKSUZ (adet önce)",
  n11ListelemeDurumu(ornek({ quantity: 0, saleStatus: "Passive" })).durum === "STOKSUZ",
);
kosanBolumler.push("çeviri");

// ═══ 2) BİLİNMEYEN — HÜKÜM DEĞİL ═════════════════════════════════════════
console.log("\n2) BİLİNMEYEN");
kontrol(
  "status 'Active' değilse → BILINMIYOR (PASIF DEĞİL — ölçülmedi)",
  n11ListelemeDurumu(ornek({ status: "Suspended" })).durum === "BILINMIYOR" &&
    n11ListelemeDurumu(ornek({ status: "Suspended" })).kaynak === "durum-olculmedi",
);
kontrol("status alanı YOKSA → BILINMIYOR", n11ListelemeDurumu({ saleStatus: "On_Sale", quantity: 3 }).durum === "BILINMIYOR");
kontrol("adet alanı YOKSA → BILINMIYOR (STOKSUZ değil)", n11ListelemeDurumu({ status: "Active", saleStatus: "On_Sale" }).durum === "BILINMIYOR");
kontrol("adet dize gelirse → BILINMIYOR", n11ListelemeDurumu(ornek({ quantity: "5" })).durum === "BILINMIYOR");
kontrol("n11Adedi sayı olmayanda null", n11Adedi("3") === null && n11Adedi(3) === 3 && n11Adedi(Number.NaN) === null);
kosanBolumler.push("bilinmeyen");

// ═══ 3) ANAHTAR ═══════════════════════════════════════════════════════════
console.log("\n3) ANAHTAR");
kontrol("anahtar stockCode'dan", n11Anahtari(ornek()) === "HBCV00004U1QOR");
kontrol("boşluklar kırpılır", n11Anahtari({ stockCode: "  X  " }) === "X");
kontrol("alan yoksa boş dize", n11Anahtari({}) === "");
kontrol("n11ProductId anahtar DEĞİL", n11Anahtari({ n11ProductId: 123 } as never) === "");
kosanBolumler.push("anahtar");

// ═══ 4) ZİNCİR — panel gövdeleri ÇAĞRILARAK ══════════════════════════════
console.log("\n4) ZİNCİR");
kontrol("ACIK satışa ENGEL DEĞİL", !satisaEngel(n11ListelemeDurumu(ornek()).durum));
kontrol("satışta-değil PASIF → satışa ENGEL", satisaEngel(n11ListelemeDurumu(ornek({ saleStatus: "Passive" })).durum));
kontrol("BILINMIYOR engel SAYILMAZ", !satisaEngel(n11ListelemeDurumu(ornek({ status: "X" })).durum));
kontrol("STOKSUZ 'STOK_KAPALI' kovasına düşer", engelGrubu(n11ListelemeDurumu(ornek({ quantity: 0 })).durum) === "STOK_KAPALI");
kontrol("BILINMIYOR hiçbir kovaya girmez", engelGrubu(n11ListelemeDurumu({}).durum) === null);
kosanBolumler.push("zincir");

// ═══ 5) TARAYICI — yalnız okur, kimlikle, yazan gövde src/lib'te ═════════
console.log("\n5) TARAYICI");
{
  const t = yorumsuz("scripts/canli-n11-listeleme-yaz.ts");
  kontrol("betik doğrudan prisma YAZMIYOR (gövde src/lib'te)", !/prisma\.\w+\.(update|create|upsert|delete)/.test(t));
  kontrol("N11'e yalnız GET (apiGet dışında istek yok)", !/fetch\(|method:\s*"(POST|PUT|PATCH|DELETE)"/.test(t) && /apiGet\(/.test(t));
  kontrol("hesap externalId İLE bulunuyor (adla değil)", /externalId: saticiId/.test(t) && !/name: \{ contains/.test(t));
  kontrol("satıcı kimliği satırlardan okunuyor ve TEK olmalı", /saticiIdleri\.size !== 1/.test(t));
  kontrol("--uygula kapısı var; kuru koşum varsayılan", /process\.argv\.includes\("--uygula"\)/.test(t) && /KURU KOŞUM/.test(t));
  /*
   * ⛔ DESEN KAPIYA BAĞLI, UYARI SATIRINA DEĞİL. `satirlar.length > 0 &&
   * eslesen === 0` dosyada İKİ yerde geçiyor (uyarı + yazım kapısı); ilk
   * yazımda yalnız varlığı aranıyordu ve kapıyı silen mutasyon uyarı
   * satırını bulup YEŞİL geçti. Anayasa tablosu, 3. vaka.
   */
  kontrol(
    "SIFIR EŞLEŞMEDE YAZIM DURUR (kapı: !UYGULA || sıfır eşleşme)",
    /if \(!UYGULA \|\| \(satirlar\.length > 0 && eslesen === 0\)\)/.test(t),
  );
  kontrol("iz adı N11'e ait (HB izine yazmıyor)", /"N11_LISTELEME_YAZIM"/.test(t) && !/"HB_LISTELEME_YAZIM"/.test(t));
  kontrol("sayfalama zarfın beyanıyla bitiyor (totalPages) + sonsuz döngü kapısı", /totalPages/.test(t) && /SAYFA_TAVANI/.test(t));
  kontrol("cron için fırlatmayan sarmalayıcı VAR", /export async function n11ListelemeCekimKosGuvenli/.test(t) && /atlandi: "COKTU"/.test(t));

  const y = yorumsuz("src/lib/kanal-listeleme-hb-yaz.ts");
  kontrol("yazıcı iz adını parametreden alıyor (kanal-bağımsız)", /izAdi/.test(y) && /action: izAdi/.test(y));
  kosanBolumler.push("tarayıcı");
}

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
