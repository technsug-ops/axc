import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  TOPLU "KARGOYA VERİLDİ" BEKÇİSİ (K60) — 27.08.2026
 * ----------------------------------------------------------------------------
 *      npm run toplu-kargo:dogrula
 *
 *  ⚠ VAKA: görev kutusunda kapatılamayan 5192 maddelik bir yığın vardı ve bu
 *  düğme onu kapatmanın tek görünen yoluydu. İki tıkla **5601 içe aktarılmış
 *  siparişe** bugünün tarihi kargo tarihi olarak yazıldı — sistemin HİÇ
 *  BİLMEDİĞİ bir tarih. Liste sayfalanmıyor, yani tek tık = ekrandaki her şey.
 *
 *  ⛔ KORUNAN İKİ DAVRANIŞ:
 *    ① içe aktarılmış sipariş toplu işaretlemeye GİRMEZ (hem sunucu hem ekran)
 *    ② onay metni yazılacak TARİHİ somut söyler ve riski yazar
 *
 *  ⚠ BU BEKÇİ KAYNAK TARIYOR — ve niye: korunan şey bir HESAP değil, bir
 *  SORGU KOŞULU ve bir EKRAN METNİ. İkisi de saf gövdeye taşınamaz.
 *  (Anayasa: "saf hesap katmanı desen tarayan bekçiye muhtaç olmaz" — sıra
 *  ① taşımayı dene ② taşınmıyorsa desen tara, KULLANIM BLOĞUNA daraltarak.)
 *
 *  ⚠ VE HER ÖLÇÜT KULLANIM BLOĞUNA DARALTILIR, dosyanın tamamına değil:
 *  `importKaynak` kelimesi bu dosyalarda birden çok yerde geçiyor (yorumda,
 *  başka sorguda). Ölçüt `updateMany` çağrısının GÖVDESİNE bağlanıyor.
 * ============================================================================
 */

let gecen = 0;
const dusen: string[] = [];

function kontrol(ad: string, kosul: boolean, ipucu?: string) {
  if (kosul) gecen++;
  else dusen.push(ad + (ipucu ? "\n       " + ipucu : ""));
}

/**
 * Bir çapadan başlayıp `uzunluk` karakterlik pencere keser.
 * ⚠ PENCERE ÖLÇÜLÜR: gövde büyüyünce dar pencere sessizce kör kalır.
 * Bu depoda üç kez yaşandı (2600 → 4200 → 6500).
 */
function blok(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  if (i === -1) return "";
  return metin.slice(i, i + uzunluk);
}

/** ⚠ YORUMSUZ KOD — bir yasağı ANLATAN yorum, yasağı UYGULAMIŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const actions = yorumsuz(readFileSync("src/app/satislar/actions.ts", "utf8"));
const liste = yorumsuz(readFileSync("src/app/satislar/page.tsx", "utf8"));
const diyalog = yorumsuz(readFileSync("src/app/satislar/toplu-kargo.tsx", "utf8"));
const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
  Satis: Record<string, string>;
};

console.log("\nTOPLU KARGO BEKÇİSİ (K60)\n");

// ═══════════════════════════════════════════════════════════════════════════
//  ① SUNUCU KAPISI — updateMany gövdesinde importKaynak: null
// ═══════════════════════════════════════════════════════════════════════════
//  ⚠ ÇAPA `data: { shippedAt: gun }` DEĞİL, `updateMany` — çünkü ölçülmek
//  istenen şey o çağrının WHERE'i. Ve pencere gövdeyi kapsayacak kadar geniş
//  (koşullar + data bloğu ~700 karakter).

const yazma = blok(actions, "prisma.sale.updateMany", 900);
kontrol(
  "① toplu yazma çağrısı bulundu",
  yazma !== "",
  "`prisma.sale.updateMany` bulunamadı — çağrı adı mı değişti?",
);
kontrol(
  "① sunucu koşulu içe aktarılmışı ELİYOR (importKaynak: null)",
  /importKaynak:\s*null/.test(yazma),
  "updateMany gövdesinde `importKaynak: null` yok — toplu işlem sistemin bilmediği bir tarihi yazabilir",
);
kontrol(
  "① sunucu koşulu zaten işaretliyi de eliyor (shippedAt: null)",
  /shippedAt:\s*null/.test(yazma),
);
kontrol(
  "① sunucu koşulu iptalliyi de eliyor (iptalTarihi: null)",
  /iptalTarihi:\s*null/.test(yazma),
);
kontrol(
  "① ve gerçekten shippedAt YAZIYOR (ölçüt boş bir çağrıya bağlanmasın)",
  /data:\s*\{\s*shippedAt:\s*gun\s*\}/.test(yazma),
);

// ═══════════════════════════════════════════════════════════════════════════
//  ② EKRAN KÜMESİ — düğmeye giden kimlikler de eliyor
// ═══════════════════════════════════════════════════════════════════════════
//  ⚠ ÇAPA `<TopluKargo` — `importKaynak` kelimesi page.tsx'te başka yerde de
//  geçebilir; ölçüt bileşenin ÇAĞRISINA bağlı.

const dugme = blok(liste, "<TopluKargo", 700);
kontrol("② düğme çağrısı bulundu", dugme !== "");
kontrol(
  "② düğmeye giden kümede importKaynak === null şartı var",
  /importKaynak\s*===\s*null/.test(dugme),
  "ekran kümesi elemiyor — düğmede yazan sayı işlenecek sayıdan büyük olur",
);
kontrol(
  "② elenen sayı düğmeye AYRICA geçiyor (sessizce elenmiyor)",
  /iceAktarilanSayisi=\{/.test(dugme) && /importKaynak\s*!==\s*null/.test(dugme),
  "`iceAktarilanSayisi` verilmiyor — kullanıcı 5192 görüp düğmede 12 yazınca farkı soramaz",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ③ ONAY METNİ — tarihi SOMUT söyler ve riski yazar
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "③ diyalog açıklamaya TARİH parametresi geçiyor",
  /t\("topluKargoAciklama",\s*\{\s*sayi,\s*tarih:\s*bugun\s*\}\)/.test(diyalog),
  "`tarih` geçilmiyor — metin hangi tarihin yazılacağını söyleyemez",
);
kontrol(
  "③ tarih İSTANBUL gününden kuruluyor (tarayıcı saatinden DEĞİL)",
  /timeZone:\s*"Europe\/Istanbul"/.test(blok(diyalog, "const bugun", 400)),
  "çıplak yerel tarih — Almanya'da gece yarısından sonra sunucudan FARKLI gün yazar",
);
kontrol(
  "③ sözlük metni {tarih} taşıyor",
  sozluk.Satis.topluKargoAciklama.includes("{tarih}"),
);
kontrol(
  "③ sözlük metni RİSKİ yazıyor ('veri bozulur')",
  /veri bozulur/i.test(sozluk.Satis.topluKargoAciklama),
  "metin yalnız ne olacağını söylüyor, NİYE tehlikeli olduğunu söylemiyor",
);
kontrol(
  "③ elenen küme için ayrı metin var ve sebebini söylüyor",
  (sozluk.Satis.topluKargoIceAktarilan ?? "").includes("{sayi}") &&
    /bilmedi[ğg]i/i.test(sozluk.Satis.topluKargoIceAktarilan ?? ""),
);
kontrol(
  "③ o metin diyalogda ÇİZİLİYOR (koşuluyla birlikte)",
  /iceAktarilanSayisi\s*>\s*0\s*\?[\s\S]{0,400}t\("topluKargoIceAktarilan"/.test(diyalog),
  "anahtar dosyada var ama dalı çizilmiyor olabilir — koşul ve sonuç aynı desende aranıyor",
);

// ═══════════════════════════════════════════════════════════════════════════

if (dusen.length === 0) {
  console.log("  ✓  " + gecen + "/" + gecen + " ölçüt geçti\n");
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
